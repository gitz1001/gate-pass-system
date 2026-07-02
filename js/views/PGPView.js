import Icons from '../icons.js';
import { escapeHTML } from '../utils.js';

export default class PGPView {
  static render(model) {
    const students = model.students || [];
    // In the legacy data model, every student with a PGP string is considered to have a pass.
    const passes = students.filter(s => s.pgp);

    const activeCount = passes.filter(p => p.status === 'active').length;
    const suspendedCount = passes.filter(p => p.status === 'suspended').length;
    const revokedCount = passes.filter(p => p.status === 'revoked').length;

    return `
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Permanent Gate Passes (PGP)</div>
            <div class="card-sub">Manage active, suspended, and revoked long-term passes</div>
          </div>
        </div>
        
        <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--bg-elevated);">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;" id="pgp-filters">
            <button class="pill on" data-filter="all">All (${passes.length})</button>
            <button class="pill" data-filter="active">Active (${activeCount})</button>
            <button class="pill" data-filter="suspended">Suspended (${suspendedCount})</button>
            <button class="pill" data-filter="revoked">Revoked (${revokedCount})</button>
          </div>
          <div class="form-group" style="max-width: 300px;">
            <input type="text" id="pgp-search" class="form-input" placeholder="Search by PGP No. or student name...">
          </div>
        </div>

        <div class="tbl-wrap">
          <table id="pgp-table">
            <thead>
              <tr>
                <th>PGP No.</th>
                <th>Student</th>
                <th>Grade/Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderTableRows(passes)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  static renderTableRows(passes) {
    if (!passes || passes.length === 0) {
      return `<tr><td colspan="5" class="empty">No permanent passes found</td></tr>`;
    }

    return passes.map(p => {
      let statusClass = 'b-active';
      if (p.status === 'suspended') statusClass = 'b-orange'; // We need to define b-orange in CSS or reuse
      if (p.status === 'revoked') statusClass = 'b-denied';

      // Fallback colors for status if not perfectly matching
      let badgeStyle = '';
      if (p.status === 'suspended') badgeStyle = 'background: var(--orange-s); color: var(--orange);';
      if (p.status === 'revoked') badgeStyle = 'background: var(--red-s); color: var(--red);';
      if (p.status === 'active') badgeStyle = 'background: var(--green-s); color: var(--green);';

      return `
        <tr data-status="${escapeHTML(p.status)}">
          <td>
            <div style="font-family: monospace; font-weight: 700; color: var(--primary);">${escapeHTML(p.pgp)}</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--primary); font-weight: 700; font-size: 10px;">
                ${p.photo && p.photo.startsWith('data:image') ? `<img src="${escapeHTML(p.photo)}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML(p.name.substring(0, 2).toUpperCase())}
              </div>
              <div>
                <div style="font-weight: 600;">${escapeHTML(p.name)}</div>
                <div style="font-size: 11px; color: var(--text3);">${escapeHTML(p.studid || p.id)}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHTML(p.grade)}</div>
            <div style="font-size: 11px; color: var(--text3);">${escapeHTML(p.section || '—')}</div>
          </td>
          <td>
            <span class="badge" style="${badgeStyle}">${escapeHTML(p.status.toUpperCase())}</span>
          </td>
          <td>
            <div class="flex gap-8">
              ${p.status === 'active' ? `
                <button class="btn btn-ghost btn-sm btn-status-update" data-id="${p.id}" data-action="suspended" title="Suspend Pass">
                  Suspend
                </button>
                <button class="btn btn-danger btn-sm btn-status-update" data-id="${p.id}" data-action="revoked" title="Revoke Pass">
                  Revoke
                </button>
              ` : `
                <button class="btn btn-primary btn-sm btn-status-update" data-id="${p.id}" data-action="active" title="Reactivate Pass">
                  Reactivate
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}
