# 🍽️ Restaurant POS — Complete Setup & User Guide

> **For restaurant owners and staff.** No technical knowledge required.

---

## 📦 What You Get

| Component | What It Does |
|---|---|
| **Admin Panel** | For the owner/staff — manage orders, billing, menu, tables |
| **Customer Menu** | For customers at tables — scan QR → browse menu → place order |
| **Backend (API)** | The engine that runs everything (runs silently in background) |

---

## ✅ Step 1 — What You Need Before Setup

Install these two free programs on the **restaurant's main computer**:

### 1. Python 3.10+
- Go to: **https://www.python.org/downloads/**
- Click the big yellow "Download Python" button
- Run the installer
- ⚠️ **IMPORTANT:** Check "Add Python to PATH" before clicking Install

### 2. Node.js (LTS Version)
- Go to: **https://nodejs.org/en/download**
- Click **"LTS"** (the left button)
- Run installer → click Next → Next → Install

---

## 🚀 Step 2 — First Time Setup (Run Once Only)

1. Open the **Billing** folder
2. Double-click **`SETUP.bat`**
3. Wait 2–5 minutes while everything installs
4. You'll see "SETUP COMPLETE!" when done

> ✅ You only do this **once**. After setup, just use `START.bat` daily.

---

## ▶️ Step 3 — Starting the System Every Day

1. Double-click **`START.bat`**
2. The Admin Panel opens automatically in your browser
3. Done!

---

## ⏹️ Stopping the System

- Double-click **`STOP.bat`**
- Or just restart your computer

---

## 🔐 Login Details

| | |
|---|---|
| **Email** | admin@restaurant.com |
| **Password** | admin123 |

> Change your password in **Settings** after first login!

---

## 🖥️ Accessing from Other Devices (Tablets, Phones)

Find your computer's IP:
1. Press `Windows + R` → type `cmd` → press Enter
2. Type `ipconfig` → look for "IPv4 Address" (e.g., 192.168.1.5)

Then on any device on the same WiFi:
- **Admin Panel:** `http://192.168.1.5:5173`
- **Customer Menu:** `http://192.168.1.5:5174`

---

## 📱 How Customers Order

1. Scan the QR code on the table (from Admin → Tables & QR → Print QR)
2. Browse menu on their phone (no app needed!)
3. Add items and place order
4. Staff sees it instantly in Admin → Live Orders

---

## 📊 Daily Workflow

```
Customer scans QR → Places order → Staff sees in "Live Orders"
→ Kitchen prepares → Status updated → Customer notified
→ Staff goes to "Billing Counter" → Generate bill → Mark as Paid
→ Record saved in "Sales Records" forever
```

---

## 🔧 Common Issues

| Problem | Solution |
|---|---|
| Page doesn't load | Wait 15 sec after START.bat, then refresh |
| QR doesn't work on phone | Use network IP (192.168.x.x), not "localhost" |
| Port already in use | Run STOP.bat, then START.bat |
| Forgot password | Run SETUP.bat again (resets to defaults) |

---

## ⚠️ IMPORTANT — Backup Your Data

Your sales data is stored in:
```
backend\restaurant_pos.db
```
**Copy this file regularly** to a USB drive or Google Drive to back up your sales records.

---

*For technical support, contact the developer.*
