import Icons from '../icons.js';
import { escapeHTML } from '../utils.js';

export default class LogsView {
  static render(model) {
    const logs = model.exitLogs || [];
    
    return `
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Exit Logs</div>
            <div class="card-sub">Immutable record of all gate pass scans</div>
          </div>
          <div class="flex gap-8 items-center">
            <button class="btn btn-ghost btn-sm" id="logs-btn-export">
              ${Icons['download'](14)} Export CSV
            </button>
            <button class="btn btn-danger btn-sm" id="logs-btn-clear">
              ${Icons['trash'](14)} Clear All
            </button>
          </div>
        </div>
        
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; background: var(--bg-elevated);">
          <div class="form-group" style="flex: 1;">
            <input type="text" id="logs-search" class="form-input" placeholder="Search by student ID or name...">
          </div>
          <div class="form-group" style="width: 150px;">
            <select id="logs-filter-gate" class="form-input">
              <option value="all">All Gates</option>
              <option value="Main Gate">Main Gate</option>
              <option value="Gate 1">Gate 1</option>
              <option value="Gate 2">Gate 2</option>
            </select>
          </div>
        </div>

        <div class="tbl-wrap">
          <table id="logs-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Student</th>
                <th>Gate</th>
                <th>Result</th>
                <th>Pass Type</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderTableRows(logs, model)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  static renderTableRows(logs, model) {
    if (!logs || logs.length === 0) {
      return `<tr><td colspan="5" class="empty">No logs available</td></tr>`;
    }

    return logs.map(log => {
      const student = model.getStudentByPassId(log.studentId) || model.getStudentByStudId(log.studentId);
      const sName = student ? escapeHTML(student.name) : 'Unknown';
      const sId = student ? escapeHTML(student.studid || student.id) : escapeHTML(log.studentId);
      
      const date = new Date(log.timestamp);
      const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      
      const isDenied = log.result === 'denied';

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${dateStr}</div>
            <div style="font-size: 11px; color: var(--text3);">${timeStr}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${sName}</div>
            <div style="font-size: 11px; color: var(--text3);">${sId}</div>
          </td>
          <td>${log.gate || 'Main Gate'}</td>
          <td>
            <span class="badge ${isDenied ? 'b-denied' : 'b-active'}">${isDenied ? 'Denied' : 'Granted'}</span>
          </td>
          <td>
            <span class="badge b-info">${log.passType || 'PGP'}</span>
          </td>
        </tr>
      `;
    }).join('');
  }
}
