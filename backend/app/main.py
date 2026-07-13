import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models import User, RestaurantSettings, Category, MenuItem, Table
from app.auth import hash_password

from app.api.auth import router as auth_router
from app.api.menu import router as menu_router
from app.api.tables import router as tables_router
from app.api.orders import router as orders_router
from app.api.billing import router as billing_router
from app.api.dashboard import router as dashboard_router
from app.api.websocket_routes import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Restaurant POS API",
    description="Complete Restaurant Point-of-Sale System",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — allow admin and customer frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Admin
        "http://localhost:5174",   # Customer
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "*",  # Remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register all routers
app.include_router(auth_router, prefix="/api")
app.include_router(menu_router, prefix="/api")
app.include_router(tables_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(ws_router)  # WebSocket without /api prefix


def seed_database():
    """Seed initial data on first run."""
    db = SessionLocal()
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)

        # Auto-migration: check if system_base_url exists in restaurant_settings table
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if inspector.has_table("restaurant_settings"):
            columns = [c["name"] for c in inspector.get_columns("restaurant_settings")]
            if "system_base_url" not in columns:
                logger.info("Migrating database: adding system_base_url to restaurant_settings table")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE restaurant_settings ADD COLUMN system_base_url VARCHAR(500)"))
                    conn.commit()

        # Seed admin user
        if not db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
            admin = User(
                name="Admin",
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
            )
            db.add(admin)
            logger.info(f"Created admin user: {settings.ADMIN_EMAIL}")

        # Seed restaurant settings
        if not db.query(RestaurantSettings).first():
            rs = RestaurantSettings(
                name=settings.APP_NAME,
                currency_symbol="₹",
                gst_percentage=5.0,
                receipt_footer="Thank you! Visit Again!",
            )
            db.add(rs)

        # Seed sample categories
        if not db.query(Category).first():
            cats = [
                Category(name="Starters", display_order=1, is_active=True),
                Category(name="Main Course", display_order=2, is_active=True),
                Category(name="Breads", display_order=3, is_active=True),
                Category(name="Beverages", display_order=4, is_active=True),
                Category(name="Desserts", display_order=5, is_active=True),
            ]
            for cat in cats:
                db.add(cat)
            db.flush()

            # Seed sample menu items
            items = [
                MenuItem(name="Paneer Tikka", description="Grilled cottage cheese with spices", price=249, category_id=cats[0].id, is_veg=True, is_available=True),
                MenuItem(name="Chicken 65", description="Spicy deep fried chicken", price=299, category_id=cats[0].id, is_veg=False, is_available=True),
                MenuItem(name="Veg Spring Roll", description="Crispy rolls with vegetables", price=199, category_id=cats[0].id, is_veg=True, is_available=True),
                MenuItem(name="Butter Chicken", description="Creamy tomato chicken curry", price=349, category_id=cats[1].id, is_veg=False, is_available=True),
                MenuItem(name="Paneer Butter Masala", description="Rich paneer in butter gravy", price=299, category_id=cats[1].id, is_veg=True, is_available=True),
                MenuItem(name="Dal Makhani", description="Slow-cooked black lentils", price=249, category_id=cats[1].id, is_veg=True, is_available=True),
                MenuItem(name="Garlic Naan", description="Soft bread with garlic butter", price=60, category_id=cats[2].id, is_veg=True, is_available=True),
                MenuItem(name="Butter Roti", description="Whole wheat roti with butter", price=35, category_id=cats[2].id, is_veg=True, is_available=True),
                MenuItem(name="Lassi", description="Sweet yogurt drink", price=89, category_id=cats[3].id, is_veg=True, is_available=True),
                MenuItem(name="Masala Chai", description="Spiced Indian tea", price=49, category_id=cats[3].id, is_veg=True, is_available=True),
                MenuItem(name="Cold Coffee", description="Chilled coffee with cream", price=129, category_id=cats[3].id, is_veg=True, is_available=True),
                MenuItem(name="Gulab Jamun", description="Soft milk dumplings in syrup", price=99, category_id=cats[4].id, is_veg=True, is_available=True),
                MenuItem(name="Ice Cream (2 Scoops)", description="Vanilla/Chocolate/Strawberry", price=129, category_id=cats[4].id, is_veg=True, is_available=True),
            ]
            for item in items:
                db.add(item)

        # Seed sample tables
        if not db.query(Table).first():
            import uuid
            for i in range(1, 9):
                token = str(uuid.uuid4()).replace("-", "")[:16]
                table = Table(number=i, name=f"Table {i}", capacity=4, qr_token=token)
                db.add(table)

        db.commit()
        logger.info("Database seeded successfully")
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


def start_tunnel():
    import os
    import sys
    import time
    import subprocess
    import sqlite3
    import logging

    logger = logging.getLogger(__name__)

    # Wait 3 seconds to let uvicorn bind port 8000 successfully
    time.sleep(3.0)

    # Determine execution root directory
    if hasattr(sys, '_MEIPASS'):
        db_dir = os.path.dirname(sys.executable)
        cloudflared_path = os.path.join(sys._MEIPASS, "cloudflared.exe")
    else:
        cwd = os.getcwd()
        if os.path.basename(cwd) == "backend":
            db_dir = os.path.dirname(cwd)
            cloudflared_path = os.path.join(cwd, "cloudflared.exe")
        else:
            db_dir = cwd
            cloudflared_path = os.path.join(cwd, "backend", "cloudflared.exe")

    db_path = os.path.join(db_dir, "restaurant_pos.db")

    if os.path.exists(cloudflared_path):
        cmd = f'"{cloudflared_path}" tunnel --url http://localhost:8000'
        logger.info(f"Starting background auto-tunnel using bundled cloudflared: {cmd}")
    else:
        cmd = "npx -y cloudflared tunnel --url http://localhost:8000"
        logger.info("Bundled cloudflared not found. Falling back to npx -y cloudflared...")

    try:
        proc = subprocess.Popen(
            cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        url = None
        for line in iter(proc.stdout.readline, ''):
            clean_line = line.strip()
            if not clean_line:
                continue
            logger.info(f"[Tunnel] {clean_line}")
            if "trycloudflare.com" in clean_line:
                parts = clean_line.split()
                for p in parts:
                    if "trycloudflare.com" in p:
                        url = p.strip()
                        # Clean up formatting characters (like pipes) if present
                        url = url.replace("|", "").strip()
                        if not url.startswith("http"):
                            url = "https://" + url
                        break
                if url:
                    logger.info(f"PUBLIC INTERNET ACCESS IS ACTIVE: {url}")
                    # Update SQLite settings automatically
                    try:
                        conn = sqlite3.connect(db_path)
                        cursor = conn.cursor()
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='restaurant_settings'")
                        if cursor.fetchone():
                            cursor.execute("UPDATE restaurant_settings SET system_base_url = ?", (url,))
                            conn.commit()
                            logger.info("Successfully auto-saved system_base_url to DB settings!")
                        conn.close()
                    except Exception as e:
                        logger.error(f"Could not save tunnel URL to DB: {e}")
    except Exception as e:
        logger.error(f"Failed to start Cloudflare Tunnel: {e}. Please ensure cloudflared or Node.js is installed.")


@app.on_event("startup")
async def startup():
    logger.info("Starting Restaurant POS API...")
    seed_database()
    logger.info(f"API ready at http://{settings.APP_HOST}:{settings.APP_PORT}")
    logger.info(f"Docs at http://localhost:{settings.APP_PORT}/api/docs")

    # Start persistent internet tunnel in the background
    import threading
    threading.Thread(target=start_tunnel, daemon=True).start()


# Static files for frontends (respect PyInstaller bundle temp path _MEIPASS)
if hasattr(sys, '_MEIPASS'):
    STATIC_DIR = os.path.join(sys._MEIPASS, "static")
else:
    STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")

ADMIN_DIR = os.path.join(STATIC_DIR, "admin")
CUSTOMER_DIR = os.path.join(STATIC_DIR, "customer")

# Mount admin assets static folder
if os.path.exists(ADMIN_DIR):
    admin_assets_path = os.path.join(ADMIN_DIR, "assets")
    if os.path.exists(admin_assets_path):
        app.mount("/admin/assets", StaticFiles(directory=admin_assets_path), name="admin_assets")

# Mount customer assets static folder
if os.path.exists(CUSTOMER_DIR):
    customer_assets_path = os.path.join(CUSTOMER_DIR, "assets")
    if os.path.exists(customer_assets_path):
        app.mount("/assets", StaticFiles(directory=customer_assets_path), name="customer_assets")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/admin")
@app.get("/admin/{path:path}")
def serve_admin_spa(path: str = ""):
    index_path = os.path.join(ADMIN_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Admin frontend not found"}


@app.get("/{filename}")
def serve_customer_root_files(filename: str):
    file_path = os.path.join(CUSTOMER_DIR, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # If not a file, check for index.html as fallback
    index_path = os.path.join(CUSTOMER_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Not found"}


@app.get("/")
def serve_root():
    """Redirect root to admin panel so the EXE opens the admin dashboard."""
    return RedirectResponse(url="/admin")


