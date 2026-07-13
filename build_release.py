import os
import sys
import shutil
import subprocess
import dis

# Monkey-patch dis._get_const_info to fix Python 3.10 bytecode index out of range bug in PyInstaller modulegraph
_original_get_const_info = dis._get_const_info
def _patched_get_const_info(const_index, const_list):
    try:
        if const_list is not None and const_index < len(const_list):
            return _original_get_const_info(const_index, const_list)
        return None, 'None'
    except Exception:
        return None, 'None'
dis._get_const_info = _patched_get_const_info

def run_cmd(cmd, cwd):
    print(f"Running command: {cmd} in {cwd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        raise Exception(f"Command failed: {cmd}")

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    
    # 1. Compile frontends and copy to backend/static (run bundle_build.py)
    print("\n[Step 1] Compiling and copying frontends...")
    bundle_script = os.path.join(root_dir, "bundle_build.py")
    run_cmd(f"python \"{bundle_script}\"", root_dir)
    
    # 2. Run PyInstaller to compile Python backend + static frontends into a single EXE
    print("\n[Step 2] Packaging everything into a single executable (in-process)...")
    
    # Change cwd to backend directory so PyInstaller runs in the backend context
    old_cwd = os.getcwd()
    try:
        os.chdir(backend_dir)
        
        # Run PyInstaller programmatically inside this process (with dis.py patched)
        import PyInstaller.__main__
        
        args = [
            '--clean',
            '--onefile',
            '--add-data', 'static;static',
            '--add-data', 'cloudflared.exe;.',
            '--exclude-module', 'rich',
            '--hidden-import', 'uvicorn.logging',
            '--hidden-import', 'uvicorn.loops',
            '--hidden-import', 'uvicorn.loops.auto',
            '--hidden-import', 'uvicorn.protocols',
            '--hidden-import', 'uvicorn.protocols.http',
            '--hidden-import', 'uvicorn.protocols.http.auto',
            '--hidden-import', 'uvicorn.protocols.websockets',
            '--hidden-import', 'uvicorn.protocols.websockets.auto',
            '--hidden-import', 'uvicorn.lifespan',
            '--hidden-import', 'uvicorn.lifespan.on',
            '--hidden-import', 'passlib.handlers.bcrypt',
            '--hidden-import', 'sqlalchemy.sql.default_comparator',
            '-n', 'RestaurantPOS',
            'run.py'
        ]
        
        print(f"Running PyInstaller programmatically with args: {args}")
        PyInstaller.__main__.run(args)
        
    finally:
        os.chdir(old_cwd)
    
    # 3. Create Release folder
    print("\n[Step 3] Creating release package...")
    release_dir = os.path.join(root_dir, "RestaurantPOS-Release")
    
    # Clear existing release
    if os.path.exists(release_dir):
        shutil.rmtree(release_dir)
    os.makedirs(release_dir)
    os.makedirs(os.path.join(release_dir, "uploads"), exist_ok=True)
    
    # Copy Compiled EXE
    exe_src = os.path.join(backend_dir, "dist", "RestaurantPOS.exe")
    exe_dest = os.path.join(release_dir, "RestaurantPOS.exe")
    
    print(f"Copying {exe_src} to {exe_dest}...")
    shutil.copy2(exe_src, exe_dest)
    
    # 4. Create README.txt instructions for restaurant owner
    readme_content = """============================================================
              RESTAURANT POINT-OF-SALE (POS) SYSTEM
============================================================

Thank you for choosing our Restaurant POS! This system is a fully 
self-hosted local solution that runs entirely on your PC.

------------------------------------------------------------
📋 PREREQUISITES
------------------------------------------------------------
There are NO prerequisites! You do not need to install Python, 
Node.js, or any other software. Everything is included in the application.

------------------------------------------------------------
▶️ HOW TO RUN
------------------------------------------------------------
1. Simply double-click "RestaurantPOS.exe".
2. A window will open, and your default web browser will automatically 
   open the Admin Dashboard: http://localhost:8000/admin
3. Keep the black window open while using the software. To shut down, 
   simply close the black window.

------------------------------------------------------------
📱 CUSTOMER & TABLE ACCESS (Local Network)
------------------------------------------------------------
- Connect all customer mobile devices or tablet screens to the 
  SAME Wi-Fi router network as this PC.
- In the black window, you will see a "Customer App" network IP address 
  (e.g., http://192.168.1.15:8000).
- Open that IP address on any phone or tablet to place orders!
- QR codes generated in the tables section will automatically link to 
  this correct IP.

------------------------------------------------------------
🌐 ACCESS FROM ANY INTERNET CONNECTION (Mobile Data)
------------------------------------------------------------
This system automatically exposes itself to the internet on startup!
When you launch "RestaurantPOS.exe", a secure public link is automatically
created in the background (using Node's built-in tunneling).
- Table QR codes generated in the Admin Panel will automatically link 
  to this public domain.
- Customers can scan the QR codes and place orders from ANY internet
  connection (mobile data, other Wi-Fi, etc.) immediately!
- The public link is saved to a configuration file named "tunnel_config.txt"
  on the first run, so it stays the same on future launches.
- Note: Keep the black "RestaurantPOS.exe" window open while using the software.

------------------------------------------------------------
🗄️ BACKUP YOUR DATA
------------------------------------------------------------
- The database is stored in a file named "restaurant_pos.db" which 
  will automatically appear in this folder after the first run.
- To backup your menu, sales records, and bills, simply copy 
  "restaurant_pos.db" to a safe place (like a USB drive) every day.
- Uploaded menu pictures are stored in the "uploads" folder.

------------------------------------------------------------
🔐 DEFAULT LOGIN
------------------------------------------------------------
- Email: admin@restaurant.com
- Password: admin123
- Important: Change this password under "Settings" once logged in!
============================================================
"""
    
    readme_path = os.path.join(release_dir, "README.txt")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
        
    print(f"\n==================================================")
    print(f" SUCCESS! Standalone Release Package Created!")
    print(f"Folder: {release_dir}")
    print(f"==================================================")
    print(f"You can now ZIP the 'RestaurantPOS-Release' folder")
    print(f"and send it to the restaurant owner. They will only")
    print(f"see 'RestaurantPOS.exe', 'uploads' folder and 'README.txt'.")
    print(f"Your source code and files are completely safe!")
    print(f"==================================================")

if __name__ == "__main__":
    main()
