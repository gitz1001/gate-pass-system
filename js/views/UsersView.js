import Icons from '../icons.js';

export default class UsersView {
  static render(model) {
    // Basic mock user list for the UI
    const users = [
      { id: 1, name: 'System Admin', email: 'admin@sisc.edu.ph', role: 'System Admin', campus: 'Main' },
      { id: 2, name: 'Secretary Cruz', email: 'sec.cruz@sisc.edu.ph', role: 'Secretary', campus: 'Main' },
      { id: 3, name: 'Guard Santos', email: 'guard.santos@sisc.edu.ph', role: 'Gate Guard', campus: 'Gate 2' },
    ];

    return `
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">User Management</div>
            <div class="card-sub">Manage system access and roles</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="alert('Demo only: User creation is disabled.')">
            ${Icons['plus'](14)} Add User
          </button>
        </div>

        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg-elevated); display: flex; gap: 8px; align-items: center;">
           <span style="font-size: 12px; font-weight: 600; color: var(--primary);">Quick Role Switcher (Demo):</span>
           <button class="pill" onclick="document.getElementById('user-name').innerText='System Admin'; document.getElementById('user-role').innerText='Administrator';">Admin</button>
           <button class="pill" onclick="document.getElementById('user-name').innerText='Secretary Cruz'; document.getElementById('user-role').innerText='Secretary';">Secretary</button>
           <button class="pill" onclick="document.getElementById('user-name').innerText='Guard Santos'; document.getElementById('user-role').innerText='Gate Guard';">Guard</button>
        </div>

        <div class="tbl-wrap">
          <table id="users-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Campus/Gate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--primary); font-weight: 700; font-size: 10px;">
                        ${u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div style="font-weight: 600;">${u.name}</div>
                    </div>
                  </td>
                  <td>${u.email}</td>
                  <td>
                    <span class="badge ${u.role === 'System Admin' ? 'b-info' : 'b-active'}">${u.role}</span>
                  </td>
                  <td>${u.campus}</td>
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
