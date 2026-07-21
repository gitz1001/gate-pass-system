import Icons from '../../icons.js';
import { escapeHTML } from '../../utils.js';

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
          const nameVal = document.getElementById('w-name').value.trim();
          const studidVal = document.getElementById('w-studid').value.trim();
          if (!nameVal || !studidVal) {
            controller.view.showToast('Please fill out Name and Student ID', 'error'); return;
          }
          // Duplicate Student ID check
          const duplicate = (controller.model.students || []).find(s => s.studid === studidVal);
          if (duplicate) {
            controller.view.showToast(`Student ID "${studidVal}" already exists (${duplicate.name})`, 'error'); return;
          }
        } else if (controller.currentWizardStep === 2) {
          if (!document.getElementById('w-grade').value) {
            controller.view.showToast('Please select a Grade', 'error'); return;
          }
        } else if (controller.currentWizardStep === 3) {
          const parentName = document.getElementById('w-parent-name').value.trim();
          const parentEmail = document.getElementById('w-parent-email').value.trim();
          if (!parentName || !parentEmail) {
            controller.view.showToast('Please fill out Guardian Name and Email', 'error'); return;
          }
          // Email format validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(parentEmail)) {
            controller.view.showToast('Please enter a valid email address', 'error'); return;
          }
          document.getElementById('r-name').textContent = document.getElementById('w-name').value;
          document.getElementById('r-studid').textContent = document.getElementById('w-studid').value;
          document.getElementById('r-grade').textContent = document.getElementById('w-grade').value;
          document.getElementById('r-gate').textContent = document.getElementById('w-gate').value || 'Any';
          document.getElementById('r-arrangements').textContent = document.getElementById('w-arrangements').value || 'None specified';
          document.getElementById('r-vehicle').textContent = document.getElementById('w-vehicle').value || 'None';
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
      btnSubmit.addEventListener('click', async () => { await controller.handleEnrollment(); });
    }
    const photoInput = document.getElementById('w-photo-file');
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const compressedDataUrl = await compressImage(file, 250, 250, 0.7);
            document.getElementById('w-photo-preview').innerHTML = `<img src="${compressedDataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            controller.tempPhotoData = compressedDataUrl;
          } catch (err) {
            console.error('Failed to compress image:', err);
            controller.view.showToast('Failed to process image.', 'error');
          }
        }
      });
    }
    // ── Archive Student ─────────────────────────────────────
    document.querySelectorAll('.btn-archive-student').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const student = controller.model.students.find(s => s.id === id);
        if (!student) return;
        if (confirm(`Archive "${student.name}"? Their PGP will be deactivated.`)) {
          await controller.model.archiveStudent(id);
          controller.view.showToast(`${student.name} has been archived`);
          controller.navigateToPage('students');
        }
      });
    });

    // ── Restore Student ─────────────────────────────────────
    document.querySelectorAll('.btn-restore-student').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const student = controller.model.students.find(s => s.id === id);
        if (!student) return;
        if (confirm(`Restore "${student.name}" and reactivate their PGP?`)) {
          await controller.model.updateStudentStatus(id, 'active');
          controller.view.showToast(`${student.name} has been restored`);
          controller.navigateToPage('students');
        }
      });
    });

    // ── Edit Student ────────────────────────────────────────
    const editModal = document.getElementById('modal-edit-student');
    const btnCloseEdit = document.getElementById('btn-close-edit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    if (btnCloseEdit && editModal) btnCloseEdit.addEventListener('click', () => editModal.style.display = 'none');
    if (btnCancelEdit && editModal) btnCancelEdit.addEventListener('click', () => editModal.style.display = 'none');

    document.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const student = controller.model.students.find(s => s.id === id);
        if (!student || !editModal) return;

        // Pre-fill form
        document.getElementById('edit-id').value = student.id;
        document.getElementById('edit-name').value = student.name || '';
        document.getElementById('edit-studid').value = student.studid || '';
        document.getElementById('edit-grade').value = student.grade || '';
        document.getElementById('edit-gate').value = student.preferredGate || '';
        document.getElementById('edit-arrangements').value = student.arrangements || '';
        document.getElementById('edit-vehicle').value = student.vehicleDetails || '';
        document.getElementById('edit-parent-name').value = student.parentName || '';
        document.getElementById('edit-parent-email').value = student.parentEmail || '';
        document.getElementById('edit-parent-phone').value = student.phone || '';

        // Reset photo upload state
        controller.editPhotoData = null;
        document.getElementById('edit-photo-file').value = '';
        document.getElementById('edit-photo-preview').innerHTML = student.photo && typeof student.photo === 'string' && student.photo.startsWith('data:image') 
          ? `<img src="${escapeHTML(student.photo)}" style="width:100%;height:100%;object-fit:cover;">`
          : Icons['camera'](20);

        editModal.style.display = 'flex';
      });
    });

    const editPhotoInput = document.getElementById('edit-photo-file');
    if (editPhotoInput) {
      editPhotoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const compressedDataUrl = await compressImage(file, 250, 250, 0.7);
            document.getElementById('edit-photo-preview').innerHTML = `<img src="${compressedDataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            controller.editPhotoData = compressedDataUrl;
          } catch (err) {
            console.error('Failed to compress image:', err);
            controller.view.showToast('Failed to process image.', 'error');
          }
        }
      });
    }

    const btnSaveEdit = document.getElementById('btn-save-edit');
    if (btnSaveEdit) {
      btnSaveEdit.addEventListener('click', async () => {
        const id = document.getElementById('edit-id').value;
        const name = document.getElementById('edit-name').value.trim();
        const studid = document.getElementById('edit-studid').value.trim();
        const grade = document.getElementById('edit-grade').value;

        if (!name || !studid || !grade) {
          controller.view.showToast('Name, Student ID, and Grade are required.', 'error');
          return;
        }

        const updatedStudent = {
          id,
          name,
          studid,
          grade,
          section: '',
          fullSection: grade,
          preferredGate: document.getElementById('edit-gate').value,
          arrangements: document.getElementById('edit-arrangements').value,
          vehicleDetails: document.getElementById('edit-vehicle').value,
          parentName: document.getElementById('edit-parent-name').value.trim(),
          parentEmail: document.getElementById('edit-parent-email').value.trim(),
          phone: document.getElementById('edit-parent-phone').value.trim(),
          address: ''
        };

        if (controller.editPhotoData) {
          updatedStudent.photo = controller.editPhotoData;
        }

        btnSaveEdit.innerHTML = 'Saving...';
        btnSaveEdit.disabled = true;

        await controller.model.updateStudent(updatedStudent);
        controller.view.showToast('Student details updated successfully');
        editModal.style.display = 'none';
        btnSaveEdit.innerHTML = `${Icons['check-circle'](14)} Save Changes`;
        btnSaveEdit.disabled = false;
        controller.navigateToPage('students');
      });
    }

    // ── Grade Filter Pills ──────────────────────────────────
    document.querySelectorAll('.grade-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        // Update active pill
        document.querySelectorAll('.grade-pill').forEach(p => {
          p.classList.remove('active');
          p.style.fontWeight = '500';
          p.style.border = '1px solid var(--border)';
          p.style.background = 'var(--bg-card)';
          p.style.color = 'var(--text2)';
        });
        pill.classList.add('active');
        pill.style.fontWeight = '700';
        pill.style.border = '1px solid var(--primary)';
        pill.style.background = 'var(--primary-soft)';
        pill.style.color = 'var(--primary)';

        const grade = pill.dataset.grade;
        document.querySelectorAll('#students-table tbody tr').forEach(row => {
          if (row.querySelector('.empty')) return;
          if (grade === 'All') {
            row.style.display = '';
          } else {
            row.style.display = row.dataset.grade === grade ? '' : 'none';
          }
        });
      });
    });

    // ── Status Tabs (Active / Archived) ─────────────────────
    document.querySelectorAll('.student-status-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.student-status-tab').forEach(t => {
          t.classList.remove('active');
          t.style.background = 'transparent';
          t.style.color = 'var(--text3)';
          t.style.border = '1px solid transparent';
          t.style.fontWeight = '500';
        });
        tab.classList.add('active');
        tab.style.background = 'var(--bg-card)';
        tab.style.color = 'var(--primary)';
        tab.style.border = '1px solid var(--border)';
        tab.style.borderBottom = 'none';
        tab.style.fontWeight = '600';

        const status = tab.dataset.status;
        const filtered = controller.model.students.filter(s => s.status === status);
        const tbody = document.querySelector('#students-table tbody');
        if (tbody) {
          import('../views/StudentsView.js').then(module => {
            tbody.innerHTML = module.default.renderTableRows(filtered, controller.model);
            // Re-bind action buttons for the newly rendered rows
            StudentsController.bind(controller);
          });
        }
      });
    });

    StudentsController.bindIdCard(controller);
    StudentsController.bindCSVImport(controller);
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
          ? `<img src="${escapeHTML(student.photo)}" style="width:100%;height:100%;object-fit:cover;">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:#422467;">${escapeHTML(student.name.substring(0,2).toUpperCase())}</div>`;
        target.innerHTML = `
          <div id="idcard-capture" style="width:300px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);font-family:'Segoe UI',sans-serif;">
            <div style="background:#422467;padding:14px 16px;display:flex;align-items:center;gap:10px;color:#fff;">
              <div style="width:36px;height:36px;background:#fff;border-radius:6px;padding:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><img src="SISC_logo.png" style="width:100%;height:100%;object-fit:contain;" alt="SISC" onerror="this.style.display='none'"></div>
              <div>
                <div style="font-size:12px;font-weight:800;letter-spacing:0.5px;line-height:1.2;">SOUTHVILLE INTERNATIONAL</div>
                <div style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.65);margin-top:2px;line-height:1.3;">1281 Tropical Ave Cor. Luxembourg St.<br>BF International, Las Piñas City</div>
              </div>
            </div>
            <div style="text-align:center;padding:10px 0 8px;"><div style="font-size:10px;color:#00c9b1;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Permanent Gate Pass</div></div>
            <div style="display:flex;gap:14px;align-items:center;padding:0 20px 14px;">
              <div style="width:80px;height:80px;border-radius:10px;border:3px solid #00c9b1;overflow:hidden;background:#f0ebf7;flex-shrink:0;">${photoHtml}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:18px;font-weight:800;color:#1f2937;line-height:1.15;margin-bottom:4px;">${escapeHTML(student.name)}</div>
                <div style="font-size:11px;color:#6b7280;font-weight:600;margin-bottom:2px;">ID: <span style="color:#422467;font-weight:700;">${escapeHTML(student.studid || student.id)}</span></div>
                <div style="font-size:11px;color:#6b7280;font-weight:600;">${escapeHTML(student.grade)}${student.section ? ' - ' + escapeHTML(student.section) : ''}</div>
              </div>
            </div>
            <div style="padding:0 20px;margin-bottom:8px;"><div style="background:#FDE047;border-radius:6px;padding:8px 10px;text-align:center;border:1px solid #facc15;"><div style="font-size:11px;font-weight:700;color:#1f2937;line-height:1.3;">${escapeHTML(student.arrangements || 'No arrangement specified')}</div></div></div>
            <div style="padding:0 20px;margin-bottom:16px;"><div style="background:#f3f4f6;border-radius:6px;padding:7px 10px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:9px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:0.5px;">Exit Gate</div><div style="font-size:11px;font-weight:700;color:#422467;">${escapeHTML(student.preferredGate || 'Any authorized gate')}</div></div></div>
            <div style="background:#f5f4f8;border-radius:8px;padding:14px;margin:0 20px 16px;display:flex;flex-direction:column;align-items:center;">
              <div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:8px;letter-spacing:1px;">Scan to Verify</div>
              <div id="idcard-qrcode"></div>
              <div style="font-size:12px;font-weight:700;font-family:monospace;color:#422467;margin-top:8px;letter-spacing:1.5px;">${escapeHTML(student.pgp)}</div>
            </div>
            <div style="background:#00c9b1;padding:10px;text-align:center;color:#003d35;font-size:10px;font-weight:700;">A.Y. 2026-2027 · VALID UNTIL JULY 2027</div>
          </div>`;
        setTimeout(() => {
          new QRCode(document.getElementById('idcard-qrcode'), { text: student.pgp || student.studid || student.id || 'N/A', width: 120, height: 120, colorDark: "#1f2937", colorLight: "#f5f4f8" });
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
          btnDownload.innerHTML = `${Icons['download'](14)} Download Image`;
          btnDownload.disabled = false;
        }).catch(err => {
          console.error('Failed to generate ID card image:', err);
          btnDownload.innerHTML = `${Icons['download'](14)} Download Image`;
          btnDownload.disabled = false;
        });
      });
    }
  }

  static bindCSVImport(controller) {
    const btnImport = document.getElementById('btn-import-csv');
    const modal = document.getElementById('modal-csv-import');
    const btnClose = document.getElementById('btn-close-csv');
    const btnCancel = document.getElementById('btn-cancel-csv');
    const btnSubmit = document.getElementById('btn-submit-csv');
    const fileInput = document.getElementById('csv-file-input');
    const previewArea = document.getElementById('csv-preview');

    if (btnImport && modal) btnImport.addEventListener('click', () => {
      modal.style.display = 'flex';
      if (previewArea) previewArea.innerHTML = '';
      if (fileInput) fileInput.value = '';
    });
    if (btnClose && modal) btnClose.addEventListener('click', () => modal.style.display = 'none');
    if (btnCancel && modal) btnCancel.addEventListener('click', (e) => { e.preventDefault(); modal.style.display = 'none'; });

    // CSV Preview on file select
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target.result;
          const rows = StudentsController.parseCSV(text);
          if (rows.length <= 1) {
            previewArea.innerHTML = '<div style="color:var(--red);padding:12px;">CSV file is empty or has no data rows.</div>';
            return;
          }
          const headers = rows[0];
          const dataRows = rows.slice(1);
          // Validate required headers
          const requiredHeaders = ['name', 'studid', 'grade'];
          const lowerHeaders = headers.map(h => h.toLowerCase().trim());
          const missing = requiredHeaders.filter(h => !lowerHeaders.includes(h));
          if (missing.length > 0) {
            previewArea.innerHTML = `<div style="color:var(--red);padding:12px;">Missing required columns: <strong>${missing.join(', ')}</strong></div>`;
            return;
          }

          previewArea.innerHTML = `
            <div style="color:var(--green);padding:8px 12px;font-size:12px;font-weight:600;background:var(--green-s);border-radius:var(--radius-sm);margin-bottom:8px;">
              ✓ ${dataRows.length} student(s) found. Preview below:
            </div>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">
              <table style="width:100%;font-size:11px;">
                <thead><tr>${headers.map(h => `<th style="padding:6px 8px;text-align:left;background:var(--bg-elevated);">${h}</th>`).join('')}</tr></thead>
                <tbody>${dataRows.slice(0, 10).map(row => `<tr>${row.map(cell => `<td style="padding:4px 8px;border-top:1px solid var(--border);">${cell}</td>`).join('')}</tr>`).join('')}
                ${dataRows.length > 10 ? `<tr><td colspan="${headers.length}" style="padding:6px 8px;text-align:center;color:var(--text3);font-style:italic;">...and ${dataRows.length - 10} more</td></tr>` : ''}
                </tbody>
              </table>
            </div>`;
        };
        reader.readAsText(file);
      });
    }

    // Submit CSV
    if (btnSubmit) {
      btnSubmit.addEventListener('click', async () => {
        if (!fileInput || !fileInput.files[0]) {
          controller.view.showToast('Please select a CSV file first', 'error');
          return;
        }
        const file = fileInput.files[0];
        const text = await file.text();
        const rows = StudentsController.parseCSV(text);
        if (rows.length <= 1) {
          controller.view.showToast('CSV file has no data rows', 'error');
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const dataRows = rows.slice(1);

        const nameIdx = headers.indexOf('name');
        const studidIdx = headers.indexOf('studid');
        const gradeIdx = headers.indexOf('grade');
        const sectionIdx = headers.indexOf('section');
        const parentNameIdx = headers.indexOf('parentname');
        const parentEmailIdx = headers.indexOf('parentemail');
        const phoneIdx = headers.indexOf('phone');

        let imported = 0;
        let skipped = 0;

        for (const row of dataRows) {
          const name = row[nameIdx]?.trim();
          const studid = row[studidIdx]?.trim();
          const grade = row[gradeIdx]?.trim();

          if (!name || !studid || !grade) { skipped++; continue; }

          // Check duplicate
          const exists = controller.model.students.find(s => s.studid === studid);
          if (exists) { skipped++; continue; }

          const newStudent = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6),
            name,
            studid,
            grade,
            section: sectionIdx >= 0 ? (row[sectionIdx]?.trim() || '') : '',
            parentName: parentNameIdx >= 0 ? (row[parentNameIdx]?.trim() || '') : '',
            parentEmail: parentEmailIdx >= 0 ? (row[parentEmailIdx]?.trim() || '') : '',
            phone: phoneIdx >= 0 ? (row[phoneIdx]?.trim() || '') : '',
            photo: '',
            pgp: 'PGP-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            status: 'active'
          };
          await controller.model.addStudent(newStudent);
          imported++;
        }

        modal.style.display = 'none';
        controller.view.showToast(`Imported ${imported} student(s). ${skipped > 0 ? `${skipped} skipped (duplicate or incomplete).` : ''}`);
        controller.navigateToPage('students');
      });
    }
  }

  static parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    return lines.map(line => {
      const result = [];
      let inQuotes = false;
      let current = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
          if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
          } else if (char === '"') {
            inQuotes = false;
          } else {
            current += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            result.push(current);
            current = '';
          } else {
            current += char;
          }
        }
      }
      result.push(current);
      return result;
    });
  }
}
