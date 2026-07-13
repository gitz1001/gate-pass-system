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
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">e-gatepass</h2>
            <div style="font-size: 13px; opacity: 0.8; margin-top: 5px;">Authorization Required</div>
          </div>
          
          <div class="card-body" style="padding: 24px;">
            <div style="text-align: center; margin-bottom: 24px; color: var(--text2); font-size: 14px;">
              Please enter your credentials:
            </div>
            
            <form id="login-form">
              <div class="form-group" style="margin-bottom: 16px;">
                <label for="login-username">Username</label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 12px; top: 10px; color: var(--text3);">${Icons['user-cog'](16)}</span>
                  <input type="text" id="login-username" class="form-input" style="padding-left: 36px;" required placeholder="Enter username (e.g., admin)" autocomplete="username">
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 24px;">
                <label for="login-password">Password</label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 12px; top: 10px; color: var(--text3);">${Icons['shield-check'](16)}</span>
                  <input type="password" id="login-password" class="form-input" style="padding-left: 36px;" required placeholder="Enter password" autocomplete="current-password">
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 10px; font-size: 14px;" id="btn-login-submit">
                Secure Login ${Icons['arrow-right'](16)}
              </button>
            </form>

            <div style="margin-top: 24px; text-align: center; font-size: 11px; color: var(--text3);">
              Access is restricted to authorized personnel only. All logins are tracked and logged.
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
