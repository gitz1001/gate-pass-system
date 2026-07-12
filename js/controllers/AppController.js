import AppModel from '../models/AppModel.js';
import AppView, { ROLE_PERMISSIONS } from '../views/AppView.js';
import LoginController from './pages/LoginController.js';
import DashboardController from './pages/DashboardController.js';
import LogsController from './pages/LogsController.js';
import PGPController from './pages/PGPController.js';
import SettingsController from './pages/SettingsController.js';
import TGPController from './pages/TGPController.js';
import StudentsController from './pages/StudentsController.js';
import ScannerController from './pages/ScannerController.js';

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

    // Offline queue processing
    window.addEventListener('online', () => this.processEmailQueue());
    this.processEmailQueue();

    // 5. Initialize Sync Engine
    this.initSync();
  }

  async processEmailQueue() {
    if (!this.model.emailQueue || this.model.emailQueue.length === 0) return;
    if (typeof window.emailjs === 'undefined') return;
    if (!navigator.onLine) return;

    console.log(`Attempting to send ${this.model.emailQueue.length} queued emails...`);
    
    while (this.model.emailQueue.length > 0) {
      const params = this.model.emailQueue[0];
      try {
        await window.emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', params);
        console.log('Queued email sent successfully');
        await this.model.removeEmailFromQueue(0);
      } catch (err) {
        console.error('Queued email still failing, stopping queue process', err);
        break; // Stop processing if one fails (no internet)
      }
    }
  }

  // ── Sync Engine ────────────────────────────────────────
  initSync() {
    if (this.model.currentUser) {
      this.performSync();
    }

    // Auto-poll every 30 seconds
    setInterval(() => {
      if (this.model.currentUser && navigator.onLine) {
        this.performSync();
      }
    }, 30000);

    // Update UI timer every second
    setInterval(() => {
      if (this.model.currentUser) this.view.renderSyncStatus(this.model);
    }, 1000);

    const btnSync = document.getElementById('btn-sync');
    if (btnSync) btnSync.addEventListener('click', () => this.performSync());

    window.addEventListener('online', () => {
      this.model.isOnline = true;
      if (this.model.currentUser) this.performSync();
    });
    window.addEventListener('offline', () => {
      this.model.isOnline = false;
      this.view.renderSyncStatus(this.model);
    });
  }

  async performSync() {
    if (this.model.syncStatus === 'syncing' || !navigator.onLine) return;
    
    // UI update
    this.model.syncStatus = 'syncing';
    this.view.renderSyncStatus(this.model);
    
    const success = await this.model.syncFromSheet();
    
    if (success && this.model.currentUser) {
      // Re-render current page to show new data
      this.view.showPage(this.view.currentPage, this.model);
      this.bindPageEvents(this.view.currentPage);
    } else if (!success) {
      this.view.showToast('Sync failed. Using offline cache.', 'error');
    }
    
    this.view.renderSyncStatus(this.model);
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

  // ── Global Event Binding ──────────────────────────────
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

    // Topbar Menu Button (Mobile / Desktop)
    const btnMenu = document.getElementById('btn-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        if (window.innerWidth <= 767) {
          this.view.openMobileSidebar();
        } else {
          const isCollapsed = !document.getElementById('sidebar').classList.contains('collapsed');
          this.model.setSidebarCollapsed(isCollapsed);
          this.view.setSidebarCollapsed(isCollapsed);
        }
      });
    }
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

  // ── Page-Specific Event Binding (delegates to controllers) ──
  bindPageEvents(pageId) {
    if (pageId === 'login') LoginController.bind(this);
    if (pageId === 'dashboard') DashboardController.bind(this);
    if (pageId === 'students') StudentsController.bind(this);
    if (pageId === 'scanner') ScannerController.bind(this);
    if (pageId === 'logs') LogsController.bind(this);
    if (pageId === 'pgp') PGPController.bind(this);
    if (pageId === 'settings') SettingsController.bind(this);
    if (pageId === 'tgp') TGPController.bind(this);
  }

  // ── Wizard Helpers (used by StudentsController) ────────
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

  async handleEnrollment() {
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

    await this.model.addStudent(newStudent);
    this.view.showToast('Student enrolled & PGP generated!');
    document.getElementById('modal-wizard').style.display = 'none';
    this.tempPhotoData = null;
    this.navigateToPage('students');
  }

  // ── Scanner Helpers (used by ScannerController) ────────
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
        const message = err.name === 'NotAllowedError' && err.message.includes('dismissed')
          ? "Camera permission was dismissed. Please try again and 'Allow' access."
          : "Camera access denied or unavailable. Please check your settings.";
        this.view.showToast(message, "error");
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
      
      if (typeof window.jsQR !== 'function') {
        this.stopCamera();
        this.view.showToast("QR Scanner library failed to load. Please check internet connection.", "error");
        return;
      }
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

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

  async processScan(scannedData) {
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
    
    await this.model.addExitLog({
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

    // Send email logic via EmailJS
    if (student && !isDenied && student.parentEmail) {
      if (typeof window.emailjs !== 'undefined') {
        const templateParams = {
          to_name: student.parentName || 'Parent/Guardian',
          to_email: student.parentEmail,
          student_name: student.name,
          gate_name: gate,
          exit_time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
          exit_date: new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
        };

        // Note: You will need to replace 'YOUR_SERVICE_ID' and 'YOUR_TEMPLATE_ID' with your actual EmailJS credentials
        window.emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
          .then(res => console.log('Email sent successfully', res.status))
          .catch(async err => {
            console.error('Failed to send email (offline?), queuing...', err);
            await this.model.addEmailToQueue(templateParams);
          });
      } else {
        console.warn("EmailJS is not loaded or configured.");
      }
    }
  }
}
