import LoginController from './pages/LoginController.js';
import DashboardController from './pages/DashboardController.js';
import LogsController from './pages/LogsController.js';
import PGPController from './pages/PGPController.js';
import SettingsController from './pages/SettingsController.js';
import TGPController from './pages/TGPController.js';
import StudentsController from './pages/StudentsController.js';
import ScannerController from './pages/ScannerController.js';
import AppModel from '../models/AppModel.js';
import AppView, { ROLE_PERMISSIONS } from '../views/AppView.js';

export default class AppController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.init();
  }

  init() {
    // 1. Initialize Theme
    this.initTheme();

    // 2. Initialize Sidebar State (Desktop)
    this.initSidebar();

    // 3. Render Initial Navigation & Page
    this.view.renderSidebar(this.model);
    this.view.renderBottomNav(this.model);
    
    // Check hash for direct link, default to dashboard
    const hashPage = window.location.hash.replace('#', '');
    const startPage = hashPage || 'dashboard';
    this.navigateToPage(startPage);

    // 4. Bind Global Event Listeners
    this.bindEvents();

    // Watch for system theme changes if set to auto
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!this.model.getTheme()) { // Only auto-switch if no manual override
        this.view.applyTheme('auto');
      }
    });
  }

  // ── Navigation Wrapper ─────────────────────────────────
  navigateToPage(pageId) {
    // Authentication Guard
    if (!this.model.currentUser && pageId !== 'login') {
      pageId = 'login';
    } else if (this.model.currentUser && pageId === 'login') {
      pageId = 'dashboard';
    }

    // RBAC Guard
    if (this.model.currentUser && pageId !== 'login') {
      const perms = ROLE_PERMISSIONS[this.model.currentUser.role] || [];
      if (!perms.includes(pageId)) {
        this.view.showToast('Access denied for your role', 'error');
        pageId = 'dashboard';
      }
    }

    // Stop camera if leaving scanner
    if (this.view.currentPage === 'scanner' && pageId !== 'scanner') {
      this.stopCamera();
    }

    this.view.showPage(pageId, this.model);
    window.location.hash = pageId;
    this.view.closeMobileSidebar();
    
    // Bind events for the newly rendered page
    this.bindPageEvents(pageId);

    // Auto-start camera if navigating to scanner and camera is default
    if (pageId === 'scanner') {
      const cameraTab = document.querySelector('.scan-tab[data-target="camera"]');
      if (cameraTab && cameraTab.classList.contains('active')) {
         setTimeout(() => this.startCamera(), 300);
      }
    }
  }

  // ── Initialization ─────────────────────────────────────
  initTheme() {
    const savedTheme = this.model.getTheme();
    this.view.applyTheme(savedTheme || 'auto');
  }

  initSidebar() {
    const isCollapsed = this.model.getSidebarCollapsed();
    this.view.setSidebarCollapsed(isCollapsed);
  }

  // ── Event Binding ──────────────────────────────────────
  bindEvents() {
    // Theme Toggle
    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const isCurrentlyDark = this.view.isDarkMode();
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        this.model.setTheme(newTheme);
        this.view.applyTheme(newTheme);
      });
    }

    // Desktop Sidebar Toggle
    const btnCollapse = document.getElementById('btn-collapse-sidebar');
    if (btnCollapse) {
      btnCollapse.addEventListener('click', () => {
        const isCollapsed = !document.getElementById('sidebar').classList.contains('collapsed');
        this.model.setSidebarCollapsed(isCollapsed);
        this.view.setSidebarCollapsed(isCollapsed);
      });
    }

    // Mobile Sidebar Toggle
    const btnMenu = document.getElementById('btn-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (btnMenu) btnMenu.addEventListener('click', () => this.view.openMobileSidebar());
    if (overlay) overlay.addEventListener('click', () => this.view.closeMobileSidebar());

    // Navigation Delegation (Sidebar & Bottom Nav)
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item, .bottom-nav-item');
      if (navItem) {
        const pageId = navItem.dataset.page;
        if (pageId) {
          this.navigateToPage(pageId);
        }
      }

      // Logout handler
      if (e.target.closest('#btn-logout')) {
        this.performLogout();
      }
    });

    // ── Activity Tracking (resets idle timer) ──────────────
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    let activityThrottle = 0;
    activityEvents.forEach(evt => {
      document.addEventListener(evt, () => {
        const now = Date.now();
        // Throttle: only update every 30 seconds to avoid excessive writes
        if (now - activityThrottle > 30000) {
          activityThrottle = now;
          this.model.updateActivity();
        }
      }, { passive: true });
    });

    // ── Session Timeout Checker (every 60 seconds) ────────
    this.sessionCheckInterval = setInterval(() => {
      if (this.model.currentUser && this.model.isSessionExpired()) {
        this.performLogout('Session expired due to inactivity. Please log in again.');
      }
    }, 60000);

    // ── Back-Button Guard ─────────────────────────────────
    window.addEventListener('hashchange', () => {
      if (!this.model.currentUser) {
        // If not logged in, force login page regardless of hash
        if (window.location.hash !== '#login') {
          window.location.hash = '#login';
          this.view.showPage('login', this.model);
          this.bindPageEvents('login');
        }
      }
    });
  }

  // ── Logout Handler ──────────────────────────────────────
  performLogout(message) {
    this.model.logout();
    // Replace history so back button cannot reopen dashboard
    history.replaceState(null, '', '#login');
    this.view.showToast(message || 'Successfully logged out');
    this.view.showPage('login', this.model);
    this.bindPageEvents('login');
  }

  // ── Page Specific Event Binding ────────────────────────
  bindPageEvents(pageId) {
    if (pageId === 'dashboard') DashboardController.bind(this);
    if (pageId === 'students') StudentsController.bind(this);
    if (pageId === 'scanner') ScannerController.bind(this);
    if (pageId === 'logs') LogsController.bind(this);
    if (pageId === 'pgp') PGPController.bind(this);
    if (pageId === 'settings') SettingsController.bind(this);
    if (pageId === 'tgp') TGPController.bind(this);
    if (pageId === 'login') LoginController.bind(this);
  }

      });
    }

    // Export CSV
    const btnExport = document.getElementById('logs-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const logs = this.model.exitLogs || [];
        if (logs.length === 0) {
          this.view.showToast('No logs to export', 'error');
          return;
        }
        
        let csv = 'Date,Time,Student Name,Student ID,Gate,Result,Pass Type\n';
        logs.forEach(log => {
          const student = this.model.getStudentByPassId(log.studentId) || this.model.getStudentByStudId(log.studentId);
          const sName = student ? student.name : 'Unknown';
          const sId = student ? (student.studid || student.id) : log.studentId;
          const date = new Date(log.timestamp);
          const dateStr = date.toLocaleDateString('en-CA');
          const timeStr = date.toLocaleTimeString('en-GB');
          
          csv += `"${dateStr}","${timeStr}","${sName}","${sId}","${log.gate || 'Main Gate'}","${log.result}","${log.passType || 'PGP'}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PGP_ExitLogs_${new Date().toLocaleDateString('en-CA')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.view.showToast('Logs exported successfully');
      });
    }

    // Filter Logic (Search & Gate)
    const searchIn = document.getElementById('logs-search');
    const gateSel = document.getElementById('logs-filter-gate');
    const filterLogs = () => {
      const term = (searchIn ? searchIn.value : '').toLowerCase();
      const gate = gateSel ? gateSel.value : 'all';
      const rows = document.querySelectorAll('#logs-table tbody tr');
      
      rows.forEach(row => {
        if (row.querySelector('.empty')) return; // skip empty msg
        const text = row.textContent.toLowerCase();
        const rowGate = row.cells[2].textContent.trim();
        const matchesSearch = text.includes(term);
        const matchesGate = gate === 'all' || rowGate === gate;
        row.style.display = matchesSearch && matchesGate ? '' : 'none';
      });
    };

    if (searchIn) searchIn.addEventListener('input', filterLogs);
    if (gateSel) gateSel.addEventListener('change', filterLogs);
  }
      });
    });
  }
        this.view.showToast('Theme preference updated');
      });
    }

    // Export Data
    const btnExport = document.getElementById('settings-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const data = {
          exportDate: new Date().toISOString(),
          students: this.model.students,
          exitLogs: this.model.exitLogs
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PGP_Backup_${new Date().toLocaleDateString('en-CA')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.view.showToast('Data exported successfully');
      });
    }

    // Import Data
    const btnImport = document.getElementById('settings-import-btn');
    const fileImport = document.getElementById('settings-import-file');
    
    if (btnImport && fileImport) {
      btnImport.addEventListener('click', () => fileImport.click());
      
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (confirm('Are you sure you want to import data? This will overwrite existing students, logs, and TGPs. This action cannot be undone.')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              if (data.students) this.model.students = data.students;
              if (data.exitLogs) this.model.exitLogs = data.exitLogs;
              if (data.tgp) this.model.tgp = data.tgp;
              
              this.model.saveStudents();
              this.model.saveLogs();
              this.model.saveTGP();
              
              this.view.showToast('Data imported successfully. Refreshing...', 'success');
              setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
              console.error(err);
              this.view.showToast('Error importing data. Invalid JSON format.', 'error');
            }
          };
          reader.readAsText(file);
        }
        fileImport.value = ''; // Reset input
      });
    }

    // Clear Data
    const btnClear = document.getElementById('settings-clear-db');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('CRITICAL WARNING: This will permanently delete ALL students and logs. Are you absolutely sure?')) {
          if (confirm('Are you REALLY sure? This cannot be undone.')) {
            this.model.students = [];
            this.model.exitLogs = [];
            this.model.tgp = [];
            this.model.save();
            this.view.showToast('All database records cleared', 'error');
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      });
    }
  }

    // RBAC: Hide action buttons if guard
    if (this.model.currentUser && this.model.currentUser.role === 'guard') {
      document.querySelectorAll('.btn-tgp-action').forEach(btn => btn.style.display = 'none');
      if (btnAdd) btnAdd.style.display = 'none';
    }

    // Action buttons (Approve/Reject)
    document.querySelectorAll('.btn-tgp-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const action = e.currentTarget.dataset.action;
        
        if (confirm(`Are you sure you want to ${action === 'approved' ? 'APPROVE' : 'REJECT'} this pass?`)) {
          this.model.updateTGPStatus(id, action);
          this.view.showToast(`Pass ${action}`);
          this.navigateToPage('tgp');
        }
      });
    });

    // Pill filters
    const pills = document.querySelectorAll('#tgp-table-filters .pill, button.pill[data-filter]');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('on'));
        e.currentTarget.classList.add('on');
        const filter = e.currentTarget.dataset.filter || 'all';
        const rows = document.querySelectorAll('#tgp-table tbody tr');
        
        rows.forEach(row => {
          if (row.querySelector('.empty')) return;
          const status = row.dataset.status;
          row.style.display = (filter === 'all' || status === filter) ? '' : 'none';
        });
      });
    });
  }

    // Close wizard
    const btnClose = document.getElementById('btn-close-wizard');
    if (btnClose && wizardModal) {
      btnClose.addEventListener('click', () => {
        wizardModal.style.display = 'none';
      });
    }

    // Wizard navigation
    const btnNext = document.getElementById('btn-wizard-next');
    const btnPrev = document.getElementById('btn-wizard-prev');
    const btnSubmit = document.getElementById('btn-wizard-submit');
    
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        // Basic validation before next
        if (this.currentWizardStep === 1) {
          if (!document.getElementById('w-name').value || !document.getElementById('w-studid').value) {
            this.view.showToast('Please fill out Name and Student ID', 'error');
            return;
          }
        } else if (this.currentWizardStep === 2) {
          if (!document.getElementById('w-grade').value) {
            this.view.showToast('Please select a Grade', 'error');
            return;
          }
        } else if (this.currentWizardStep === 3) {
          if (!document.getElementById('w-parent-name').value || !document.getElementById('w-parent-email').value) {
            this.view.showToast('Please fill out Guardian Name and Email', 'error');
            return;
          }
          // Update summary for step 4
          document.getElementById('r-name').textContent = document.getElementById('w-name').value;
          document.getElementById('r-studid').textContent = document.getElementById('w-studid').value;
          document.getElementById('r-grade').textContent = document.getElementById('w-grade').value + ' ' + document.getElementById('w-section').value;
          document.getElementById('r-guardian').textContent = document.getElementById('w-parent-name').value;
          document.getElementById('r-email').textContent = document.getElementById('w-parent-email').value;
        }

        if (this.currentWizardStep < 4) {
          this.goToWizardStep(this.currentWizardStep + 1);
        }
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentWizardStep > 1) {
          this.goToWizardStep(this.currentWizardStep - 1);
        }
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        this.handleEnrollment();
      });
    }

    // Photo preview
    const photoInput = document.getElementById('w-photo-file');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const preview = document.getElementById('w-photo-preview');
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            // Save data URI for submission
            this.tempPhotoData = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Delete student
    const delBtns = document.querySelectorAll('.btn-del-student');
    if (this.model.currentUser && this.model.currentUser.role !== 'admin') {
      delBtns.forEach(btn => btn.style.display = 'none');
    } else {
      delBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          if (confirm('Are you sure you want to remove this student?')) {
            this.model.removeStudent(id);
            this.view.showToast('Student removed successfully');
            this.navigateToPage('students');
          }
        });
      });
    }

    // Virtual ID Card
    const modalId = document.getElementById('modal-idcard');
    const btnCloseId = document.getElementById('btn-close-idcard');
    if (btnCloseId && modalId) {
      btnCloseId.addEventListener('click', () => modalId.style.display = 'none');
    }

    document.querySelectorAll('.btn-view-id').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const student = this.model.students.find(s => s.id === id);
        if (!student) return;

        const target = document.getElementById('idcard-render-target');
        
        // Generate the HTML for the ID
        target.innerHTML = `
          <div id="idcard-capture" style="width: 300px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); font-family: 'Segoe UI', sans-serif; position: relative;">
            <!-- Header -->
            <div style="background: #422467; padding: 15px; text-align: center; color: #fff;">
              <div style="font-size: 14px; font-weight: 800; letter-spacing: 1px;">SOUTHVILLE INTERNATIONAL</div>
              <div style="font-size: 10px; color: #00c9b1; font-weight: 700; margin-top: 2px;">PERMANENT GATE PASS</div>
            </div>
            
            <!-- Body -->
            <div style="padding: 20px; text-align: center;">
              <div style="width: 100px; height: 100px; margin: 0 auto 15px; border-radius: 10px; border: 3px solid #00c9b1; overflow: hidden; background: #f0ebf7;">
                ${student.photo ? `<img src="${student.photo}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #422467;">${student.name.substring(0, 2).toUpperCase()}</div>`}
              </div>
              
              <div style="font-size: 20px; font-weight: 800; color: #1f2937; margin-bottom: 4px; line-height: 1.1;">${student.name}</div>
              <div style="font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 15px;">${student.grade} ${student.section ? '- ' + student.section : ''}</div>
              
              <div style="background: #f5f4f8; border-radius: 8px; padding: 10px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Scan to Verify</div>
                <div id="idcard-qrcode"></div>
                <div style="font-size: 11px; font-weight: 700; font-family: monospace; color: #422467; margin-top: 5px; letter-spacing: 1px;">${student.pgp}</div>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #00c9b1; padding: 10px; text-align: center; color: #003d35; font-size: 10px; font-weight: 700;">
              SY 2025-2026 · VALID UNTIL JUNE 2026
            </div>
          </div>
        `;

        // Generate QR inside the ID
        const qrText = student.pgp || student.studid || student.id || 'N/A';
        setTimeout(() => {
          new QRCode(document.getElementById('idcard-qrcode'), {
            text: qrText,
            width: 90,
            height: 90,
            colorDark: "#1f2937",
            colorLight: "#f5f4f8",
          });
        }, 50);

        modalId.style.display = 'flex';
      });
    });

    // Download ID Action
    const btnDownload = document.getElementById('btn-download-id');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const captureArea = document.getElementById('idcard-capture');
        if (!captureArea) return;

        btnDownload.innerHTML = 'Generating...';
        btnDownload.disabled = true;

        html2canvas(captureArea, { scale: 3 }).then(canvas => {
          const img = canvas.toDataURL("image/png");
          const a = document.createElement('a');
          a.href = img;
          a.download = `PGP_Card_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          btnDownload.innerHTML = 'Download Image';
          btnDownload.disabled = false;
        });
      });
    }

    // Student search
    const searchIn = document.getElementById('students-search');
    if (searchIn) {
      searchIn.addEventListener('input', () => {
        const term = searchIn.value.toLowerCase();
        const rows = document.querySelectorAll('#students-table tbody tr');
        rows.forEach(row => {
          if (row.querySelector('.empty')) return;
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(term) ? '' : 'none';
        });
      });
    }
  }

  goToWizardStep(step) {
    this.currentWizardStep = step;
    
    // Hide all panels
    document.querySelectorAll('.wizard-panel').forEach(p => p.style.display = 'none');
    // Show current panel
    document.getElementById(`panel-step-${step}`).style.display = 'block';

    // Update indicators
    document.querySelectorAll('.wizard-step').forEach((el, idx) => {
      const isCurrent = idx + 1 === step;
      const isPast = idx + 1 < step;
      el.style.color = (isCurrent || isPast) ? 'var(--primary)' : 'var(--text3)';
      el.style.fontWeight = isCurrent ? '700' : '500';
      const circle = el.firstElementChild;
      circle.style.background = isCurrent ? 'var(--primary)' : 'var(--bg-card)';
      circle.style.color = isCurrent ? '#fff' : 'inherit';
      circle.style.borderColor = (isCurrent || isPast) ? 'var(--primary)' : 'var(--border2)';
      if (isPast) {
        circle.style.background = 'var(--primary-soft)';
        circle.style.color = 'var(--primary)';
      }
    });

    // Update buttons
    document.getElementById('btn-wizard-prev').style.display = step > 1 ? 'block' : 'none';
    document.getElementById('btn-wizard-next').style.display = step < 4 ? 'block' : 'none';
    document.getElementById('btn-wizard-submit').style.display = step === 4 ? 'block' : 'none';
  }

  handleEnrollment() {
    const name = document.getElementById('w-name').value;
    const studid = document.getElementById('w-studid').value;
    const grade = document.getElementById('w-grade').value;
    const section = document.getElementById('w-section').value;
    const parentName = document.getElementById('w-parent-name').value;
    const parentEmail = document.getElementById('w-parent-email').value;
    const parentPhone = document.getElementById('w-parent-phone').value;

    const newStudent = {
      id: Date.now().toString(),
      name,
      studid,
      grade,
      section,
      parentName,
      parentEmail,
      phone: parentPhone,
      photo: this.tempPhotoData || '',
      pgp: 'PGP-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      status: 'active'
    };

    this.model.addStudent(newStudent);
    this.view.showToast('Student enrolled & PGP generated!');
    document.getElementById('modal-wizard').style.display = 'none';
    this.tempPhotoData = null;
    this.navigateToPage('students');
  }

  // ── Scanner Logic ───────────────────────────────────────      });
    });

    // USB Scanner Input
    const usbInput = document.getElementById('scan-usb-input');
    if (usbInput) {
      usbInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.processScan(usbInput.value.trim());
          usbInput.value = '';
        }
      });
    }

    // Manual Input
    const manualBtn = document.getElementById('btn-manual-verify');
    const manualInput = document.getElementById('scan-manual-input');
    if (manualBtn && manualInput) {
      manualBtn.addEventListener('click', () => {
        if (manualInput.value.trim()) {
          this.processScan(manualInput.value.trim().toUpperCase());
          manualInput.value = '';
        }
      });
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          manualBtn.click();
        }
      });
    }

    // Camera Start Button
    const camStartBtn = document.getElementById('btn-start-camera');
    if (camStartBtn) {
      camStartBtn.addEventListener('click', () => {
        this.startCamera();
      });
    }
  }

  startCamera() {
    const video = document.getElementById('scan-video');
    const startUi = document.getElementById('scan-start-ui');
    const overlay = document.getElementById('scan-overlay');
    
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        this.videoStream = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.style.display = "block";
        startUi.style.display = "none";
        overlay.style.display = "block";
        video.play();
        this.scannerActive = true;
        requestAnimationFrame(() => this.tickCamera());
      })
      .catch(err => {
        console.error("Camera access denied", err);
        this.view.showToast("Camera access denied or unavailable", "error");
      });
  }

  stopCamera() {
    this.scannerActive = false;
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    const video = document.getElementById('scan-video');
    const startUi = document.getElementById('scan-start-ui');
    const overlay = document.getElementById('scan-overlay');
    if (video) video.style.display = 'none';
    if (startUi) startUi.style.display = 'block';
    if (overlay) overlay.style.display = 'none';
  }

  tickCamera() {
    if (!this.scannerActive) return;
    
    const video = document.getElementById('scan-video');
    const canvasElement = document.getElementById('scan-canvas');
    if (!video || !canvasElement) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasElement.getContext("2d");
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      
      const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

      if (code && code.data) {
        this.processScan(code.data);
        // Cooldown
        this.stopCamera();
        setTimeout(() => {
           // Allow restart after 3 seconds
           const startUi = document.getElementById('scan-start-ui');
           if (startUi && this.view.currentPage === 'scanner') startUi.style.display = 'block';
        }, 3000);
        return; // wait before continuing
      }
    }
    requestAnimationFrame(() => this.tickCamera());
  }

  processScan(scannedData) {
    let student = null;
    let isDenied = false;
    let msg = '';
    let passType = 'PGP';

    // 1. Check if it's a TGP
    const tgp = this.model.getTGP(scannedData);
    if (tgp) {
      passType = 'TGP';
      student = this.model.getStudentByPassId(tgp.studentId) || this.model.getStudentByStudId(tgp.studentId);
      
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (tgp.status !== 'approved') {
        isDenied = true;
        msg = `TGP is ${tgp.status.toUpperCase()}`;
      } else if (tgp.validDate !== todayStr) {
        isDenied = true;
        msg = `TGP valid only for ${tgp.validDate}`;
      } else {
        msg = 'Valid Temporary Pass';
      }
    } else {
      // 2. Check PGP / Student ID
      student = this.model.students.find(s => 
        s.id === scannedData || 
        s.studid === scannedData || 
        s.pgp === scannedData
      );

      if (!student) {
        isDenied = true;
      } else if (student.status !== 'active') {
        isDenied = true;
        msg = `Pass is ${student.status}`;
      } else {
        msg = 'Valid Permanent Pass';
      }
    }

    // Log the event
    const gateSelect = document.getElementById('scan-gate');
    const gate = gateSelect ? gateSelect.value : 'Main Gate';
    
    this.model.addExitLog({
      id: Date.now().toString(),
      studentId: student ? student.id : scannedData,
      gate: gate,
      timestamp: new Date().toISOString(),
      result: isDenied ? 'denied' : 'granted',
      passType: passType
    });

    // Render result
    const resultBox = document.getElementById('scan-result');
    if (resultBox) {
      resultBox.style.display = 'block';
      // Use ScannerView directly for result rendering
      import('../views/ScannerView.js').then(module => {
        resultBox.innerHTML = module.default.renderResult(student, isDenied, msg);
        // Auto-hide result after 5s
        setTimeout(() => {
          if (resultBox.innerHTML.includes(student ? student.name : 'Invalid Pass')) {
            resultBox.style.display = 'none';
          }
        }, 5000);
      });
    }

    // Refresh live feed
    const feedBox = document.getElementById('live-feed-container');
    if (feedBox) {
      import('../views/ScannerView.js').then(module => {
        const todayLogs = (this.model.exitLogs || []).filter(l => l.timestamp && l.timestamp.startsWith(new Date().toLocaleDateString('en-CA')));
        feedBox.innerHTML = module.default.renderLiveFeed(todayLogs, this.model);
      });
    }

    // Send email logic (placeholder for actual EmailJS call)
    if (student && !isDenied) {
      console.log(`Simulating email to ${student.parentEmail}: ${student.name} exited via ${gate}`);
    }
  }
}
