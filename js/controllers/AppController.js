export default class AppController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    
    this.videoStream = null;
    this.scanInterval = null;
    this.scanCooldown = false;

    // Init EmailJS
    emailjs.init('JUClA9Stp6wKcFD2f');

    this.initEventListeners();
    this.refreshAdminData();
    this.view.renderLogs(this.model.exitLogs);
  }

  initEventListeners() {
    // Nav
    document.querySelectorAll('nav button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = e.target.dataset.page;
        this.view.showPage(page);
        if (page === 'logs') this.view.renderLogs(this.model.exitLogs);
        if (page === 'admin') this.refreshAdminData();
      });
    });

    // Admin Add Form
    document.getElementById('btn-new-student').addEventListener('click', () => this.view.showAddForm());
    document.getElementById('btn-cancel-add').addEventListener('click', () => this.view.hideAddForm());
    document.getElementById('btn-enroll').addEventListener('click', () => this.handleEnroll());
    document.getElementById('f-photo').addEventListener('change', (e) => this.handlePhotoUpload(e));
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.view.renderStudentTable(this.model.students, e.target.value);
    });

    // Delegated events for dynamic table buttons
    document.getElementById('student-tbody').addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-view-id')) {
        this.handleShowID(e.target.dataset.id);
      } else if (e.target.classList.contains('btn-remove')) {
        this.handleRemoveStudent(e.target.dataset.id);
      }
    });

    // ID Modal
    document.getElementById('btn-close-modal').addEventListener('click', () => this.view.closeIDModal());
    document.getElementById('btn-download-id').addEventListener('click', () => alert('In production, this would use html2canvas or a server-side PDF generator to export the ID card.'));

    // Scanner
    document.getElementById('cam-btn').addEventListener('click', () => this.startCamera());
    document.getElementById('btn-stop-cam').addEventListener('click', () => this.stopCamera());
    document.getElementById('qr-upload').addEventListener('change', (e) => this.handleQRUpload(e));
    document.getElementById('btn-manual-lookup').addEventListener('click', () => this.handleManualLookup());

    // Logs
    document.getElementById('btn-clear-logs').addEventListener('click', () => this.handleClearLogs());
  }

  refreshAdminData() {
    this.view.renderStudentTable(this.model.students);
    this.updateStats();
  }

  updateStats() {
    const total = this.model.students.length;
    const grade7 = this.model.students.filter(s => s.section.toLowerCase().includes('7')).length;
    const grade8 = this.model.students.filter(s => s.section.toLowerCase().includes('8')).length;
    const today = new Date().toDateString();
    const exitsToday = this.model.exitLogs.filter(l => new Date(l.time).toDateString() === today).length;
    this.view.updateStats(total, grade7, grade8, exitsToday);
  }

  // --- Handlers ---
  handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => this.view.previewPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  handleEnroll() {
    const data = this.view.getFormData();
    if (!data.last || !data.first || !data.studid || !data.section || !data.email) {
      alert('Please fill in all required fields (Last Name, First Name, ID, Section, Parent Email).');
      return;
    }

    const passID = 'PGP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    data.id = passID;
    data.enrolled = new Date().toISOString();

    this.model.addStudent(data);
    this.refreshAdminData();
    this.view.hideAddForm();
    this.view.clearAddForm();
    this.handleShowID(passID);
  }

  handleRemoveStudent(id) {
    if (!confirm('Remove this student from PGP?')) return;
    this.model.removeStudent(id);
    this.refreshAdminData();
  }

  handleShowID(id) {
    const s = this.model.getStudentByPassId(id);
    if (!s) return;

    const initials = (s.first.charAt(0) + s.last.charAt(0)).toUpperCase();
    const avatarHtml = s.photo 
      ? `<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initials;

    const dismissalHtml = s.dismissal ? `<div style="margin-top:10px;padding:6px 10px;background:rgba(0,194,168,0.08);border:1px solid var(--border);border-radius:8px;font-size:10px;color:var(--accent);text-align:center;letter-spacing:0.04em;">🚌 ${s.dismissal}</div>` : '';

    const html = `
      <div class="id-card">
        <div class="id-card-header">
          <div class="id-card-school">Southville International School and Colleges</div>
          <div class="id-card-title">PERMANENT GATE PASS</div>
          <div class="id-card-subtitle">AUTHORIZED EXIT DOCUMENT</div>
        </div>
        <div class="id-card-body">
          <div class="id-card-avatar">${avatarHtml}</div>
          <div class="id-card-name">${s.last}, ${s.first}${s.mid ? ' ' + s.mid.charAt(0) + '.' : ''}</div>
          <div class="id-card-grade">${s.section} · SY ${s.sy}</div>
          <hr class="id-card-divider">
          <div class="id-card-details">
            <div class="id-card-field"><label>Student ID</label><div class="v">${s.studid}</div></div>
            <div class="id-card-field"><label>PGP No.</label><div class="v" style="font-size:10px;">${s.id}</div></div>
            <div class="id-card-field"><label>Guardian</label><div class="v" style="font-family:var(--font);font-size:11px;">${s.parent || '—'}</div></div>
            <div class="id-card-field"><label>Status</label><div class="v" style="color:var(--green);">✓ ACTIVE</div></div>
          </div>
          ${dismissalHtml}
          <div class="id-card-qr"><div id="qr-render-now"></div></div>
          <div class="id-card-pgp">SCAN TO VERIFY AT GATE</div>
        </div>
        <div class="id-card-footer">
          <span>Property of the school · Non-transferable · SY ${s.sy}</span>
        </div>
      </div>
    `;

    this.view.showIDModal(html);

    // Generate QR
    const payload = JSON.stringify({ pgp: s.id, sid: s.studid, v: 1 });
    setTimeout(() => {
      new QRCode(document.getElementById('qr-render-now'), {
        text: payload,
        width: 112,
        height: 112,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }, 100);
  }

  // --- Scanner Logic ---
  async startCamera() {
    try {
      let constraints = { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } };
      try {
        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch(e) {
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      const video = document.getElementById('qr-video');
      video.srcObject = this.videoStream;
      video.onloadedmetadata = () => { video.play(); this.startScanLoop(); };
      document.getElementById('cam-btn').textContent = 'Camera On';
    } catch(e) {
      alert('Camera access denied or unavailable.');
    }
  }

  stopCamera() {
    if (this.videoStream) { this.videoStream.getTracks().forEach(t => t.stop()); this.videoStream = null; }
    if (this.scanInterval) { clearInterval(this.scanInterval); this.scanInterval = null; }
    document.getElementById('cam-btn').textContent = 'Start Camera';
    this.view.updateScanStatus('ready', '● READY TO SCAN');
    
    const wrap = document.getElementById('video-wrap');
    if (wrap) wrap.classList.remove('scanning', 'scan-success', 'scan-error');
  }

  startScanLoop() {
    const video = document.getElementById('qr-video');
    const canvas = document.getElementById('qr-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.view.updateScanStatus('scanning', '● SCANNING...');
    
    const wrap = document.getElementById('video-wrap');
    if (wrap) {
      wrap.classList.remove('scan-success', 'scan-error');
      wrap.classList.add('scanning');
    }

    const offscreen = document.createElement('canvas');
    const octx = offscreen.getContext('2d', { willReadFrequently: true });

    this.scanInterval = setInterval(() => {
      if (video.readyState < 2 || !video.videoWidth) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      canvas.width = vw;
      canvas.height = vh;
      ctx.drawImage(video, 0, 0, vw, vh);

      let imgData = ctx.getImageData(0, 0, vw, vh);
      let code = jsQR(imgData.data, vw, vh, { inversionAttempts: 'dontInvert' });

      if (!code) code = jsQR(imgData.data, vw, vh, { inversionAttempts: 'onlyInvert' });

      if (!code) {
        const scale = 2;
        offscreen.width = vw * scale;
        offscreen.height = vh * scale;
        octx.filter = 'contrast(2) brightness(1.2) grayscale(1)';
        octx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
        octx.filter = 'none';
        imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
        code = jsQR(imgData.data, offscreen.width, offscreen.height, { inversionAttempts: 'attemptBoth' });
      }

      if (code && !this.scanCooldown) {
        this.processQR(code.data);
      }
    }, 100);
  }

  handleQRUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let code = null;
        const attempts = [
          { scale: 1, filter: 'none' }, { scale: 2, filter: 'none' },
          { scale: 1, filter: 'contrast(2) brightness(1.2) grayscale(1)' },
          { scale: 2, filter: 'contrast(2) brightness(1.2) grayscale(1)' },
        ];

        for (const attempt of attempts) {
          if (code) break;
          const canvas = document.createElement('canvas');
          canvas.width = img.width * attempt.scale;
          canvas.height = img.height * attempt.scale;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.filter = attempt.filter;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        }

        if (code && !this.scanCooldown) {
          this.processQR(code.data);
          this.view.updateScanStatus('success', '✓ QR FOUND IN IMAGE');
        } else {
          this.view.updateScanStatus('error', '✗ NO QR DETECTED IN IMAGE');
          this.view.showInvalidResult('No QR code detected in the uploaded image.', document.getElementById('gate-select').value);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  processQR(raw) {
    let payload;
    try { payload = JSON.parse(raw); } catch(e) { 
      this.view.showInvalidResult('Invalid QR code format.', document.getElementById('gate-select').value); 
      return; 
    }
    
    if (!payload.pgp) { 
      this.view.showInvalidResult('Not a valid PGP QR code.', document.getElementById('gate-select').value); 
      return; 
    }

    const student = this.model.getStudentByPassId(payload.pgp);
    const gate = document.getElementById('gate-select').value;

    if (!student) { 
      this.view.showInvalidResult('QR code not found in database. Possible fake ID!', gate); 
      return; 
    }

    this.scanCooldown = true;
    setTimeout(() => { this.scanCooldown = false; }, 4000);
    this.logVerifiedExit(student, gate);
  }

  handleManualLookup() {
    const query = document.getElementById('manual-id').value.trim();
    if (!query) return;
    const student = this.model.getStudentByStudId(query);
    const gate = document.getElementById('gate-select').value;

    if (student) this.logVerifiedExit(student, gate);
    else this.view.showInvalidResult('Student ID not found in PGP database.', gate);
  }

  logVerifiedExit(s, gate) {
    const now = new Date();
    this.view.showVerifiedResult(s, gate, now.toLocaleTimeString());
    this.view.updateScanStatus('success', '✓ SCAN SUCCESS');
    const wrap = document.getElementById('video-wrap');
    if (wrap) {
      wrap.classList.remove('scanning', 'scan-error');
      wrap.classList.add('scan-success');
    }

    const entry = {
      id: Date.now(),
      studentId: s.id,
      name: `${s.first} ${s.last}`,
      studid: s.studid,
      section: s.section,
      gate,
      email: s.email,
      parent: s.parent,
      time: now.toISOString()
    };

    this.model.addExitLog(entry);
    this.updateStats();
    this.view.renderLogs(this.model.exitLogs);
    this.simulateSendEmail(entry);
  }

  simulateSendEmail(entry) {
    const time = new Date(entry.time).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = new Date(entry.time).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const templateParams = {
      parent_email: entry.email,
      parent_name:  entry.parent || 'Parent/Guardian',
      student_name: entry.name,
      student_id:   entry.studid,
      section:      entry.section,
      gate:         entry.gate,
      time:         time,
      date:         date
    };

    emailjs.send('service_unfgjoj', 'template_qyh1bsp', templateParams)
      .then(() => {
        this.view.showToast(`📧 Email sent to ${entry.email}`);
      })
      .catch((err) => {
        this.view.showToast(`⚠️ Email failed: ${err.text || 'Check EmailJS settings'}`, true);
      });
  }

  handleClearLogs() {
    if (!confirm('Clear all exit logs?')) return;
    this.model.clearLogs();
    this.view.renderLogs(this.model.exitLogs);
    this.updateStats();
  }
}
