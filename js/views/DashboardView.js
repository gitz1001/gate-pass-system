import Icons from '../icons.js';
import { escapeHTML } from '../utils.js';

export default class DashboardView {
  static render(model) {
    const students = model.students || [];
    const logs = model.exitLogs || [];

    // Calculate stats based on old data structure
    const totalStudents = students.length;
    const activePGP = students.filter(s => s.status === 'active').length;
    
    // Get today's exits
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const todayLogs = logs.filter(l => l.timestamp && l.timestamp.startsWith(today));
    const todayExitsCount = todayLogs.length;

    // We don't have "pending" in the old data structure, so we'll use "Total Students"
    return `
      <div class="stats-row">
        <div class="stat" style="border-left: 3px solid var(--accent)">
          <div class="stat-icon">${Icons['shield-check'](22)}</div>
          <div class="stat-val" style="color: var(--accent-d)">${activePGP}</div>
          <div class="stat-lbl">Active PGP Passes</div>
          <div class="stat-sub">Valid for SY 2025-2026</div>
        </div>
        <div class="stat" style="border-left: 3px solid var(--primary)">
          <div class="stat-icon">${Icons['users'](22)}</div>
          <div class="stat-val" style="color: var(--primary)">${totalStudents}</div>
          <div class="stat-lbl">Enrolled Students</div>
          <div class="stat-sub">Registered in system</div>
        </div>
        <div class="stat" style="border-left: 3px solid var(--green)">
          <div class="stat-icon">${Icons['door-open'](22)}</div>
          <div class="stat-val" style="color: var(--green)">${todayExitsCount}</div>
          <div class="stat-lbl">Today's Exits</div>
          <div class="stat-sub">${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div class="stat" style="border-left: 3px solid var(--blue)">
          <div class="stat-icon">${Icons['scan-line'](22)}</div>
          <div class="stat-val" style="color: var(--blue)">0</div>
          <div class="stat-lbl">Pending Scans</div>
          <div class="stat-sub">Gate queue</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Today's Exit Activity</div>
              <div class="card-sub">Recent gate scans</div>
            </div>
            <button class="btn btn-ghost btn-sm" id="dash-btn-logs">View All</button>
          </div>
          <div style="max-height: 260px; overflow-y: auto;">
            ${this.renderActivityFeed(todayLogs, model)}
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Quick Actions</div>
              <div class="card-sub">Common tasks</div>
            </div>
          </div>
          <div class="card-body">
            <div class="grid-2">
              <button class="btn btn-primary" id="dash-btn-scan" style="width: 100%; justify-content: center; padding: 12px;">
                ${Icons['scan-line'](18)} Open Gate Scanner
              </button>
              ${model.currentUser && model.currentUser.role !== 'guard' ? `
              <button class="btn btn-ghost" id="dash-btn-enroll" style="width: 100%; justify-content: center; padding: 12px;">
                ${Icons['plus'](18)} Enroll New Student
              </button>
              ` : `
              <button class="btn btn-ghost" id="dash-btn-quick-logs" style="width: 100%; justify-content: center; padding: 12px;">
                ${Icons['file-text'](18)} View Logs
              </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static renderActivityFeed(logs, model) {
    if (!logs || logs.length === 0) {
      return `
        <div class="empty" style="padding: 24px;">
          <div class="empty-icon">${Icons['clock'](32)}</div>
          <div class="empty-title">No exits today</div>
        </div>
      `;
    }

    // Show last 10 logs
    const recentLogs = logs.slice(0, 10);

    return recentLogs.map(log => {
      const student = model.getStudentByPassId(log.studentId) || model.getStudentByStudId(log.studentId);
      const sName = student ? escapeHTML(student.name) : 'Unknown Student';
      const sGrade = student ? escapeHTML(student.grade) : 'Unknown Grade';
      const isDenied = log.result === 'denied';
      
      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

      // Fallback avatar initials
      const initials = sName !== 'Unknown Student' ? sName.substring(0, 2).toUpperCase() : '??';

      return `
        <div style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border);">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isDenied ? 'var(--red-s)' : 'var(--primary-soft)'}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: ${isDenied ? 'var(--red)' : 'var(--primary)'}; flex-shrink: 0;">
            ${student && student.photo && student.photo.startsWith('data:image') ? `<img src="${student.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : initials}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12.5px; font-weight: 700; color: var(--text);">${sName}</div>
            <div style="font-size: 10.5px; color: var(--text3);">${sGrade} · ${log.gate || 'Main Gate'}</div>
          </div>
          <div style="text-align: right;">
            <span class="badge ${isDenied ? 'b-denied' : 'b-active'}">${isDenied ? 'Denied' : 'Granted'}</span>
            <div style="font-size: 10px; color: var(--text3); margin-top: 4px;">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}
