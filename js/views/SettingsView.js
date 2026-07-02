import Icons from '../icons.js';

export default class SettingsView {
  static render(model) {
    const currentTheme = model.getTheme() || 'auto';
    
    return `
      <div class="grid-2">
        <!-- Appearance -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Appearance</div>
              <div class="card-sub">Customize the application theme</div>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group mb-12">
              <label>Theme Preference</label>
              <select id="settings-theme" class="form-input">
                <option value="auto" ${currentTheme === 'auto' ? 'selected' : ''}>System Auto-Detect</option>
                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Mode</option>
                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Mode</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Data Management</div>
              <div class="card-sub">Export or clear your system data</div>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button class="btn btn-ghost" id="settings-export" style="justify-content: center;">
                ${Icons['download'](16)} Export All Data (JSON)
              </button>
              
              <button class="btn btn-ghost" id="settings-import-btn" style="justify-content: center;">
                ${Icons['upload'](16)} Import Data (JSON)
              </button>
              <input type="file" id="settings-import-file" style="display: none;" accept=".json">
              
              <div style="border-top: 1px solid var(--border); margin: 8px 0;"></div>
              
              <button class="btn btn-danger" id="settings-clear-db" style="justify-content: center;">
                ${Icons['trash'](16)} Erase Database...
              </button>
              <div style="font-size: 11px; color: var(--text3); text-align: center;">
                This will permanently delete all students and logs.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
