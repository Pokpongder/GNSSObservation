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
NTRIP_USER = "pokpong"
NTRIP_PASSWORD = "pokpong2546"
NTRIP_TIMEOUT = 5  # วินาที

ALL_MOUNTPOINTS = ["CHMA", "CADT", "KMI6", "STFD", "RUTI", "CPN1", "NUO2", "ITC0", "HUEV", "KKU0"]


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

# Local cache directory
LOCAL_CACHE_DIR = Path("ionospherebystation")
BASE_PATH = r"Z:/" 
# BASE_PATH = r"\\192.168.1.254\ftp_access_only\GNSS\pic_stations"

# Station list to check (can be dynamic, but hardcoded based on script.js for now or just scan directories)
# To be safe, let's scan directories in Z:/ that match known patterns or just iterate what we find.
# For simplicity and robustness, let's just sync when requested or periodically scan.
# Given the user wants "download images from NAS to folder... load from there",
# we should probably scan all subfolders in BASE_PATH.

async def sync_images_from_nas():
    while True:
        try:
            print(f"[{datetime.now()}] Starting NAS sync...")
            if not os.path.exists(BASE_PATH):
                 print(f"Warning: NAS path {BASE_PATH} not reachable.")
            else:
                # Ensure local cache dir exists
                LOCAL_CACHE_DIR.mkdir(exist_ok=True)
                
                # Get current year
                current_year = str(datetime.now().year)
                today_str = datetime.now().strftime("%Y-%m-%d")

                # Iterate over station folders in NAS
                # We assume folders in BASE_PATH are station names
                for station_path in Path(BASE_PATH).iterdir():
                    if station_path.is_dir():
                        station_name = station_path.name
                        
                        # Check for year folder
                        year_path = station_path / current_year
                        if year_path.exists():
                            # Find all jpgs
                            try:
                                # files = list(year_path.glob("*.jpg"))
                                patterns = ["*.jpg", "*.JPG", "*.jpeg", "*.JPEG"]
                                files = []
                                for p in patterns:
                                    files.extend(year_path.glob(p))
                                
                                if files:
                                    latest_file = max(files, key=os.path.getmtime)
                                    latest_file_date = datetime.fromtimestamp(latest_file.stat().st_mtime).strftime("%Y-%m-%d")
                                    
                                    # Local destination
                                    local_station_dir = LOCAL_CACHE_DIR / station_name
                                    local_station_dir.mkdir(parents=True, exist_ok=True)
                                    
                                    # Clean up old files or non-latest files
                                    # We only want 'latest.jpg'
                                    target_file = local_station_dir / "latest.jpg"
                                    
                                    # Logic: Sync latest file regardless of date (Orange status if old)
                                    target_file = local_station_dir / "latest.jpg"
                                    
                                    should_copy = True
                                    
                                    if target_file.exists():
                                        if target_file.stat().st_mtime >= latest_file.stat().st_mtime:
                                            should_copy = False
                                    
                                    if should_copy:
                                        print(f"[{station_name}] Updating latest.jpg from {latest_file.name} (Date: {latest_file_date})")
                                        shutil.copy2(latest_file, target_file)
                                    else:
                                        # Just log for debug
                                        pass

                            except Exception as e:
                                print(f"Error checking station {station_name}: {e}")
                                
            print(f"[{datetime.now()}] Sync finished. Sleeping...")
            
        except Exception as e:
            print(f"Global Sync Error: {e}")
            
        await asyncio.sleep(60) # Run every XX seconds

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    asyncio.create_task(sync_images_from_nas())
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

# Mount local cache as static files (optional, but good for direct access via port 8000)
app.mount("/ionospherebystation", StaticFiles(directory=LOCAL_CACHE_DIR), name="ionosphere")


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
