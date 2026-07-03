# gate-pass-system
# 🛡️ PGP — Permanent Gate Pass System

A digital gate pass management system for Student Affairs, enabling student enrollment, QR-based exit verification, and automated parent email notifications.

Built for **SISC**

---

## 📸 Features

### 🎓 Student Enrollment (Admin Panel)
- Register students with full details (name, ID, section, school year, guardian info)
- Upload student photos for digital ID cards
- Configurable dismissal arrangements (Fetched, Independent, School Bus)
- Real-time enrollment statistics dashboard

### 📱 QR-Based Gate Scanner
- **Live camera scanning** — Point at a student's QR code for instant verification
- **Image upload fallback** — Upload a screenshot of the QR code if camera fails
- **Manual ID lookup** — Type a Student ID for text-based verification
- Multi-gate support (Main Gate, Side Gate A/B, Back Gate)
- 4-second scan cooldown to prevent duplicate logs

### 🪪 Digital ID Card
- Holographic-style ID card with 3D tilt interaction
- Auto-generated QR code per student (contains PGP pass ID)
- Displays student photo, name, section, guardian, and dismissal arrangement
- Downloadable for students to present at the gate

### 📋 Exit Logging & Notifications
- Every verified gate exit is timestamped and recorded
- Logs include: student name, ID, section, gate used, and time
- **Automated email notifications** sent to parents/guardians via EmailJS
- Searchable and clearable log history

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Structure** | HTML5 (Single Page Application) |
| **Styling** | Vanilla CSS — Dark theme, glassmorphism, ambient orb animations |
| **Logic** | Vanilla JavaScript (ES Modules, MVC Architecture) |
| **QR Generation** | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| **QR Scanning** | [jsQR](https://github.com/cozmo/jsQR) |
| **Email** | [EmailJS](https://www.emailjs.com/) |
| **Fonts** | [Sora](https://fonts.google.com/specimen/Sora) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| **Storage** | Browser localStorage |

---

## 🚀 Getting Started

### Prerequisites
- [XAMPP](https://www.apachefriends.org/) (or any local web server)
- A modern web browser (Chrome, Edge, or Firefox)

### Installation

1. **Clone the repository** into your XAMPP `htdocs` directory:
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/YOUR_USERNAME/gate-pass-system.git PGP/gate-pass-system
