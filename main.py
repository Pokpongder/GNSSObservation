import os
import shutil
import asyncio
import socket
import base64
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- NTRIP Caster Config (เหมือน ntripConnect.py) ---
NTRIP_CAST = "161.246.18.204"
NTRIP_PORT = 2101
NTRIP_USER = "jirapoom"
NTRIP_PASSWORD = "cssrg"
NTRIP_TIMEOUT = 5 

ALL_MOUNTPOINTS = ["CHMA", "CADT", "KMI6", "STFD", "RUT1", "CPN1", "NUO2", "ITC0", "HUEV", "KKU0","NKRM", "NKNY", "CHMA", "DPT9", "LPBR", "CHAN", "CNBR", "SISK", "NKSW", "SOKA",
                    "SRTN", "UDON", "SPBR", "UTTD", "PJRK"]

DPT_MOUNTPOINTS = ["NKRM", "NKNY", "CHMA", "DPT9", "LPBR", "CHAN", "CNBR", "SISK", "NKSW", "SOKA",
                    "SRTN", "UDON", "SPBR", "UTTD", "PJRK"]



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

origins = ["http://localhost:8000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    ]
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
    tasks = [loop.run_in_executor(None, check_ntrip_mountpoint, mp) for mp in ALL_MOUNTPOINTS]
    results = await asyncio.gather(*tasks)
    statuses = {mp: status for mp, status in zip(ALL_MOUNTPOINTS, results)}
    return JSONResponse(statuses)


