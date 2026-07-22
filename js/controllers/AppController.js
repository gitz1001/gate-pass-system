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
import ReportsController from './pages/ReportsController.js';
import faceBiometrics from '../services/FaceBiometrics.js';
import Icons from '../icons.js';

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

    // Auto-poll every 15 seconds (Optimized for 5-7 guards)
    setInterval(() => {
      if (this.model.currentUser && navigator.onLine) {
        this.performSync();
      }
    }, 15000);

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
      // SECURITY CHECK: Ensure the currently logged-in user still exists in the database
      const validUser = this.model.users.find(u => u.username === this.model.currentUser.username);
      if (!validUser) {
        this.performLogout('Your account is no longer valid. Please log in again.');
        return;
      }

      // Guard: Do not re-render if user is interacting with a modal, input field, or active camera
      const hasOpenModal = Array.from(document.querySelectorAll('.overlay')).some(el => el.style.display !== 'none');
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
      const isCameraActive = this.scannerActive || this.faceScanActive;

      if (!hasOpenModal && !isInputFocused && !isCameraActive) {
        // Re-render current page to show new data
        this.view.showPage(this.view.currentPage, this.model);
        this.bindPageEvents(this.view.currentPage);
      }
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
      this.stopFaceCamera();
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
    if (pageId === 'reports') ReportsController.bind(this);
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
    const gate = document.getElementById('w-gate').value;
    const arrangements = document.getElementById('w-arrangements').value;
    const vehicle = document.getElementById('w-vehicle').value;
    const parentName = document.getElementById('w-parent-name').value;
    const parentEmail = document.getElementById('w-parent-email').value;
    const parentPhone = document.getElementById('w-parent-phone').value;

    const newStudent = {
      id: Date.now().toString(),
      name,
      studid,
      grade,
      section: '',
      fullSection: grade,
      preferredGate: gate,
      arrangements,
      vehicleDetails: vehicle,
      parentName,
      parentEmail,
      phone: parentPhone,
      address: '',
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

    // Guard: mediaDevices API requires HTTPS or localhost
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.view.showToast("Camera API not available. Use HTTPS or localhost.", "error");
      return;
    }

    const onSuccess = (stream) => {
      this.videoStream = stream;
      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      video.style.display = "block";
      if (startUi) startUi.style.display = "none";
      if (overlay) overlay.style.display = "block";
      video.play();
      this.scannerActive = true;
      requestAnimationFrame(() => this.tickCamera());
    };

    const onFinalError = (err) => {
      console.error("Camera error:", err.name, err.message);
      let message;
      if (err.name === 'NotAllowedError') {
        message = "Camera permission denied. Please allow camera access in your browser and try again.";
      } else if (err.name === 'NotFoundError') {
        message = "No camera found on this device.";
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        message = "Camera is in use by another application. Close it and try again.";
      } else {
        message = "Camera error: " + (err.message || 'Unknown error');
      }
      this.view.showToast(message, "error");
    };

    // Try rear camera first (for mobile), fall back to any camera (for desktop)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(onSuccess)
      .catch(firstErr => {
        console.warn("Rear camera unavailable, trying any camera...", firstErr.name);
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(onSuccess)
          .catch(onFinalError);
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

  // ══════════════════════════════════════════════════════════════
  // FACE RECOGNITION — Completely separate from QR camera system
  // These methods use their own video element (#face-video) and
  // their own canvas (#face-overlay-canvas). The existing
  // startCamera/stopCamera/tickCamera methods are NOT modified.
  // ══════════════════════════════════════════════════════════════

  async startFaceCamera(mode = 'scan') {
    // ── RBAC Guard: Only admins can enroll faces ──
    if (mode === 'enroll') {
      if (!this.model.currentUser || this.model.currentUser.role !== 'admin') {
        this.view.showToast('Only administrators can enroll faces.', 'error');
        return;
      }

      // ── Consent Modal: Show RA 10173 disclaimer before enrollment ──
      const consent = await this.showFaceConsentModal();
      if (!consent) {
        this.view.showToast('Enrollment cancelled — consent not given.', 'error');
        return;
      }
    }

    this.faceMode = mode; // 'scan' or 'enroll'
    this.faceScanActive = false;
    this.blinkDetected = false; // Reset liveness state
    this.eyeOpenFrames = 0;
    this.blinkTransition = false;

    const video = document.getElementById('face-video');
    const startUi = document.getElementById('face-start-ui');
    const overlayCanvas = document.getElementById('face-overlay-canvas');
    const statusOverlay = document.getElementById('face-status-overlay');
    const livenessOverlay = document.getElementById('face-liveness-overlay');

    if (!video) return;

    // Guard: mediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.view.showToast('Camera API not available. Use HTTPS or localhost.', 'error');
      return;
    }

    // Show loading state
    if (statusOverlay) {
      statusOverlay.style.display = 'block';
      statusOverlay.textContent = 'Loading AI models...';
    }

    // Initialize face-api models (only loads once, cached after)
    const modelsReady = await faceBiometrics.init();
    if (!modelsReady) {
      this.view.showToast('Failed to load face recognition models.', 'error');
      if (statusOverlay) statusOverlay.style.display = 'none';
      return;
    }

    if (statusOverlay) {
      statusOverlay.textContent = mode === 'enroll' ? 'Position your face in frame...' : 'Scanning for faces...';
    }

    // Show liveness prompt for enrollment mode
    if (livenessOverlay) {
      livenessOverlay.style.display = mode === 'enroll' ? 'block' : 'none';
    }

    // Use FRONT camera for face scan (selfie mode)
    const onSuccess = (stream) => {
      this.faceStream = stream;
      video.srcObject = stream;
      video.style.display = 'block';
      if (startUi) startUi.style.display = 'none';
      if (overlayCanvas) overlayCanvas.style.display = 'block';
      video.play();
      this.faceScanActive = true;

      // Start the face detection loop
      requestAnimationFrame(() => this.tickFaceCamera());
    };

    const onError = (err) => {
      console.error('Face camera error:', err);
      this.view.showToast('Camera error: ' + (err.message || err.name), 'error');
      if (statusOverlay) statusOverlay.style.display = 'none';
      if (livenessOverlay) livenessOverlay.style.display = 'none';
    };

    // Prefer front camera (user-facing) for face scan
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(onSuccess)
      .catch(firstErr => {
        console.warn('Front camera unavailable, trying any camera...', firstErr.name);
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(onSuccess)
          .catch(onError);
      });
  }

  stopFaceCamera() {
    this.faceScanActive = false;
    if (this.faceStream) {
      this.faceStream.getTracks().forEach(track => track.stop());
      this.faceStream = null;
    }
    const video = document.getElementById('face-video');
    const startUi = document.getElementById('face-start-ui');
    const overlayCanvas = document.getElementById('face-overlay-canvas');
    const statusOverlay = document.getElementById('face-status-overlay');
    const livenessOverlay = document.getElementById('face-liveness-overlay');
    if (video) video.style.display = 'none';
    if (startUi) startUi.style.display = 'block';
    if (overlayCanvas) overlayCanvas.style.display = 'none';
    if (statusOverlay) statusOverlay.style.display = 'none';
    if (livenessOverlay) livenessOverlay.style.display = 'none';
  }

  async tickFaceCamera() {
    if (!this.faceScanActive) return;

    const video = document.getElementById('face-video');
    const overlayCanvas = document.getElementById('face-overlay-canvas');
    const statusOverlay = document.getElementById('face-status-overlay');
    const livenessOverlay = document.getElementById('face-liveness-overlay');
    if (!video || !overlayCanvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Resize overlay canvas to match video
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
      const ctx = overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      // Detect face
      const detection = await faceBiometrics.detectFace(video);

      if (detection) {
        // Draw bounding box around detected face
        const box = detection.detection.box;
        ctx.strokeStyle = '#00c9b1';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw corner accents
        const cornerLen = 20;
        ctx.strokeStyle = '#00e5c8';
        ctx.lineWidth = 4;
        // Top-left
        ctx.beginPath(); ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cornerLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cornerLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cornerLen, box.y + box.height); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen); ctx.stroke();

        if (this.faceMode === 'enroll') {
          // ── ENROLL MODE: Require liveness (blink) check first ──
          const ear = faceBiometrics.getEyeAspectRatio(detection.landmarks);
          const isBlinking = faceBiometrics.isBlinking(ear);

          if (!this.blinkDetected) {
            // Stage 1: Wait for eyes to be open (baseline)
            if (!isBlinking) {
              this.eyeOpenFrames++;
            }

            // Stage 2: Detect blink transition (open → closed)
            if (this.eyeOpenFrames >= 3 && isBlinking) {
              this.blinkTransition = true;
            }

            // Stage 3: Eyes re-opened after blink = liveness confirmed!
            if (this.blinkTransition && !isBlinking) {
              this.blinkDetected = true;
              // STOP the tick loop immediately to prevent re-triggering
              this.faceScanActive = false;

              if (livenessOverlay) {
                livenessOverlay.textContent = '✅ Liveness verified!';
                livenessOverlay.style.background = 'rgba(22,163,74,0.9)';
              }
              if (statusOverlay) {
                statusOverlay.textContent = 'Liveness confirmed — enrolling face...';
                statusOverlay.style.background = 'rgba(22,163,74,0.85)';
              }

              // Small delay then enroll (tick loop is stopped)
              setTimeout(() => {
                this.enrollFaceFromDetection(detection);
              }, 800);
              return;
            }

            // Update status during liveness check
            if (statusOverlay) {
              statusOverlay.textContent = 'Face detected — Please blink to verify';
              statusOverlay.style.background = 'rgba(66,36,103,0.85)';
            }
          }
        } else {
          // ── SCAN MODE: Match against enrolled faces ──
          // Use merged descriptors (localStorage + Google Sheets sync)
          const enrolled = faceBiometrics.getAllEnrolledFaces(this.model.students);
          if (enrolled.length === 0) {
            if (statusOverlay) {
              statusOverlay.textContent = 'No faces enrolled yet. Enroll first!';
              statusOverlay.style.background = 'rgba(220,38,38,0.8)';
            }
          } else {
            const result = faceBiometrics.matchFace(detection.descriptor, enrolled);
            if (result.match) {
              // MATCH FOUND — Draw green box
              ctx.strokeStyle = '#16a34a';
              ctx.lineWidth = 4;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              if (statusOverlay) {
                statusOverlay.textContent = `✓ Match found! (${Math.round((1 - result.distance) * 100)}% confidence)`;
                statusOverlay.style.background = 'rgba(22,163,74,0.85)';
              }

              // Trigger the same processScan flow as QR/USB!
              this.faceScanActive = false; // Pause scanning
              this.processScan(result.studentId);

              // Cooldown: restart after 4 seconds
              setTimeout(() => {
                if (this.view.currentPage === 'scanner') {
                  this.stopFaceCamera();
                }
              }, 4000);
              return;
            } else {
              if (statusOverlay) {
                statusOverlay.textContent = 'Scanning... No match yet';
                statusOverlay.style.background = 'rgba(0,0,0,0.7)';
              }
            }
          }
        }
      } else {
        // No face detected
        const ctx2 = overlayCanvas.getContext('2d');
        ctx2.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (statusOverlay) {
          statusOverlay.textContent = this.faceMode === 'enroll' ? 'Position your face in frame...' : 'Scanning... No face detected';
          statusOverlay.style.background = 'rgba(0,0,0,0.7)';
        }
      }
    }

    // Continue the loop (~500ms interval to save CPU)
    setTimeout(() => {
      requestAnimationFrame(() => this.tickFaceCamera());
    }, 500);
  }

  async enrollFaceFromDetection(detection) {
    // Ensure the tick loop is fully stopped
    this.faceScanActive = false;

    const statusOverlay = document.getElementById('face-status-overlay');
    const livenessOverlay = document.getElementById('face-liveness-overlay');

    // Prompt user to select which student to enroll
    const studentId = prompt(
      'Liveness verified! Enter the Student ID or PGP Pass ID to link this face to:',
      ''
    );

    if (!studentId || !studentId.trim()) {
      this.view.showToast('Enrollment cancelled.', 'error');
      this.stopFaceCamera();
      return;
    }

    const trimmedId = studentId.trim();

    // Verify the student exists
    const student = this.model.students.find(s =>
      s.id === trimmedId || s.studid === trimmedId || s.pgp === trimmedId
    );

    if (!student) {
      this.view.showToast('Student not found. Check the ID and try again.', 'error');
      this.stopFaceCamera();
      return;
    }

    // Save the face descriptor locally
    faceBiometrics.enrollFace(student.id, detection.descriptor);

    // ── Also save to Google Sheets (FaceDescriptor column) ──
    // We round to 4 decimal places to drastically reduce the payload size (prevents "Failed to fetch" network errors)
    const descriptorArray = faceBiometrics.descriptorToArray(detection.descriptor).map(n => Number(n.toFixed(4)));
    const descriptorJson = JSON.stringify(descriptorArray);
    
    student.faceDescriptor = descriptorJson;
    try {
      await this.model.updateStudent({ id: student.id, faceDescriptor: descriptorJson });
      console.log('[FaceBiometrics] Descriptor synced to Google Sheets.');
    } catch (err) {
      console.warn('[FaceBiometrics] Failed to sync descriptor to Sheets (will retry on next sync):', err);
    }

    // Update UI (elements may still exist since we stopped the tick loop, not the camera stream)
    const statusEl = document.getElementById('face-status-overlay');
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = `✓ Face enrolled for: ${student.name}`;
      statusEl.style.background = 'rgba(22,163,74,0.85)';
    }
    if (livenessOverlay) {
      livenessOverlay.style.display = 'none';
    }

    this.view.showToast(`Face enrolled for ${student.name}!`);
    this.updateFaceEnrolledCount();

    // Stop camera stream after 2 seconds
    setTimeout(() => this.stopFaceCamera(), 2000);
  }

  updateFaceEnrolledCount() {
    const countEl = document.getElementById('face-enrolled-count');
    if (countEl) {
      const localCount = faceBiometrics.getEnrolledCount();
      const syncedCount = this.model.students.filter(s => s.faceDescriptor).length;
      const total = Math.max(localCount, syncedCount);
      countEl.textContent = total > 0
        ? `${total} face${total !== 1 ? 's' : ''} enrolled`
        : 'No faces enrolled yet';
    }
  }

  // ── Consent Modal for Face Enrollment (RA 10173 Compliance) ──
  showFaceConsentModal() {
    return new Promise((resolve) => {
      const modalRoot = document.getElementById('modal-root');
      if (!modalRoot) { resolve(false); return; }

      modalRoot.innerHTML = `
        <div class="overlay" id="face-consent-overlay" style="display: flex;">
          <div class="modal" style="width: 480px;">
            <div class="modal-head">
              <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--primary);">${Icons['shield-check'](20)}</span>
                Biometric Data Consent
              </div>
            </div>
            <div class="modal-body" style="font-size: 13px; line-height: 1.7;">
              <div style="background: var(--primary-soft); border: 1px solid var(--primary); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 16px;">
                <strong style="color: var(--primary);">Data Privacy Notice</strong>
                <div style="font-size: 12px; color: var(--text2); margin-top: 6px;">
                  In accordance with <strong>Republic Act No. 10173</strong> (Data Privacy Act of 2012), 
                  this system will process biometric data (facial recognition) for identity verification purposes.
                </div>
              </div>

              <p><strong>What will be collected:</strong></p>
              <ul style="margin: 6px 0 14px 18px; color: var(--text2); font-size: 12px;">
                <li>A mathematical face descriptor (128-number array) — <strong>NOT a photo</strong></li>
                <li>This data cannot be reversed into an image of the person</li>
              </ul>

              <p><strong>How it will be used:</strong></p>
              <ul style="margin: 6px 0 14px 18px; color: var(--text2); font-size: 12px;">
                <li>Gate exit identity verification only</li>
                <li>Stored locally on this device and in the school's secure database</li>
                <li>Not shared with any third party</li>
              </ul>

              <p><strong>Anti-spoofing:</strong></p>
              <ul style="margin: 6px 0 14px 18px; color: var(--text2); font-size: 12px;">
                <li>The student must <strong>blink</strong> during enrollment to verify they are a live person</li>
                <li>This prevents enrollment using photos or screens</li>
              </ul>

              <div style="background: var(--yellow-s); border: 1px solid var(--yellow); border-radius: var(--radius-sm); padding: 10px; margin-top: 10px; font-size: 11px; color: var(--yellow);">
                <strong>⚠ Consent Required:</strong> By proceeding, you confirm that the student (or parent/guardian 
                for minors) has given informed consent for biometric data processing.
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn-ghost" id="face-consent-decline">Decline</button>
              <button class="btn btn-primary" id="face-consent-accept" style="gap: 6px;">
                ${Icons['shield-check'](14)} I Agree — Proceed
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('face-consent-accept').addEventListener('click', () => {
        modalRoot.innerHTML = '';
        resolve(true);
      });
      document.getElementById('face-consent-decline').addEventListener('click', () => {
        modalRoot.innerHTML = '';
        resolve(false);
      });
    });
  }
}
