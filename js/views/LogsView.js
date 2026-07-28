import Icons from '../icons.js';
import { escapeHTML } from '../utils.js';

export default class LogsView {
  static render(model) {
    const logs = model.exitLogs || [];
    const userGate = model.currentUser?.gate || 'all';
    
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
        
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 12px; background: var(--bg-elevated); align-items: center;">
          <div class="form-group" style="flex: 1; min-width: 200px; margin: 0;">
            <input type="text" id="logs-search" class="form-input" placeholder="Search by student ID or name...">
          </div>
          <div class="form-group" style="width: 140px; margin: 0;">
            <select id="logs-filter-grade" class="form-input">
              <option value="all">All Grades</option>
              <option value="Pre-school">Pre-school</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
              <option value="College">College</option>
            </select>
          </div>
          <div class="form-group" style="width: 140px; margin: 0;">
            <select id="logs-filter-gate" class="form-input">
              <option value="all">All Gates</option>
              <option value="Main Gate" ${userGate === 'Main Gate' ? 'selected' : ''}>Main Gate</option>
              <option value="Gate 1" ${userGate === 'Gate 1' ? 'selected' : ''}>Gate 1</option>
              <option value="Gate 2" ${userGate === 'Gate 2' ? 'selected' : ''}>Gate 2</option>
            </select>
          </div>
          <div class="form-group" style="display: flex; gap: 8px; align-items: center; margin: 0;">
            <span style="font-size: 11px; color: var(--text2);">Time:</span>
            <input type="time" id="logs-filter-time-from" class="form-input" style="width: 110px;">
            <span style="font-size: 11px; color: var(--text2);">to</span>
            <input type="time" id="logs-filter-time-to" class="form-input" style="width: 110px;">
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
      const sGrade = student ? escapeHTML(student.grade) : '';
      
      const date = new Date(log.timestamp);
      const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      const timeVal = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      const isDenied = log.result === 'denied';
      const rowGate = escapeHTML(log.gate || 'Main Gate');

      return `
        <tr data-gate="${rowGate}" data-grade="${sGrade}" data-time="${timeVal}">
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
