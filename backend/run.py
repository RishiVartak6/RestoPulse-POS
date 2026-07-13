import os
import sys
import uvicorn
import socket
import webbrowser
from threading import Timer

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def open_browser():
    webbrowser.open("http://localhost:8000/admin")

if __name__ == "__main__":
    # Ensure uploads folder exists
    os.makedirs("uploads", exist_ok=True)
    
    # Get local IP for network access
    local_ip = get_local_ip()
    
    print("\n==================================================")
    print("      RESTAURANT POINT-OF-SALE SYSTEM IS STARTING")
    print("==================================================")
    print(f" Admin Dashboard:  http://localhost:8000/admin")
    print(f" Customer App:      http://{local_ip}:8000")
    print("==================================================")
    print(" Keep this window open while using the software.\n")

    # Open browser automatically after 1.5 seconds
    Timer(1.5, open_browser).start()

    # Import the app inside the entry point block
    from app.main import app
    
    # Start the server on port 8000 (bind to 0.0.0.0 for local network access)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
