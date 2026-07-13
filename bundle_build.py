import os
import shutil
import subprocess

def run_cmd(cmd, cwd):
    print(f"Running command: {cmd} in {cwd}")
    # run in powershell or cmd
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        raise Exception(f"Command failed: {cmd}")

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    admin_dir = os.path.join(root_dir, "frontend-admin")
    customer_dir = os.path.join(root_dir, "frontend-customer")
    
    # 1. Build Admin
    print("--- Building Admin Frontend ---")
    run_cmd("npm run build", admin_dir)
    
    # 2. Build Customer
    print("--- Building Customer Frontend ---")
    run_cmd("npm run build", customer_dir)
    
    # 3. Create target directories in backend
    static_dir = os.path.join(backend_dir, "static")
    admin_dest = os.path.join(static_dir, "admin")
    customer_dest = os.path.join(static_dir, "customer")
    
    # Clear existing
    if os.path.exists(static_dir):
        shutil.rmtree(static_dir)
    os.makedirs(admin_dest, exist_ok=True)
    os.makedirs(customer_dest, exist_ok=True)
    
    # 4. Copy admin build assets
    print("--- Copying Admin assets ---")
    shutil.copytree(os.path.join(admin_dir, "dist"), admin_dest, dirs_exist_ok=True)
    
    # 5. Copy customer build assets
    print("--- Copying Customer assets ---")
    shutil.copytree(os.path.join(customer_dir, "dist"), customer_dest, dirs_exist_ok=True)
    
    print("--- DONE! All frontend assets compiled and copied to backend/static ---")

if __name__ == "__main__":
    main()
