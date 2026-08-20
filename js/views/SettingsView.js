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

        ${model.currentUser?.role === 'admin' ? `
        <!-- Pass ID Management (Admin Only) -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-head">
            <div>
              <div class="card-title">Pass ID Management</div>
              <div class="card-sub">Fix or regenerate student Pass IDs to the standardized format (26A07-001)</div>
            </div>
          </div>
          <div class="card-body">
            <div style="background: var(--accent-soft); border: 1px solid var(--accent); border-radius: var(--radius); padding: 16px; margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 600; color: var(--primary); margin-bottom: 6px;">How it works</div>
              <ul style="font-size: 12px; color: var(--text2); margin: 0; padding-left: 18px; line-height: 1.8;">
                <li>Scans all students for IDs that <strong>don't match</strong> the new format (<code>26A07-001</code>)</li>
                <li>Generates a new PGP ID based on each student's <strong>grade</strong> and <strong>section</strong></li>
                <li>Updates both the local cache <strong>and</strong> the Google Sheet</li>
                <li>All QR codes will automatically match the new IDs</li>
              </ul>
            </div>
            <div id="regen-status" style="display: none; margin-bottom: 12px;"></div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="btn btn-ghost" id="btn-preview-regen" style="justify-content: center;">
                ${Icons['scan-line'](16)} Preview Old IDs
              </button>
              <button class="btn btn-primary" id="btn-regen-ids" style="justify-content: center;" disabled>
                ${Icons['settings-gear'](16)} Regenerate All Pass IDs
              </button>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }
}
