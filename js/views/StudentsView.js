import Icons from '../icons.js';
import { escapeHTML, resolvePhotoUrl, hasPhoto } from '../utils.js';

export default class StudentsView {
  static render(model) {
    const students = model.students || [];
    const grades = ['All', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const activeCount = students.filter(s => s.status === 'active').length;
    const archivedCount = students.filter(s => s.status === 'archived').length;
    const withPhotosCount = students.filter(s => hasPhoto(s.photo)).length;
    const withoutPGPCount = students.filter(s => !s.pgp).length;

    return `
      <div class="kpi-strip">
        <div class="kpi-card kpi-green">
          <div class="kpi-icon">${Icons['users'](20)}</div>
          <div class="kpi-info"><div class="kpi-val">${activeCount}</div><div class="kpi-lbl">Total Active</div></div>
        </div>
        <div class="kpi-card kpi-orange">
          <div class="kpi-icon">${Icons['archive'](20)}</div>
          <div class="kpi-info"><div class="kpi-val">${archivedCount}</div><div class="kpi-lbl">Archived</div></div>
        </div>
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon">${Icons['camera'](20)}</div>
          <div class="kpi-info"><div class="kpi-val">${withPhotosCount}</div><div class="kpi-lbl">With Photos</div></div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-icon">${Icons['alert-triangle'](20)}</div>
          <div class="kpi-info"><div class="kpi-val">${withoutPGPCount}</div><div class="kpi-lbl">Without PGP</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Student Registry</div>
            <div class="card-sub">${activeCount} active · ${archivedCount} archived</div>
          </div>
          ${model.currentUser && model.currentUser.role !== 'guard' ? `
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" id="btn-export-ids">
              ${Icons['download'](14)} Export All IDs
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-import-csv">
              ${Icons['file-text'](14)} Import CSV
            </button>
            <button class="btn btn-primary btn-sm" id="btn-add-student">
              ${Icons['plus'](14)} Enroll Student
            </button>
          </div>
          ` : ''}
        </div>
        
        <!-- Status Tabs -->
        <div style="display: flex; border-bottom: 1px solid var(--border); padding: 0 16px; gap: 4px;">
          <button class="pill student-status-tab active" data-status="active" style="border-radius: 8px 8px 0 0; padding: 8px 16px; font-weight: 600; font-size: 12px; border: 1px solid var(--border); border-bottom: none; background: var(--bg-card); color: var(--primary);">Active Students</button>
          <button class="pill student-status-tab" data-status="archived" style="border-radius: 8px 8px 0 0; padding: 8px 16px; font-weight: 500; font-size: 12px; border: 1px solid transparent; color: var(--text3); background: transparent;">Archived Students</button>
        </div>

        <!-- Filter Bar: Search + Grade Pills -->
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg-elevated); display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <div class="form-group" style="max-width: 240px; margin: 0; flex-shrink: 0;">
            <input type="text" id="students-search" class="form-input" placeholder="Search by name or ID...">
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="grade-filters">
            ${grades.map((g, i) => `
              <button class="pill grade-pill ${i === 0 ? 'active' : ''}" data-grade="${g}" style="padding: 4px 12px; font-size: 11px; font-weight: ${i === 0 ? '700' : '500'}; border: 1px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}; background: ${i === 0 ? 'var(--primary-soft)' : 'var(--bg-card)'}; color: ${i === 0 ? 'var(--primary)' : 'var(--text2)'}; border-radius: 20px; cursor: pointer;">
                ${g === 'All' ? 'All Grades' : g}
              </button>
            `).join('')}
          </div>
          <div style="margin-left: auto; display: flex; gap: 4px; background: var(--bg-card); padding: 2px; border-radius: 6px; border: 1px solid var(--border);">
            <button id="view-toggle-table" class="view-toggle active" style="padding: 6px; border-radius: 4px; border: none; background: var(--primary-soft); color: var(--primary); cursor: pointer;" title="Table View">
              ${Icons['list'](16)}
            </button>
            <button id="view-toggle-card" class="view-toggle" style="padding: 6px; border-radius: 4px; border: none; background: transparent; color: var(--text3); cursor: pointer;" title="Card View">
              ${Icons['layout-grid'](16)}
            </button>
          </div>
        </div>

        <div class="tbl-wrap" id="students-table-container">
          <table id="students-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade Level</th>
                <th>Guardian</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderTableRows(students.filter(s => s.status === 'active'), model)}
            </tbody>
          </table>
        </div>
        <div id="students-grid-container" style="display: none; padding: 16px;">
          <div id="students-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${this.renderCardView(students.filter(s => s.status === 'active'), model)}
          </div>
        </div>
        
        <!-- Pagination Footer -->
        <div id="students-pagination" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg-card); border-radius: 0 0 var(--radius) var(--radius);">
          <div style="font-size: 12px; color: var(--text2);" id="pagination-info">Loading...</div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" id="btn-page-prev" disabled>Previous</button>
            <button class="btn btn-ghost btn-sm" id="btn-page-next" disabled>Next</button>
          </div>
        </div>
      </div>

      <!-- Add Student Wizard Modal -->
      <div id="modal-wizard" class="overlay" style="display: none;">
        <div class="modal modal-lg">
          <div class="modal-head">
            <div class="modal-title">Enroll New Student</div>
            <button class="close-btn" id="btn-close-wizard">${Icons['x-close'](14)}</button>
          </div>
          <div class="modal-body" style="padding: 0;">
            <!-- Wizard Progress Header -->
            <div style="display: flex; background: var(--bg-elevated); padding: 16px 20px; border-bottom: 1px solid var(--border);">
              ${[
                { num: 1, label: 'Identity' },
                { num: 2, label: 'Academic' },
                { num: 3, label: 'Guardian' },
                { num: 4, label: 'Review' }
              ].map((step, idx) => `
                <div class="wizard-step" id="step-ind-${step.num}" style="flex: 1; text-align: center; color: ${idx === 0 ? 'var(--primary)' : 'var(--text3)'}; font-weight: ${idx === 0 ? '700' : '500'};">
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: ${idx === 0 ? 'var(--primary)' : 'var(--bg-card)'}; color: ${idx === 0 ? '#fff' : 'inherit'}; border: 1px solid ${idx === 0 ? 'var(--primary)' : 'var(--border2)'}; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 11px;">
                    ${step.num}
                  </div>
                  <div style="font-size: 11px;">${step.label}</div>
                </div>
              `).join('')}
            </div>

            <!-- Form Content -->
            <form id="form-enroll" style="padding: 24px;">
              
              <!-- Step 1: Identity -->
              <div class="wizard-panel" id="panel-step-1" style="display: block;">
                <div class="form-grid mb-12">
                  <div class="form-group required">
                    <label for="w-name">Full Name</label>
                    <input type="text" id="w-name" class="form-input" required placeholder="Lastname, Firstname" maxlength="100">
                    <div class="form-error" id="err-w-name"></div>
                  </div>
                  <div class="form-group required">
                    <label for="w-studid">Student ID</label>
                    <input type="text" id="w-studid" class="form-input" required placeholder="e.g. 23-1234" maxlength="20">
                    <div class="form-error" id="err-w-studid"></div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Photo (Upload or Camera)</label>
                  <div style="display: flex; gap: 10px; align-items: flex-end;">
                    <div id="w-photo-preview" style="width: 80px; height: 80px; border-radius: 8px; background: var(--bg-elevated); border: 1px dashed var(--border2); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                      ${Icons['camera'](24)}
                    </div>
                    <input type="file" id="w-photo-file" accept="image/*" class="form-input" style="flex: 1;">
                  </div>
                </div>
              </div>

              <!-- Step 2: Academic & Exit -->
              <div class="wizard-panel" id="panel-step-2" style="display: none;">
                <div class="form-grid mb-12">
                  <div class="form-group required">
                    <label for="w-grade">Grade Level</label>
                    <select id="w-grade" class="form-input" required>
                      <option value="">Select Grade</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                    <div class="form-error" id="err-w-grade"></div>
                  </div>
                  <div class="form-group">
                    <label>Preferred Gate</label>
                    <select id="w-gate" class="form-input">
                      <option value="">Select Gate...</option>
                      <option value="Gate 1">Gate 1</option>
                      <option value="Gate 2">Gate 2</option>
                      <option value="College Gate">College Gate</option>
                      <option value="Gate 1 and Gate 2">Gate 1 and Gate 2</option>
                      <option value="Gate 2 and College Gate">Gate 2 and College Gate</option>
                      <option value="College Gate and Gate 1">College Gate and Gate 1</option>
                      <option value="All Gates">All Gates</option>
                      <option value="Any authorized gate">Any authorized gate</option>
                    </select>
                  </div>
                </div>
                <div class="form-group mb-12">
                  <label>Arrangements</label>
                  <select id="w-arrangements" class="form-input">
                    <option value="">Select Arrangement...</option>
                    <option value="Will go home by herself/himself">Will go home by herself/himself</option>
                    <option value="Will ride with parents/authorized fetchers">Will ride with parents/authorized fetchers</option>
                    <option value="Will ride the school bus">Will ride the school bus</option>
                    <option value="Will drive own car (Grades 11-12 only)">Will drive own car (Grades 11-12 only)</option>
                    <option value="Will ride the Academy Car">Will ride the Academy Car</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Vehicle Details (Make, Model, Color, Plate)</label>
                  <input type="text" id="w-vehicle" class="form-input" placeholder="e.g. Red Toyota Vios ABC-123">
                </div>
              </div>

              <!-- Step 3: Guardian -->
              <div class="wizard-panel" id="panel-step-3" style="display: none;">
                <div class="form-group required mb-12">
                  <label for="w-parent-name">Guardian Name</label>
                  <input type="text" id="w-parent-name" class="form-input" required placeholder="Mr. / Mrs. Name" maxlength="100">
                  <div class="form-error" id="err-w-parent-name"></div>
                </div>
                <div class="form-grid">
                  <div class="form-group required">
                    <label for="w-parent-email">Guardian Email</label>
                    <input type="email" id="w-parent-email" class="form-input" required placeholder="Used for exit alerts">
                    <div class="form-error" id="err-w-parent-email"></div>
                  </div>
                  <div class="form-group">
                    <label for="w-parent-phone">Mobile Number (Optional)</label>
                    <input type="text" id="w-parent-phone" class="form-input" placeholder="09XX XXX XXXX" maxlength="13">
                    <div class="form-error" id="err-w-parent-phone"></div>
                  </div>
                </div>
              </div>

              <!-- Step 4: Review -->
              <div class="wizard-panel" id="panel-step-4" style="display: none;">
                <div style="background: var(--bg-elevated); border-radius: var(--radius-sm); padding: 16px; border: 1px solid var(--border);">
                  <h4 style="margin-bottom: 12px; color: var(--primary);">Summary</h4>
                  <div class="grid-2" style="font-size: 13px;">
                    <div><strong>Name:</strong> <span id="r-name"></span></div>
                    <div><strong>ID:</strong> <span id="r-studid"></span></div>
                    <div><strong>Grade:</strong> <span id="r-grade"></span></div>
                    <div><strong>Gate:</strong> <span id="r-gate"></span></div>
                    <div style="grid-column: 1 / -1;"><strong>Arrangement:</strong> <span id="r-arrangements"></span></div>
                    <div style="grid-column: 1 / -1;"><strong>Vehicle:</strong> <span id="r-vehicle"></span></div>
                    <div style="grid-column: 1 / -1; margin-top:8px;"><strong>Guardian:</strong> <span id="r-guardian"></span></div>
                    <div style="grid-column: 1 / -1;"><strong>Email:</strong> <span id="r-email"></span></div>
                  </div>
                </div>
                <div class="alert alert-success" style="margin-top: 16px; background: var(--green-s); color: var(--green); padding: 12px; border-radius: var(--radius-sm); font-size: 12px;">
                  All details look correct. Click <strong>Generate Pass</strong> to enroll student and create their PGP.
                </div>
              </div>

            </form>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" id="btn-wizard-prev" style="display: none;">← Back</button>
            <button class="btn btn-primary" id="btn-wizard-next">Next Step →</button>
            <button class="btn btn-accent" id="btn-wizard-submit" style="display: none;">Generate Pass ✓</button>
          </div>
        </div>
      </div>
      
      <!-- CSV Import Modal -->
      <div id="modal-csv-import" class="overlay" style="display: none;">
        <div class="modal modal-lg">
          <div class="modal-head">
            <div class="modal-title">Import Students from CSV</div>
            <button class="close-btn" id="btn-close-csv">${Icons['x-close'](14)}</button>
          </div>
          <div class="modal-body">
            <div style="background: var(--blue-s); border-left: 3px solid var(--blue); padding: 12px 16px; border-radius: var(--radius-sm); display: flex; gap: 12px; margin-bottom: 20px;">
              <div style="color: var(--blue);">${Icons['info'](20)}</div>
              <div>
                <div style="font-weight: 700; font-size: 13px; color: var(--blue);">CSV Format Guide</div>
                <div style="font-size: 11.5px; color: var(--text2); margin-top: 2px;">
                  Required columns: <strong>name, studid, grade</strong><br>
                  Optional columns: <strong>section, parentname, parentemail, phone</strong><br>
                  First row must be headers. Duplicate Student IDs will be skipped.
                </div>
              </div>
            </div>

            <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:16px;font-family:monospace;font-size:11px;color:var(--text2);overflow-x:auto;">
              name,studid,grade,section,parentname,parentemail,phone<br>
              "Dela Cruz, Juan",23-1001,Grade 7,Diligence,Maria Dela Cruz,maria@email.com,09171234567
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label>Upload CSV File</label>
              <input type="file" id="csv-file-input" accept=".csv" class="form-input">
            </div>
            
            <div id="csv-preview"></div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" id="btn-cancel-csv">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-submit-csv">${Icons['plus'](14)} Import Students</button>
          </div>
        </div>
      </div>

      <!-- Virtual ID Card Modal -->
      <div id="modal-idcard" class="overlay" style="display: none;">
        <div class="modal" style="width: 360px;">
          <div class="modal-head">
            <div class="modal-title">Virtual ID Card</div>
            <button class="close-btn" id="btn-close-idcard">${Icons['x-close'](14)}</button>
          </div>
          <div class="modal-body" style="background: #f5f4f8;">
             <div id="idcard-render-target"></div>
          </div>
          <div class="modal-foot" style="justify-content: center;">
            <button class="btn btn-primary" id="btn-download-id">
              ${Icons['download'](14)} Download Image
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Student Modal -->
      <div id="modal-edit-student" class="overlay" style="display: none;">
        <div class="modal modal-lg">
          <div class="modal-head">
            <div class="modal-title">${Icons['edit'](16)} Edit Student Details</div>
            <button class="close-btn" id="btn-close-edit">${Icons['x-close'](14)}</button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            <form id="form-edit-student">
              <input type="hidden" id="edit-id">
              
              <div style="font-weight: 700; font-size: 13px; color: var(--primary); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">Identity</div>
              <div class="form-grid mb-12">
                <div class="form-group required">
                  <label for="edit-name">Full Name</label>
                  <input type="text" id="edit-name" class="form-input" required maxlength="100">
                  <div class="form-error" id="err-edit-name"></div>
                </div>
                <div class="form-group required">
                  <label for="edit-studid">Student ID</label>
                  <input type="text" id="edit-studid" class="form-input" required maxlength="20">
                  <div class="form-error" id="err-edit-studid"></div>
                </div>
              </div>
              <div class="form-group mb-12">
                <label>Update Photo</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <div id="edit-photo-preview" style="width: 50px; height: 50px; border-radius: 8px; background: var(--bg-elevated); border: 1px dashed var(--border2); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    ${Icons['camera'](20)}
                  </div>
                  <input type="file" id="edit-photo-file" accept="image/*" class="form-input" style="flex: 1; padding: 6px;">
                </div>
              </div>

              <div style="font-weight: 700; font-size: 13px; color: var(--primary); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">Academic & Exit</div>
              <div class="form-grid mb-12">
                <div class="form-group required">
                  <label for="edit-grade">Grade Level</label>
                  <select id="edit-grade" class="form-input" required>
                    <option value="">Select Grade</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                  <div class="form-error" id="err-edit-grade"></div>
                </div>
                <div class="form-group">
                  <label>Preferred Gate</label>
                  <select id="edit-gate" class="form-input">
                    <option value="">Select Gate...</option>
                    <option value="Gate 1">Gate 1</option>
                    <option value="Gate 2">Gate 2</option>
                    <option value="College Gate">College Gate</option>
                    <option value="Gate 1 and Gate 2">Gate 1 and Gate 2</option>
                    <option value="Gate 2 and College Gate">Gate 2 and College Gate</option>
                    <option value="College Gate and Gate 1">College Gate and Gate 1</option>
                    <option value="All Gates">All Gates</option>
                    <option value="Any authorized gate">Any authorized gate</option>
                  </select>
                </div>
              </div>
              <div class="form-grid mb-12">
                <div class="form-group">
                  <label>Arrangements</label>
                  <select id="edit-arrangements" class="form-input">
                    <option value="">Select Arrangement...</option>
                    <option value="Will go home by herself/himself">Will go home by herself/himself</option>
                    <option value="Will ride with parents/authorized fetchers">Will ride with parents/authorized fetchers</option>
                    <option value="Will ride the school bus">Will ride the school bus</option>
                    <option value="Will drive own car (Grades 11-12 only)">Will drive own car (Grades 11-12 only)</option>
                    <option value="Will ride the Academy Car">Will ride the Academy Car</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Vehicle Details</label>
                  <input type="text" id="edit-vehicle" class="form-input" placeholder="e.g. Red Toyota Vios ABC-123">
                </div>
              </div>

              <div style="font-weight: 700; font-size: 13px; color: var(--primary); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">Guardian</div>
              <div class="form-grid mb-12">
                <div class="form-group required">
                  <label for="edit-parent-name">Guardian Name</label>
                  <input type="text" id="edit-parent-name" class="form-input" required maxlength="100">
                  <div class="form-error" id="err-edit-parent-name"></div>
                </div>
                <div class="form-group required">
                  <label for="edit-parent-email">Guardian Email</label>
                  <input type="email" id="edit-parent-email" class="form-input" required>
                  <div class="form-error" id="err-edit-parent-email"></div>
                </div>
              </div>
              <div class="form-group">
                <label for="edit-parent-phone">Mobile Number</label>
                <input type="text" id="edit-parent-phone" class="form-input" placeholder="09XX XXX XXXX" maxlength="13">
                <div class="form-error" id="err-edit-parent-phone"></div>
              </div>
            </form>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" id="btn-cancel-edit">Cancel</button>
            <button class="btn btn-primary" id="btn-save-edit">${Icons['check-circle'](14)} Save Changes</button>
          </div>
        </div>
      </div>
    `;
  }

  static renderTableRows(students, model) {
    if (!students || students.length === 0) {
      return `<tr><td colspan="5" class="empty">
        <div class="empty-state">
          ${Icons['users'](48)}
          <div class="empty-state-title">No Students Found</div>
          <div class="empty-state-sub">There are no students matching the current filters or no students have been enrolled yet.</div>
        </div>
      </td></tr>`;
    }

    const isGuard = model && model.currentUser && model.currentUser.role === 'guard';

    return students.map(s => {
      const isActive = s.status === 'active';
      const isArchived = s.status === 'archived';
      const statusBadge = isActive ? 'b-active' : (isArchived ? 'b-pending' : 'b-denied');
      const statusLabel = isActive ? 'Active PGP' : (isArchived ? 'Archived' : escapeHTML(s.status));

      return `
        <tr data-grade="${escapeHTML(s.grade || '')}">
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--primary); font-weight: 700; font-size: 11px;">
                ${hasPhoto(s.photo) ? `<img src="${escapeHTML(resolvePhotoUrl(s.photo))}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML((s.name || 'U').substring(0, 2).toUpperCase())}
              </div>
              <div>
                <div style="font-weight: 600;">${escapeHTML(s.name)}</div>
                <div style="font-size: 11px; color: var(--text3);">${escapeHTML(s.studid || s.id)}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHTML(s.grade || '—')}</div>
            <div style="font-size: 11px; color: var(--text3);">${escapeHTML(s.preferredGate || '—')}</div>
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHTML(s.parentName || '—')}</div>
            <div style="font-size: 11px; color: var(--text3);">${escapeHTML(s.parentEmail || '—')}</div>
          </td>
          <td>
            <span class="badge ${statusBadge}">${statusLabel}</span>
          </td>
          <td>
            <div class="flex gap-4">
              <button class="btn btn-ghost btn-sm btn-view-id" data-id="${s.id}" data-tooltip="View ID Card">
                ${Icons['eye'](14)}
              </button>
              ${!isGuard ? `
              <button class="btn btn-ghost btn-sm btn-edit-student" data-id="${s.id}" data-tooltip="Edit Student" style="color: var(--primary);">
                ${Icons['edit'](14)}
              </button>
              ${isActive ? `
              <button class="btn btn-ghost btn-sm btn-archive-student" data-id="${s.id}" data-tooltip="Archive Student" style="color: var(--orange);">
                ${Icons['archive'](14)}
              </button>` : ''}
              ${isArchived ? `
              <button class="btn btn-ghost btn-sm btn-restore-student" data-id="${s.id}" data-tooltip="Restore Student" style="color: var(--green);">
                ${Icons['check-circle'](14)}
              </button>` : ''}
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  static renderCardView(students, model) {
    if (!students || students.length === 0) {
      return `<div style="grid-column: 1 / -1;" class="empty">
        <div class="empty-state">
          ${Icons['users'](48)}
          <div class="empty-state-title">No Students Found</div>
          <div class="empty-state-sub">There are no students matching the current filters or no students have been enrolled yet.</div>
        </div>
      </div>`;
    }

    const isGuard = model && model.currentUser && model.currentUser.role === 'guard';

    return students.map(s => {
      const isActive = s.status === 'active';
      const isArchived = s.status === 'archived';
      const statusBadge = isActive ? 'b-active' : (isArchived ? 'b-pending' : 'b-denied');
      const statusLabel = isActive ? 'Active PGP' : (isArchived ? 'Archived' : escapeHTML(s.status));

      return `
        <div class="student-card" data-grade="${escapeHTML(s.grade || '')}" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
          <!-- Header: Photo + Info -->
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--primary); font-weight: 700; font-size: 16px; flex-shrink: 0;">
              ${hasPhoto(s.photo) ? `<img src="${escapeHTML(resolvePhotoUrl(s.photo))}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML((s.name || 'U').substring(0, 2).toUpperCase())}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 15px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(s.name)}</div>
              <div style="font-size: 12px; color: var(--text3); margin-top: 2px;">${escapeHTML(s.studid || s.id)}</div>
              <div style="margin-top: 6px;"><span class="badge ${statusBadge}">${statusLabel}</span></div>
            </div>
          </div>
          
          <!-- Details -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; background: var(--bg-body); padding: 10px; border-radius: 8px;">
            <div>
              <div style="color: var(--text3); margin-bottom: 2px; font-weight: 500;">Grade Level</div>
              <div style="font-weight: 600; color: var(--text);">${escapeHTML(s.grade || '—')}</div>
            </div>
            <div>
              <div style="color: var(--text3); margin-bottom: 2px; font-weight: 500;">Gate</div>
              <div style="font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(s.preferredGate || '—')}</div>
            </div>
            <div style="grid-column: 1 / -1;">
              <div style="color: var(--text3); margin-bottom: 2px; font-weight: 500;">Guardian</div>
              <div style="font-weight: 600; color: var(--text); display: flex; justify-content: space-between;">
                <span>${escapeHTML(s.parentName || '—')}</span>
                <span style="color: var(--primary); font-weight: 500;">${escapeHTML(s.parentEmail || '')}</span>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: auto; border-top: 1px solid var(--border); padding-top: 12px;">
            <button class="btn btn-ghost btn-sm btn-view-id" data-id="${s.id}" data-tooltip="View ID Card" style="flex: 1; justify-content: center; background: var(--bg-body);">
              ${Icons['eye'](14)} View ID
            </button>
            ${!isGuard ? `
            <button class="btn btn-ghost btn-sm btn-edit-student" data-id="${s.id}" data-tooltip="Edit Student" style="color: var(--primary); background: var(--primary-soft);">
              ${Icons['edit'](14)}
            </button>
            ${isActive ? `
            <button class="btn btn-ghost btn-sm btn-archive-student" data-id="${s.id}" data-tooltip="Archive Student" style="color: var(--orange); background: rgba(245, 158, 11, 0.1);">
              ${Icons['archive'](14)}
            </button>` : ''}
            ${isArchived ? `
            <button class="btn btn-ghost btn-sm btn-restore-student" data-id="${s.id}" data-tooltip="Restore Student" style="color: var(--green); background: rgba(16, 185, 129, 0.1);">
              ${Icons['check-circle'](14)}
            </button>` : ''}
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}
