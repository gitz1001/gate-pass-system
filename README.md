# SISC Permanent Gate Pass (PGP) System 🛡️

A modern, responsive, and robust Single Page Application (SPA) designed to manage student gate passes for Southville International School and Colleges.

> **Note:** This is the Phase 5 (Final) version of the redesign, featuring a completely modernized UI, 9 functional modules, Temporary Gate Pass (TGP) support, and offline capabilities via PWA.

---

## 🌟 Key Features

### 1. Modern Architecture & Design
- **MVC Pattern:** Modular JavaScript structure (`Models`, `Views`, `Controllers`).
- **Hybrid Navigation:** Collapsible sidebar on desktop, thumb-friendly bottom nav on mobile.
- **Dual-Theme System:** SISC Purple & Teal design with Auto/Light/Dark mode toggle.
- **Premium Iconography:** 24 handcrafted inline SVG icons (zero emojis).

### 2. Core Modules
- **Dashboard:** Real-time statistics and a live exit activity feed.
- **Student Registry:** Table view of all students with an interactive 4-step Enrollment Wizard.
- **Gate Scanner (3 Modes):**
  - **USB Scanner:** Optimized for rapid, hands-free hardware scanning.
  - **Manual Entry:** Fallback for typing IDs.
  - **Camera:** Live webcam QR scanning via `jsQR`.
- **Exit Logs:** Immutable, searchable, and filterable table of all gate activity.

### 3. Advanced Administration
- **PGP Management:** Suspend, revoke, and reactivate permanent passes.
- **TGP (Temporary Passes):** Create and approve single-day passes for exceptions.
- **Reports:** Pure CSS data visualization (bar charts) for pass statuses and gate activity.
- **Settings:** Export complete database to JSON, clear database, and manage theme.
- **Virtual ID Export:** Generate and download a printable PNG of the student's ID card via `html2canvas`.

### 4. Production Ready (PWA)
- Fully installable on mobile devices (Android/iOS) and desktops via `manifest.json`.
- Offline support via Service Worker caching (`sw.js`).
- Printer-friendly CSS (`@media print`) for generating physical reports.

---

## 🛠️ Technology Stack
- **Frontend Core:** Vanilla HTML5, CSS3, ES6 JavaScript (No Frameworks)
- **Data Persistence:** Browser `localStorage` (Preserving `pgp_students` and `pgp_logs`)
- **Libraries:**
  - `qrcodejs`: Generates QR codes on virtual IDs.
  - `jsQR`: Decodes QR codes from the webcam feed.
  - `html2canvas`: Renders HTML ID cards into downloadable PNG images.
  - `EmailJS`: Triggered on valid exits for parent notifications.

---

## 🚀 How to Run

Because this application uses ES6 modules (`type="module"`), it **must be run over an HTTP server**. Opening `index.html` directly from the file system (via `file://`) will result in CORS errors.

### Option 1: Using XAMPP (Current Setup)
1. Place the `gate-pass-system` folder inside `C:\xampp\htdocs\PGP\`.
2. Start the Apache module in the XAMPP Control Panel.
3. Open your browser and navigate to: `http://localhost/PGP/gate-pass-system/`

### Option 2: Using VS Code Live Server
1. Open the `gate-pass-system` folder in VS Code.
2. Install the "Live Server" extension.
3. Right-click `index.html` and select "Open with Live Server".

---

## 📂 File Structure

```
gate-pass-system/
├── index.html                      # App shell + manifest link
├── manifest.json                   # PWA manifest
├── sw.js                           # Service worker for offline cache
├── css/
│   └── styles.css                  # Complete design system + Print styles
└── js/
    ├── main.js                     # Entry point
    ├── icons.js                    # SVG icon registry
    ├── models/
    │   └── AppModel.js             # Data layer + localStorage
    ├── views/
    │   ├── AppView.js              # Shell rendering + page routing
    │   ├── DashboardView.js        # Dashboard page
    │   ├── ScannerView.js          # Gate Scanner (3 tabs)
    │   ├── LogsView.js             # Exit Logs table
    │   ├── StudentsView.js         # Student registry + enrollment wizard
    │   ├── PGPView.js              # PGP pass management
    │   ├── ReportsView.js          # Reports & analytics
    │   ├── TGPView.js              # Temporary passes
    │   ├── UsersView.js            # User management
    │   └── SettingsView.js         # Settings & data export
    └── controllers/
        └── AppController.js        # Event handlers + business logic
```

---

## 🔒 Security Note
This is a frontend prototype. Currently, all data is saved locally on the device running the application. For production deployment across multiple gates and administration offices, the `AppModel.js` should be connected to a centralized backend database (like Supabase, Firebase, or a custom REST API).
