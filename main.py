import os
import shutil
import asyncio
import socket
import base64
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pyrtcm import RTCMReader
import json
import time
import threading


#NTRIP Caster Config 
NTRIP_CAST = "161.246.18.204"
NTRIP_PORT = 2101
NTRIP_USER = "jirapoom"
NTRIP_PASSWORD = "cssrg"
NTRIP_TIMEOUT = 5 

ALL_MOUNTPOINTS = ["CHMA", "CADT", "KMIT6", "STFD", "RUT1", "CPN1", "NUO2", "ITC0", "HUEV", "KKU0","NKRM", "NKNY", "CHMA", "DPT9", "LPBR", "CHAN", "CNBR", "SISK", "NKSW", "SOKA",
                    "SRTN", "UDON", "SPBR", "UTTD", "PJRK","CM01"]

def check_ntrip_mountpoint(mountpoint: str) -> str:
    """
    ลองเชื่อมต่อ ntripcaster และรับ RTCM data
    Return "green" ถ้าเชื่อมต่อสำเร็จและมี data, "red" ถ้าไม่ได้
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(NTRIP_TIMEOUT)

    try:
        sock.connect((NTRIP_CAST, NTRIP_PORT))
    except Exception as e:
        print(f"[{mountpoint}] ❌ Connection Failed: {e}")
        return "red"

    auth_str = f"{NTRIP_USER}:{NTRIP_PASSWORD}"
    auth_b64 = base64.b64encode(auth_str.encode()).decode()

    headers = (
        f"GET /{mountpoint} HTTP/1.0\r\n"
        f"User-Agent: NTRIP Python Client\r\n"
        f"Authorization: Basic {auth_b64}\r\n"
        f"Accept: */*\r\n"
        f"Connection: close\r\n"
        "\r\n"
    )

    try:
        sock.sendall(headers.encode())

        # อ่าน Header Response
        response = b""
        while True:
            chunk = sock.recv(1)
            if not chunk:
                break
            response += chunk
            if b"\r\n\r\n" in response:
                break

        header_str = response.decode(errors='ignore')

        if "ICY 200 OK" not in header_str and "HTTP/1.0 200 OK" not in header_str:
            print(f"[{mountpoint}] ❌ Auth/Mount Failed: {header_str.strip()}")
            return "red"

        # ลองอ่าน data สักนิดเพื่อยืนยันว่ามี stream จริง
        data = sock.recv(1024)
        if data and len(data) > 0:
            print(f"[{mountpoint}] ✅ RTCM data received ({len(data)} bytes)")
            return "green"
        else:
            print(f"[{mountpoint}] ⚠️ Connected but no data")
            return "red"

    except socket.timeout:
        print(f"[{mountpoint}] ⚠️ Timeout waiting for data")
        return "red"
    except Exception as e:
        print(f"[{mountpoint}] ⚠️ Error: {e}")
        return "red"
    finally:
        sock.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown (nothing specific needed)

app = FastAPI(docs_url="/docs", redoc_url="/redoc", lifespan=lifespan)

origins = ["*"] # Allow all origins for local network access

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Last-Modified"],
)

# --- NTRIP Status Endpoints ---
@app.get("/ntrip-status/{mountpoint}")
async def get_ntrip_status(mountpoint: str):
    """เช็คสถานะการเชื่อมต่อ RTCM ของสถานีเดียว"""
    loop = asyncio.get_event_loop()
    status = await loop.run_in_executor(None, check_ntrip_mountpoint, mountpoint)
    return JSONResponse({"mountpoint": mountpoint, "status": status})


@app.get("/ntrip-status-all")
async def get_all_ntrip_status():
    """เช็คสถานะการเชื่อมต่อ RTCM ของทุกสถานีพร้อมกัน"""
    loop = asyncio.get_event_loop()
    statuses = {mp: status for mp, status in zip(ALL_MOUNTPOINTS, results)}
    return JSONResponse(statuses)


# --- WebSocket for Satellite Monitoring ---
@app.websocket("/ws/sat-data/{mountpoint}")
async def websocket_endpoint(websocket: WebSocket, mountpoint: str):
    await websocket.accept()
    print(f"[WS] Client connected to monitor {mountpoint}")

    # Shared State
    stats = {
        "GPS": 0, "GLONASS": 0, "Galileo": 0, "BeiDou": 0,
        "connected": False,
        "error": None
    }
    stop_event = threading.Event()

    def read_ntrip_stream():
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((NTRIP_CAST, NTRIP_PORT))
            
            # Login
            auth_str = f"{NTRIP_USER}:{NTRIP_PASSWORD}"
            auth_b64 = base64.b64encode(auth_str.encode()).decode()
            headers = (
                f"GET /{mountpoint} HTTP/1.0\r\n"
                f"User-Agent: NTRIP Python Monitor\r\n"
                f"Authorization: Basic {auth_b64}\r\n"
                f"Accept: */*\r\n"
                f"Connection: close\r\n"
                "\r\n"
            )
            sock.sendall(headers.encode())

            # Read Header
            response = b""
            while not stop_event.is_set():
                chunk = sock.recv(1)
                if not chunk: break
                response += chunk
                if b"\r\n\r\n" in response: break
            
            header_str = response.decode(errors='ignore')
            if "200 OK" not in header_str:
                stats["error"] = f"Connection failed: {header_str.strip()}"
                return

            stats["connected"] = True
            print(f"[Thread] {mountpoint} Connected!")

            # Read RTCM
            ntrip_reader = RTCMReader(sock)
            
            for (raw_data, parsed_data) in ntrip_reader:
                if stop_event.is_set(): break
                
                if parsed_data:
                    msg_id = parsed_data.identity
                    if msg_id == "1077": stats["GPS"] = bin(parsed_data.DF394).count('1')
                    elif msg_id == "1087": stats["GLONASS"] = bin(parsed_data.DF394).count('1')
                    elif msg_id == "1097": stats["Galileo"] = bin(parsed_data.DF394).count('1')
                    elif msg_id == "1127": stats["BeiDou"] = bin(parsed_data.DF394).count('1')

        except Exception as e:
            print(f"[Thread] Error: {e}")
            stats["error"] = str(e)
        finally:
            if sock: sock.close()
            print(f"[Thread] {mountpoint} Stopped.")

    # Start Background Thread
    thread = threading.Thread(target=read_ntrip_stream, daemon=True)
    thread.start()

    try:
        # Wait for connection
        for _ in range(10): # Wait up to 10s
            if stats["connected"] or stats["error"]: break
            await asyncio.sleep(1)
        
        if stats["error"]:
            await websocket.send_json({"error": stats["error"]})
            return
        
        if not stats["connected"]:
            await websocket.send_json({"error": "Timeout connecting to NTRIP Caster"})
            return

        await websocket.send_json({"status": "connected", "message": f"Monitoring {mountpoint}..."})

        # Main Loop: Send Data every 1 second
        while True:
            await asyncio.sleep(1) # Exact 1 second interval
            
            data = {
                "time": datetime.now().strftime("%H:%M:%S"),
                "sats": {k: v for k, v in stats.items() if k in ["GPS", "GLONASS", "Galileo", "BeiDou"]}
            }
            await websocket.send_json(data)

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected from {mountpoint}")
    except Exception as e:
        print(f"[WS] Error: {e}")
    finally:
        stop_event.set()
        thread.join(timeout=2)
