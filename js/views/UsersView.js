import Icons from '../icons.js';

export default class UsersView {
  static render(model) {
    const users = model.users || [];

    return `
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">User Management</div>
            <div class="card-sub">Manage system access and roles (Synced from Google Sheets)</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="alert('Please add or edit users directly in the Google Sheet \\'users\\' tab.')">
            ${Icons['plus'](14)} Manage in Sheets
          </button>
        </div>

        <div class="tbl-wrap">
          <table id="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Gate/Campus</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? '<tr><td colspan="5" class="empty">No users found. Check Google Sheets.</td></tr>' : ''}
              ${users.map(u => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--primary); font-weight: 700; font-size: 10px;">
                        ${(u.name || u.username || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div style="font-weight: 600;">${u.name || 'Unknown'}</div>
                    </div>
                  </td>
                  <td>${u.username}</td>
                  <td>
                    <span class="badge ${u.role === 'admin' ? 'b-info' : (u.role === 'guard' ? 'b-active' : 'b-pending')}">${(u.role || '').toUpperCase()}</span>
                  </td>
                  <td>${u.gate || 'Main Office'}</td>
                  <td>
                    <span style="color: var(--green); font-size: 12px; font-weight: 600;">Active</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
