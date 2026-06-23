export default class AppView {
  constructor() {
    this.pages = document.querySelectorAll('.page');
    this.navButtons = document.querySelectorAll('nav button');
  }

  // --- Navigation ---
  showPage(pageId) {
    this.pages.forEach(p => p.classList.remove('active'));
    this.navButtons.forEach(b => b.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    document.querySelector(`nav button[data-page="${pageId}"]`).classList.add('active');
  }

  // --- Admin View ---
  updateStats(total, grade7, grade8, exitsToday) {
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-grade7').textContent = grade7;
    document.getElementById('stat-grade8').textContent = grade8;
    document.getElementById('stat-exits').textContent = exitsToday;
  }

  renderStudentTable(students, query = '') {
    const tbody = document.getElementById('student-tbody');
    const empty = document.getElementById('empty-state');
    const filtered = students.filter(s => `${s.first} ${s.last} ${s.studid}`.toLowerCase().includes(query.toLowerCase()));

    if (filtered.length === 0) { 
      tbody.innerHTML = ''; 
      empty.style.display = 'block'; 
      return; 
    }
    empty.style.display = 'none';

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td><strong>${s.last}, ${s.first}</strong><br><span style="font-size:11px;color:var(--text-muted);">${s.id}</span></td>
        <td><span style="font-family:var(--mono);font-size:13px;">${s.studid}</span></td>
        <td><span class="badge badge-grade">${s.section}</span></td>
        <td style="font-size:12px;">${s.email}</td>
        <td><span class="badge badge-active">ACTIVE</span></td>
        <td>
          <button class="btn btn-outline btn-view-id" data-id="${s.id}" style="padding:6px 14px;font-size:12px;">View ID</button>
          <button class="btn btn-danger btn-remove" data-id="${s.id}" style="padding:6px 14px;font-size:12px;margin-left:6px;">Remove</button>
        </td>
      </tr>
    `).join('');
  }

  showAddForm() {
    const form = document.getElementById('add-form-card');
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth' });
  }

  hideAddForm() {
    document.getElementById('add-form-card').classList.add('hidden');
  }

  clearAddForm() {
    ['f-lastname','f-firstname','f-midname','f-studid','f-section','f-parent','f-email','f-mobile','f-address'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-sy').value = '2025–2026';
    document.getElementById('f-dismissal').value = '';
    const preview = document.getElementById('photo-preview');
    preview.innerHTML = 'No Photo';
    delete preview.dataset.photoData;
    document.getElementById('f-photo').value = '';
  }

  getFormData() {
    return {
      last: document.getElementById('f-lastname').value.trim(),
      first: document.getElementById('f-firstname').value.trim(),
      mid: document.getElementById('f-midname').value.trim(),
      studid: document.getElementById('f-studid').value.trim(),
      section: document.getElementById('f-section').value.trim(),
      sy: document.getElementById('f-sy').value.trim(),
      dismissal: document.getElementById('f-dismissal').value,
      parent: document.getElementById('f-parent').value.trim(),
      email: document.getElementById('f-email').value.trim(),
      mobile: document.getElementById('f-mobile').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      photo: document.getElementById('photo-preview').dataset.photoData || null
    };
  }

  previewPhoto(dataUrl) {
    const preview = document.getElementById('photo-preview');
    preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
    preview.dataset.photoData = dataUrl;
  }

  // --- ID Card Modal ---
  showIDModal(studentHtml) {
    const modal = document.getElementById('id-modal');
    const wrap = document.getElementById('id-modal-card');
    wrap.innerHTML = `<div class="id-card-wrap" id="id-card-wrap">${studentHtml}</div>`;
    modal.style.display = 'flex';
    
    // Slight delay to allow display flex to apply before opacity transition
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    // Add 3D Tilt Effect
    setTimeout(() => {
      const cardWrap = document.getElementById('id-card-wrap');
      const card = cardWrap.querySelector('.id-card');
      if (cardWrap && card) {
        modal.addEventListener('mousemove', (e) => {
          const rect = cardWrap.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          // Only apply tilt if mouse is relatively near the card
          if (x > -100 && x < rect.width + 100 && y > -100 && y < rect.height + 100) {
            const rotateX = ((y - centerY) / centerY) * -15; // Max 15 deg tilt
            const rotateY = ((x - centerX) / centerX) * 15;
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
          } else {
            card.style.transform = `rotateX(0deg) rotateY(0deg)`;
          }
        });
        modal.addEventListener('mouseleave', () => {
          card.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
      }
    }, 100);
  }

  closeIDModal() {
    const modal = document.getElementById('id-modal');
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      document.getElementById('id-modal-card').innerHTML = '';
    }, 300); // Wait for fade out
  }

  // --- Scanner View ---
  updateScanStatus(status, text) {
    document.getElementById('scan-status').textContent = text;
  }

  showVerifiedResult(s, gate, timeString) {
    document.getElementById('result-idle').style.display = 'none';
    const card = document.getElementById('result-card');
    card.classList.add('show');

    document.getElementById('r-avatar').innerHTML = s.photo ? `<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (s.first.charAt(0) + s.last.charAt(0)).toUpperCase();
    document.getElementById('r-name').textContent = `${s.first} ${s.last}`;
    document.getElementById('r-sub').textContent = `${s.section} · SY ${s.sy}`;
    document.getElementById('r-id').textContent = s.studid;
    document.getElementById('r-section').textContent = s.section;
    document.getElementById('r-parent').textContent = s.parent || '—';
    document.getElementById('r-mobile').textContent = s.mobile || '—';
    document.getElementById('r-sy').textContent = s.sy;
    document.getElementById('r-gate').textContent = gate;
    document.getElementById('r-dismissal').textContent = s.dismissal || '—';

    const bar = document.getElementById('r-statusbar');
    bar.className = 'status-bar valid';
    document.getElementById('r-dot').className = 'dot green';
    document.getElementById('r-status-text').textContent = `✓ VERIFIED — Exit cleared at ${timeString}`;
  }

  showInvalidResult(msg, gate) {
    document.getElementById('result-idle').style.display = 'none';
    const card = document.getElementById('result-card');
    card.classList.add('show');

    document.getElementById('r-avatar').textContent = '!';
    document.getElementById('r-name').textContent = 'UNRECOGNIZED ID';
    document.getElementById('r-sub').textContent = 'This QR code is not in the database';
    document.getElementById('r-id').textContent = '—';
    document.getElementById('r-section').textContent = '—';
    document.getElementById('r-parent').textContent = '—';
    document.getElementById('r-mobile').textContent = '—';
    document.getElementById('r-sy').textContent = '—';
    document.getElementById('r-gate').textContent = gate;

    const bar = document.getElementById('r-statusbar');
    bar.className = 'status-bar invalid';
    document.getElementById('r-dot').className = 'dot red';
    document.getElementById('r-status-text').textContent = `✗ DENIED — ${msg}`;
  }

  // --- Logs View ---
  renderLogs(logs) {
    const container = document.getElementById('log-container');
    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-wrap">
          <div class="empty-icon">🚪</div>
          <div class="empty-text">No exits recorded yet</div>
          <div class="empty-sub">Scanned exits will appear here with email notifications.</div>
        </div>
      `;
      return;
    }
    container.innerHTML = logs.map(l => {
      const t = new Date(l.time);
      return `
        <div class="log-entry">
          <div class="log-icon">🚪</div>
          <div style="flex:1;">
            <div class="log-name">${l.name} <span style="font-size:12px;font-family:var(--mono);color:var(--text-muted);">${l.studid}</span></div>
            <div class="log-detail">${l.section} · Exited via <strong>${l.gate}</strong></div>
            <div class="log-time">${t.toLocaleDateString('en-PH', {weekday:'short',month:'short',day:'numeric'})} · ${t.toLocaleTimeString('en-PH')}<span class="email-tag">📧 Email sent to ${l.email}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }

  showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: ${isError ? '#ff4d6d' : '#00c2a8'};
      color: ${isError ? 'white' : '#0a1628'};
      padding: 12px 20px; border-radius: 10px;
      font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: fade-in 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}
