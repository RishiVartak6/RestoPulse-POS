# Restaurant POS System 🍽️

A complete Restaurant Point-of-Sale system with Admin Panel, Customer QR-based ordering, real-time Kitchen Display, and Billing Counter.

---

## 🚀 Quick Start

### Step 1: Start PostgreSQL
Make sure PostgreSQL is running and create a database:
```sql
CREATE DATABASE restaurant_pos;
```

Update `backend/.env` with your PostgreSQL credentials if needed.

### Step 2: Start the Backend
```bash
# Double-click OR run:
start-backend.bat
```
Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/api/docs**

### Step 3: Start Admin Panel
```bash
start-admin.bat
```
Admin Panel: **http://localhost:5173**  
Login: `admin@restaurant.com` / `admin123`

### Step 4: Start Customer App
```bash
start-customer.bat
```
Customer App: **http://localhost:5174**

---

## 📱 Customer Flow

1. Admin creates tables and generates QR codes (Tables page)
2. Customer scans QR → opens menu at `http://localhost:5174/menu?table=TOKEN`
3. Customer browses menu, filters by category/veg, adds items
4. Customer places order → Admin receives instantly (WebSocket)
5. Admin updates order status (Pending → Preparing → Ready → Served)
6. Customer sees live status updates
7. Admin generates bill in Billing Counter → Customer pays
8. Receipt printed / shown on screen

---

## 🏗️ Project Structure

```
restaurant-pos/
├── backend/                 # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   ├── auth/            # JWT authentication
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── websocket/       # Real-time manager
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env
├── frontend-admin/          # React + Vite + Tailwind
│   └── src/
│       ├── layouts/         # AdminLayout (sidebar)
│       ├── pages/           # Login, Dashboard, Menu, Categories, Tables, Orders, Billing, Settings
│       ├── services/        # api.js, websocket.js
│       └── store/           # Zustand auth store
├── frontend-customer/       # React PWA + Tailwind
│   └── src/
│       ├── pages/           # MenuPage, CartPage, OrderStatusPage, BillPage
│       ├── services/        # api.js
│       ├── hooks/           # useWebSocket.js
│       └── store/           # cart.js (persisted)
├── start-backend.bat
├── start-admin.bat
└── start-customer.bat
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Auth | JWT (python-jose), bcrypt |
| Real-time | WebSockets (native FastAPI) |
| Admin UI | React 18, Vite, Tailwind CSS |
| State | TanStack Query, Zustand |
| Charts | Recharts |
| Customer UI | React PWA, Tailwind CSS |
| QR Codes | qrcode (Python), qrcode.react |
| Printing | CSS `@media print` (browser print) |

---

## 📋 Admin Pages

| Page | URL | Description |
|---|---|---|
| Login | `/login` | JWT authentication |
| Dashboard | `/dashboard` | Live stats, charts, recent orders |
| Live Orders | `/orders` | KDS kanban board |
| Billing | `/billing` | Table billing counter |
| Menu | `/menu` | Menu item CRUD |
| Categories | `/categories` | Category CRUD |
| Tables | `/tables` | Table + QR management |
| Settings | `/settings` | Restaurant configuration |

---

## 🌟 Features

### Admin Panel
- ✅ JWT login with auto-refresh
- ✅ Live dashboard (revenue, orders, tables, top items chart)
- ✅ KDS kanban: Pending → Preparing → Ready → Served (click to advance)
- ✅ Real-time new order notifications (WebSocket + toast)
- ✅ Menu CRUD with image upload, veg badges, availability toggle
- ✅ Category management with display ordering
- ✅ Table grid with status colors (free/occupied/reserved)
- ✅ QR code generation, preview, download PNG, print
- ✅ Billing counter: search table → view/edit order → apply discount → generate bill → print receipt → mark paid
- ✅ Restaurant settings: name, GST, footer, WiFi

### Customer App (PWA)
- ✅ No login required — QR-based access
- ✅ Menu with category filter, search, veg toggle
- ✅ Inline +/- quantity controls per item
- ✅ Persistent cart (localStorage)
- ✅ Order placement
- ✅ Live order status tracking (WebSocket)
- ✅ Full itemized bill view
- ✅ PWA installable (mobile)

### Backend
- ✅ Auto-seeded: admin user, 5 categories, 13 menu items, 8 tables
- ✅ WebSocket broadcast: admins + customers
- ✅ Table occupancy management
- ✅ Bill generation with GST + discount
- ✅ Image upload for menu items + categories

---

## 🔧 Configuration

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/restaurant_pos
SECRET_KEY=your-secret-key
ADMIN_EMAIL=admin@restaurant.com
ADMIN_PASSWORD=admin123
CUSTOMER_APP_URL=http://localhost:5174
```

---

## 🖨️ Receipt Printing

Click **"Generate Bill & Print"** in the Billing Counter.  
A receipt preview pops up → click **"Print Receipt"** → browser print dialog opens.

For thermal printers (58mm/80mm), select your printer in the print dialog. The CSS is optimized for 80mm receipt paper.
