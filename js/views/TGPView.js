import Icons from '../icons.js';
import { escapeHTML } from '../utils.js';

export default class TGPView {
  static render(model) {
    const tgps = model.tgp || [];
    
    // Sort so most recent is first
    const sortedTgps = [...tgps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Temporary Gate Passes (TGP)</div>
            <div class="card-sub">Single-day exit passes for active students</div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-tgp">
            ${Icons['plus'](14)} New TGP
          </button>
        </div>

        <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--bg-elevated); display: flex; gap: 8px;">
           <button class="pill on" data-filter="all">All</button>
           <button class="pill" data-filter="pending">Pending Approval</button>
           <button class="pill" data-filter="approved">Approved</button>
           <button class="pill" data-filter="rejected">Rejected</button>
        </div>

        <div class="tbl-wrap">
          <table id="tgp-table">
            <thead>
              <tr>
                <th>TGP No.</th>
                <th>Valid Date</th>
                <th>Student</th>
                <th>Gate / Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderTableRows(sortedTgps, model)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- New TGP Modal -->
      <div id="modal-tgp" class="overlay" style="display: none;">
        <div class="modal">
          <div class="modal-head">
            <div class="modal-title">Create Temporary Gate Pass</div>
            <button class="close-btn" id="btn-close-tgp">${Icons['x-close'](14)}</button>
          </div>
          <div class="modal-body">
            
            <!-- Info Banner -->
            <div style="background: var(--blue-s); border-left: 3px solid var(--blue); padding: 12px 16px; border-radius: var(--radius-sm); display: flex; gap: 12px; margin-bottom: 20px;">
              <div style="color: var(--blue);">${Icons['info'](20)}</div>
              <div>
                <div style="font-weight: 700; font-size: 13px; color: var(--blue);">TGP Workflow</div>
                <div style="font-size: 11.5px; color: var(--text2); margin-top: 2px;">Temporary passes are valid for ONE day only. They require Secretary or Head approval before they can be scanned at the gate.</div>
              </div>
            </div>

            <form id="form-tgp">
              <div class="form-group mb-12">
                <label>Select Student</label>
                <select id="tgp-student" class="form-input" required>
                  <option value="">-- Choose a Student --</option>
                  ${(model.students || []).map(s => `<option value="${s.id}">${s.name} (${s.grade})</option>`).join('')}
                </select>
              </div>

              <div class="grid-2 mb-12">
                <div class="form-group">
                  <label>Valid For Date</label>
                  <input type="date" id="tgp-date" class="form-input" required min="${new Date().toLocaleDateString('en-CA')}">
                </div>
                <div class="form-group">
                  <label>Designated Gate</label>
                  <select id="tgp-gate" class="form-input" required>
                    <option value="Main Gate">Main Gate</option>
                    <option value="Gate 1">Gate 1</option>
                    <option value="Gate 2">Gate 2</option>
                  </select>
                </div>
              </div>

              <div class="form-group mb-12">
                <label>Reason for Temporary Exit</label>
                <textarea id="tgp-reason" class="form-input" rows="3" required placeholder="e.g. Forgotten ID, Medical appointment..."></textarea>
              </div>
              
              <div class="form-group">
                <label>Requested By (Parent/Guardian)</label>
                <input type="text" id="tgp-requester" class="form-input" required placeholder="Name of parent or guardian">
              </div>
            </form>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" id="btn-cancel-tgp">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-tgp" form="form-tgp">Submit Request</button>
          </div>
        </div>
      </div>

      ${this.renderTGPCardModal()}
    `;
  }

  static renderTGPCardModal() {
    return `
      <div id="modal-tgp-card" class="overlay" style="display: none;">
        <div class="modal" style="width: 360px;">
          <div class="modal-head">
            <div class="modal-title">Temporary Gate Pass</div>
            <button class="close-btn" id="btn-close-tgp-card">${Icons['x-close'](14)}</button>
          </div>
          <div class="modal-body" style="background: #f5f4f8;">
             <div id="tgp-card-render-target"></div>
          </div>
          <div class="modal-foot" style="justify-content: center;">
            <button class="btn btn-primary" id="btn-download-tgp">
              ${Icons['download'](14)} Download Image
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static renderTableRows(tgps, model) {
    if (!tgps || tgps.length === 0) {
      return `<tr><td colspan="6" class="empty">No temporary passes found</td></tr>`;
    }

    return tgps.map(t => {
      const student = model.getStudentByPassId(t.studentId);
      const sName = student ? student.name : 'Unknown';
      const sGrade = student ? student.grade : '';
      
      const dateStr = new Date(t.validDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      
      let badgeHtml = '';
      if (t.status === 'pending') badgeHtml = `<span class="badge b-pending">PENDING</span>`;
      if (t.status === 'approved') badgeHtml = `<span class="badge b-active">APPROVED</span>`;
      if (t.status === 'rejected') badgeHtml = `<span class="badge b-denied">REJECTED</span>`;

      return `
        <tr data-status="${escapeHTML(t.status)}">
          <td>
            <div style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHTML(t.id)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${dateStr}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHTML(sName)}</div>
            <div style="font-size: 11px; color: var(--text3);">${escapeHTML(sGrade)}</div>
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHTML(t.gate)}</div>
            <div style="font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${escapeHTML(t.reason)}">${escapeHTML(t.reason)}</div>
          </td>
          <td>
            ${badgeHtml}
          </td>
          <td>
            <div class="flex gap-8">
              ${t.status === 'pending' ? `
                <button class="btn btn-primary btn-sm btn-tgp-action" data-id="${t.id}" data-action="approved" title="Approve">
                  ${Icons['check-circle'](14)}
                </button>
                <button class="btn btn-danger btn-sm btn-tgp-action" data-id="${t.id}" data-action="rejected" title="Reject">
                  ${Icons['x-circle'](14)}
                </button>
              ` : t.status === 'approved' ? `
                <button class="btn btn-ghost btn-sm btn-view-tgp" data-id="${t.id}" title="View TGP Card">
                  ${Icons['id-card'](14)} View Pass
                </button>
              ` : `
                <span style="font-size: 11px; color: var(--text3);">Rejected</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}
