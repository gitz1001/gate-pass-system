export default class StudentsController {
  static bind(controller) {
    controller.currentWizardStep = 1;
    const btnAdd = document.getElementById('btn-add-student');
    const wizardModal = document.getElementById('modal-wizard');
    if (btnAdd && wizardModal) {
      btnAdd.addEventListener('click', () => {
        wizardModal.style.display = 'flex';
        controller.goToWizardStep(1);
        document.getElementById('form-enroll').reset();
        document.getElementById('w-photo-preview').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
      });
    }
    const btnClose = document.getElementById('btn-close-wizard');
    if (btnClose && wizardModal) {
      btnClose.addEventListener('click', () => { wizardModal.style.display = 'none'; });
    }
    const btnNext = document.getElementById('btn-wizard-next');
    const btnPrev = document.getElementById('btn-wizard-prev');
    const btnSubmit = document.getElementById('btn-wizard-submit');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (controller.currentWizardStep === 1) {
          if (!document.getElementById('w-name').value || !document.getElementById('w-studid').value) {
            controller.view.showToast('Please fill out Name and Student ID', 'error'); return;
          }
        } else if (controller.currentWizardStep === 2) {
          if (!document.getElementById('w-grade').value) {
            controller.view.showToast('Please select a Grade', 'error'); return;
          }
        } else if (controller.currentWizardStep === 3) {
          if (!document.getElementById('w-parent-name').value || !document.getElementById('w-parent-email').value) {
            controller.view.showToast('Please fill out Guardian Name and Email', 'error'); return;
          }
          document.getElementById('r-name').textContent = document.getElementById('w-name').value;
          document.getElementById('r-studid').textContent = document.getElementById('w-studid').value;
          document.getElementById('r-grade').textContent = document.getElementById('w-grade').value + ' ' + document.getElementById('w-section').value;
          document.getElementById('r-guardian').textContent = document.getElementById('w-parent-name').value;
          document.getElementById('r-email').textContent = document.getElementById('w-parent-email').value;
        }
        if (controller.currentWizardStep < 4) {
          controller.goToWizardStep(controller.currentWizardStep + 1);
        }
      });
    }
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (controller.currentWizardStep > 1) controller.goToWizardStep(controller.currentWizardStep - 1);
      });
    }
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => { controller.handleEnrollment(); });
    }
    const photoInput = document.getElementById('w-photo-file');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            document.getElementById('w-photo-preview').innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            controller.tempPhotoData = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }
    const delBtns = document.querySelectorAll('.btn-del-student');
    if (controller.model.currentUser && controller.model.currentUser.role !== 'admin') {
      delBtns.forEach(btn => btn.style.display = 'none');
    } else {
      delBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          if (confirm('Are you sure you want to remove this student?')) {
            controller.model.removeStudent(id);
            controller.view.showToast('Student removed successfully');
            controller.navigateToPage('students');
          }
        });
      });
    }
    StudentsController.bindIdCard(controller);
    const searchIn = document.getElementById('students-search');
    if (searchIn) {
      searchIn.addEventListener('input', () => {
        const term = searchIn.value.toLowerCase();
        document.querySelectorAll('#students-table tbody tr').forEach(row => {
          if (row.querySelector('.empty')) return;
          row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
      });
    }
  }

  static bindIdCard(controller) {
    const modalId = document.getElementById('modal-idcard');
    const btnCloseId = document.getElementById('btn-close-idcard');
    if (btnCloseId && modalId) btnCloseId.addEventListener('click', () => modalId.style.display = 'none');
    document.querySelectorAll('.btn-view-id').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const student = controller.model.students.find(s => s.id === id);
        if (!student) return;
        const target = document.getElementById('idcard-render-target');
        const photoHtml = student.photo
          ? `<img src="${student.photo}" style="width:100%;height:100%;object-fit:cover;">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:#422467;">${student.name.substring(0,2).toUpperCase()}</div>`;
        target.innerHTML = `
          <div id="idcard-capture" style="width:300px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);font-family:'Segoe UI',sans-serif;">
            <div style="background:#422467;padding:15px;text-align:center;color:#fff;">
              <div style="font-size:14px;font-weight:800;letter-spacing:1px;">SOUTHVILLE INTERNATIONAL</div>
              <div style="font-size:10px;color:#00c9b1;font-weight:700;margin-top:2px;">PERMANENT GATE PASS</div>
            </div>
            <div style="padding:20px;text-align:center;">
              <div style="width:100px;height:100px;margin:0 auto 15px;border-radius:10px;border:3px solid #00c9b1;overflow:hidden;background:#f0ebf7;">${photoHtml}</div>
              <div style="font-size:20px;font-weight:800;color:#1f2937;margin-bottom:4px;">${student.name}</div>
              <div style="font-size:13px;color:#6b7280;font-weight:600;margin-bottom:15px;">${student.grade} ${student.section ? '- '+student.section : ''}</div>
              <div style="background:#f5f4f8;border-radius:8px;padding:10px;margin-bottom:20px;display:flex;flex-direction:column;align-items:center;">
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:5px;">Scan to Verify</div>
                <div id="idcard-qrcode"></div>
                <div style="font-size:11px;font-weight:700;font-family:monospace;color:#422467;margin-top:5px;letter-spacing:1px;">${student.pgp}</div>
              </div>
            </div>
            <div style="background:#00c9b1;padding:10px;text-align:center;color:#003d35;font-size:10px;font-weight:700;">SY 2025-2026 · VALID UNTIL JUNE 2026</div>
          </div>`;
        setTimeout(() => {
          new QRCode(document.getElementById('idcard-qrcode'), { text: student.pgp || student.studid || student.id || 'N/A', width: 90, height: 90, colorDark: "#1f2937", colorLight: "#f5f4f8" });
        }, 50);
        modalId.style.display = 'flex';
      });
    });
    const btnDownload = document.getElementById('btn-download-id');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const captureArea = document.getElementById('idcard-capture');
        if (!captureArea) return;
        btnDownload.innerHTML = 'Generating...';
        btnDownload.disabled = true;
        html2canvas(captureArea, { scale: 3 }).then(canvas => {
          const a = document.createElement('a');
          a.href = canvas.toDataURL("image/png");
          a.download = `PGP_Card_${Date.now()}.png`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          btnDownload.innerHTML = 'Download Image';
          btnDownload.disabled = false;
        });
      });
    }
  }
}
