import Icons from '../icons.js';

export default class LoginView {
  static render() {
    return `
      <div style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); padding: 20px;">
        <div class="card" style="max-width: 400px; width: 100%;">
          <div style="background: var(--primary); padding: 30px 20px; text-align: center; color: #fff;">
            <div style="display: inline-flex; justify-content: center; align-items: center; width: 64px; height: 64px; background: rgba(255,255,255,0.1); border-radius: 16px; margin-bottom: 16px;">
              ${Icons['shield-check'](32)}
            </div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">SISC PGP SYSTEM</h2>
            <div style="font-size: 13px; opacity: 0.8; margin-top: 5px;">Authorization Required</div>
          </div>
          
          <div class="card-body" style="padding: 24px;">
            <div style="text-align: center; margin-bottom: 24px; color: var(--text2); font-size: 14px;">
              Select your role to continue:
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <!-- Admin -->
              <button class="btn btn-login-role" data-role="admin" data-name="System Admin" style="width: 100%; justify-content: space-between; padding: 16px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="color: var(--primary);">${Icons['users'](20)}</div>
                  <div style="text-align: left;">
                    <div style="font-weight: 700;">System Administrator</div>
                    <div style="font-size: 11px; color: var(--text3); font-weight: 400;">Full Access</div>
                  </div>
                </div>
                <div style="color: var(--border2);">${Icons['arrow-right'](16)}</div>
              </button>

              <!-- Secretary -->
              <button class="btn btn-login-role" data-role="secretary" data-name="Secretary Cruz" style="width: 100%; justify-content: space-between; padding: 16px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="color: var(--orange);">${Icons['file-text'](20)}</div>
                  <div style="text-align: left;">
                    <div style="font-weight: 700;">Office Secretary</div>
                    <div style="font-size: 11px; color: var(--text3); font-weight: 400;">Enrollment & Approvals</div>
                  </div>
                </div>
                <div style="color: var(--border2);">${Icons['arrow-right'](16)}</div>
              </button>

              <!-- Guard -->
              <button class="btn btn-login-role" data-role="guard" data-name="Guard Santos" style="width: 100%; justify-content: space-between; padding: 16px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="color: var(--green);">${Icons['scan-line'](20)}</div>
                  <div style="text-align: left;">
                    <div style="font-weight: 700;">Gate Guard</div>
                    <div style="font-size: 11px; color: var(--text3); font-weight: 400;">Scanner Operations</div>
                  </div>
                </div>
                <div style="color: var(--border2);">${Icons['arrow-right'](16)}</div>
              </button>
            </div>

            <div style="margin-top: 24px; text-align: center; font-size: 11px; color: var(--text3);">
              Role-Based Access Control (RBAC) Demonstration Mode
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
