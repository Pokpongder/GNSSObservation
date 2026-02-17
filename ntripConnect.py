import socket
import base64
import math
import threading  
import time
from pyrtcm import RTCMReader

# --- การตั้งค่าหลัก ---
NTRIP_CAST = "161.246.18.204"
PORT = 2101
USER = "jirapoom"
PASSWORD = "cssrg"

# รายชื่อ Mountpoint ที่ต้องการเชื่อมต่อพร้อมกัน
MOUNTPOINTS_LIST = ["NKRM", "NKNY", "CHMA", "DPT9", "LPBR", "CHAN", "CNBR", "SISK", "NKSW", "SOKA",
                    "SRTN", "UDON", "SPBR", "UTTD", "PJRK"]

def ecef2lla(x, y, z):
    # (ฟังก์ชันเดิม ไม่ต้องแก้)
    a = 6378137.0
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = (a**2 - b**2) / (a**2)
    ep2 = (a**2 - b**2) / (b**2)
    p = math.sqrt(x**2 + y**2)
    th = math.atan2(a * z, b * p)
    lon = math.atan2(y, x)
    lat = math.atan2(z + ep2 * b * math.sin(th)**3, p - e2 * a * math.cos(th)**3)
    N = a / math.sqrt(1 - e2 * math.sin(lat)**2)
    alt = p / math.cos(lat) - N
    return math.degrees(lat), math.degrees(lon), alt

# 2. แก้ฟังก์ชันให้รับชื่อ mountpoint เข้ามา
def connect_ntrip_worker(mountpoint):
    print(f"[{mountpoint}] Starting connection thread...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # ตั้ง Timeout ไว้หน่อย เผื่อเน็ตหลุด Thread จะได้ไม่ค้าง
    sock.settimeout(10) 
    
    try:
        sock.connect((NTRIP_CAST, PORT))
    except Exception as e:
        print(f"[{mountpoint}] ❌ Connection Failed: {e}")
        return

    auth_str = f"{USER}:{PASSWORD}"
    auth_b64 = base64.b64encode(auth_str.encode()).decode()
    
    # ใส่ mountpoint ที่รับเข้ามาใน Header
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
            if not chunk: break
            response += chunk
            if b"\r\n\r\n" in response: break
            
        header_str = response.decode(errors='ignore')
        if "ICY 200 OK" not in header_str and "HTTP/1.0 200 OK" not in header_str:
            print(f"[{mountpoint}] ❌ Login Failed! Server said: {header_str.strip()}")
            sock.close()
            return

        print(f"[{mountpoint}] ✅ Connected! Reading Stream...")

        # อ่าน Stream
        ntrip_reader = RTCMReader(sock)
        
        for (raw_data, parsed_data) in ntrip_reader:
            if parsed_data:
                if parsed_data.identity in ["1005", "1006"]:
                    try:
                        x = parsed_data.DF025
                        y = parsed_data.DF026
                        z = parsed_data.DF027
                        lat, lon, alt = ecef2lla(x, y, z)
                        
                        # 3. ปริ้นท์โดยมีชื่อสถานีนำหน้า
                        print(f"[{mountpoint}] 📍 POS Found: Lat={lat:.6f}, Lon={lon:.6f}")
                        
                        # TODO: ส่งเข้า FastAPI WebSocket ตรงนี้ (ต้องระวังเรื่อง Thread Safe)
                        
                    except AttributeError:
                        pass
                        
    except socket.timeout:
        print(f"[{mountpoint}] ⚠️ Timeout (No data received)")
    except Exception as e:
        print(f"[{mountpoint}] ⚠️ Error: {e}")
    finally:
        sock.close()
        print(f"[{mountpoint}] 🛑 Disconnected")

# --- ส่วน Main Execution ---
if __name__ == "__main__":
    threads = []
    
    # 4. วนลูปสร้าง Thread สำหรับแต่ละ Mountpoint
    for mp in MOUNTPOINTS_LIST:
        # สร้าง Thread ใหม่ โดยส่ง mp เข้าไปเป็น argument
        t = threading.Thread(target=connect_ntrip_worker, args=(mp,))
        t.daemon = True # ตั้งเป็น Daemon (ถ้าปิดโปรแกรมหลัก Thread นี้จะปิดด้วย)
        t.start()
        threads.append(t)
        time.sleep(0.5) # เว้นระยะนิดนึงไม่ให้ยิง Server ถี่เกินไปตอนเริ่ม

    # 5. ให้โปรแกรมหลักทำงานรอไปเรื่อยๆ (ไม่งั้นโปรแกรมจะจบ และ Thread จะดับ)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping all threads...")