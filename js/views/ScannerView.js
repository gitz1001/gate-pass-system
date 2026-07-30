import Icons from '../icons.js';
import { escapeHTML, resolvePhotoUrl, hasPhoto } from '../utils.js';

export default class ScannerView {
  static render(model) {
    const todayLogs = (model.exitLogs || []).filter(l => l.timestamp && l.timestamp.startsWith(new Date().toLocaleDateString('en-CA')));
    const userGate = model.currentUser?.gate || 'Gate 1';

    return `
      <div class="scanner-grid" style="align-items: start;">
        
        <!-- Scanner Main Area -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title" style="display: flex; align-items: center; gap: 8px;">
                ${Icons['scan-line'](18)} Gate Scanner
              </div>
              <div class="card-sub">Scan ID or enter pass number manually</div>
            </div>
            
            <div class="form-group" style="width: 180px; margin: 0;">
              <select id="scan-gate" class="form-input" ${model.currentUser?.role === 'guard' ? 'disabled style="opacity:0.7;cursor:not-allowed;"' : ''}>
                <option value="Gate 1" ${userGate === 'Gate 1' ? 'selected' : ''}>Gate 1</option>
                <option value="Gate 2" ${userGate === 'Gate 2' ? 'selected' : ''}>Gate 2</option>
                <option value="College Gate" ${userGate === 'College Gate' ? 'selected' : ''}>College Gate</option>
              </select>
            </div>
          </div>

          <!-- Tabs -->
          <div style="display: flex; border-bottom: 1px solid var(--border); padding: 0 16px;">
            <button class="scan-tab" data-target="usb" style="padding: 12px 16px; background: none; border: none; font-weight: 500; color: var(--text2); border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px;">
              ${Icons['usb'](16)} USB Scanner
            </button>
            <button class="scan-tab" data-target="manual" style="padding: 12px 16px; background: none; border: none; font-weight: 500; color: var(--text2); border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px;">
              ${Icons['file-text'](16)} Manual Input
            </button>
            <button class="scan-tab active" data-target="camera" style="padding: 12px 16px; background: none; border: none; font-weight: 600; color: var(--primary); border-bottom: 2px solid var(--primary); display: flex; align-items: center; gap: 6px;">
              ${Icons['camera'](16)} Camera
            </button>
            <button class="scan-tab" data-target="facescan" style="padding: 12px 16px; background: none; border: none; font-weight: 500; color: var(--text2); border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px;">
              ${Icons['face-scan'](16)} Face Scan
            </button>
          </div>

          <!-- Panels -->
          <div style="padding: 24px;">
            
            <!-- Scan Result Box (Moved to top for visibility) -->
            <div id="scan-result" style="display: none; margin-bottom: 24px; animation: slideDown 0.3s ease-out;"></div>

            <!-- USB Panel -->
            <div id="panel-usb" class="scan-panel" style="display: none;">
              <div style="background: var(--accent-soft); border: 2px solid var(--accent); border-radius: var(--radius); padding: 32px 24px; text-align: center;">
                <div style="color: var(--accent-d); margin-bottom: 12px;">${Icons['usb'](48)}</div>
                <h3 style="color: var(--primary); margin-bottom: 8px;">Ready for USB Scanner</h3>
                <p style="color: var(--text2); font-size: 13px; max-width: 320px; margin: 0 auto 20px;">
                  Click the input below and scan the ID card. The scanner will automatically press Enter.
                </p>
                <input type="text" id="scan-usb-input" class="form-input" style="max-width: 300px; margin: 0 auto; text-align: center; font-family: monospace; font-size: 16px; font-weight: bold; border-width: 2px;" placeholder="Scan or type here..." autofocus>
              </div>
            </div>

            <!-- Manual Panel -->
            <div id="panel-manual" class="scan-panel" style="display: none;">
              <div style="background: var(--primary-soft); border: 2px dashed var(--primary); opacity: 0.8; border-radius: var(--radius); padding: 32px 24px; text-align: center;">
                <div style="color: var(--primary); margin-bottom: 12px;">${Icons['edit'](48)}</div>
                <h3 style="color: var(--primary); margin-bottom: 8px;">Manual Pass Entry</h3>
                <p style="color: var(--text2); font-size: 13px; max-width: 320px; margin: 0 auto 20px;">
                  Type the Student ID or PGP number exactly as it appears on the record.
                </p>
                <div style="display: flex; gap: 8px; max-width: 300px; margin: 0 auto;">
                  <input type="text" id="scan-manual-input" class="form-input" style="flex: 1; text-align: center; font-family: monospace;" placeholder="Student ID or PGP">
                  <button class="btn btn-primary" id="btn-manual-verify">Verify</button>
                </div>
              </div>
            </div>

            <!-- Camera Panel -->
            <div id="panel-camera" class="scan-panel" style="display: block;">
              <div style="background: #000; border-radius: var(--radius); overflow: hidden; position: relative; min-height: 280px; display: flex; align-items: center; justify-content: center;">
                
                <video id="scan-video" style="width: 100%; height: auto; display: none;"></video>
                <canvas id="scan-canvas" style="display: none;"></canvas>
                
                <!-- Target Overlay -->
                <div id="scan-overlay" style="display: none; position: absolute; inset: 0; border: 40px solid rgba(0,0,0,0.5);">
                  <div style="position: absolute; inset: 0; border: 2px solid var(--accent); box-shadow: 0 0 0 4px rgba(0,201,177,0.3);"></div>
                </div>

                <!-- Start UI -->
                <div id="scan-start-ui" style="text-align: center; color: #fff; padding: 24px;">
                  <div style="color: rgba(255,255,255,0.5); margin-bottom: 16px;">${Icons['camera'](48)}</div>
                  <button class="btn btn-accent" id="btn-start-camera" style="padding: 10px 20px;">Start Camera</button>
                  <p style="color: #aaa; font-size: 11px; margin-top: 12px;">Requires camera permission</p>
                </div>
              </div>
            </div>

            <!-- Face Scan Panel -->
            <div id="panel-facescan" class="scan-panel" style="display: none;">
              <div style="background: #000; border-radius: var(--radius); overflow: hidden; position: relative; min-height: 280px; display: flex; align-items: center; justify-content: center;">
                
                <video id="face-video" style="width: 100%; height: auto; display: none; transform: scaleX(-1);" playsinline></video>
                <canvas id="face-overlay-canvas" style="display: none; position: absolute; inset: 0; width: 100%; height: 100%; transform: scaleX(-1); pointer-events: none;"></canvas>
                
                <!-- Face Scan Status Overlay -->
                <div id="face-status-overlay" style="display: none; position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: #fff; padding: 8px 20px; border-radius: 99px; font-size: 12px; font-weight: 700; z-index: 2; white-space: nowrap;"></div>

                <!-- Liveness Prompt Overlay -->
                <div id="face-liveness-overlay" style="display: none; position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(66,36,103,0.9); color: #fff; padding: 10px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; z-index: 2; text-align: center; white-space: nowrap;">
                  👁️ Please BLINK to verify liveness
                </div>

                <!-- Start UI -->
                <div id="face-start-ui" style="text-align: center; color: #fff; padding: 24px;">
                  <div style="color: rgba(255,255,255,0.5); margin-bottom: 12px;">${Icons['face-scan'](48)}</div>
                  <h3 style="color: #fff; font-size: 15px; margin-bottom: 6px;">Face Recognition</h3>
                  <p style="color: #aaa; font-size: 12px; max-width: 300px; margin: 0 auto 20px;">Use facial biometrics to verify student identity. Enroll a face first, then scan to match.</p>
                  <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-accent" id="btn-start-face-scan" style="padding: 10px 20px;">Start Face Scan</button>
                    ${model.currentUser && model.currentUser.role === 'admin' ? `
                      <button class="btn btn-ghost" id="btn-enroll-face" style="padding: 10px 20px; color: #fff; border-color: rgba(255,255,255,0.3);">${Icons['plus'](14)} Enroll Face</button>
                    ` : ''}
                  </div>
                  <div id="face-enrolled-count" style="color: #aaa; font-size: 11px; margin-top: 12px;"></div>
                  <div style="color: #666; font-size: 10px; margin-top: 8px; max-width: 280px; margin-left: auto; margin-right: auto;">
                    ${Icons['shield-check'](12)} Biometric data is processed locally and protected under RA 10173.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Live Feed Sidebar -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Live Exit Feed</div>
              <div class="card-sub">Today's scans</div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green);"></div>
              <span style="font-size: 11px; font-weight: 600; color: var(--green);">Live</span>
            </div>
          </div>
          <div id="live-feed-container" style="max-height: 500px; overflow-y: auto;">
            ${this.renderLiveFeed(todayLogs, model)}
          </div>
        </div>
      </div>
    `;
  }

  static renderLiveFeed(logs, model) {
    if (!logs || logs.length === 0) {
      return `
        <div class="empty" style="padding: 32px 16px;">
          <div class="empty-icon">${Icons['users'](32)}</div>
          <div class="empty-title">Waiting for scans...</div>
        </div>
      `;
    }

    // Show recent first
    return logs.slice(0, 15).map(log => {
      const student = model.getStudentByPassId(log.studentId) || model.getStudentByStudId(log.studentId);
      const sName = student ? escapeHTML(student.name) : 'Unknown';
      const isDenied = log.result === 'denied';
      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

      return `
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; background: ${isDenied ? 'var(--red-s)' : 'transparent'};">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sName}</div>
            <div style="font-size: 10px; color: var(--text3);">${log.gate}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <span class="badge ${isDenied ? 'b-denied' : 'b-active'}">${isDenied ? 'Denied' : 'Granted'}</span>
            <div style="font-size: 10px; color: var(--text3); margin-top: 4px;">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  static renderResult(student, isDenied, message, designatedGate = '') {
    if (!student) {
      return `
        <div style="background: var(--red-s); border: 1px solid var(--red); border-radius: var(--radius); padding: 16px; display: flex; gap: 12px; align-items: center; color: var(--red);">
          ${Icons['x-circle'](24)}
          <div>
            <div style="font-weight: 700; font-size: 14px;">Invalid Pass</div>
            <div style="font-size: 12px; opacity: 0.9;">${message ? escapeHTML(message) : 'Student not found in the system.'}</div>
          </div>
        </div>
      `;
    }

    const bg = isDenied ? 'var(--red-s)' : 'var(--green-s)';
    const border = isDenied ? 'var(--red)' : 'var(--green)';
    const color = isDenied ? 'var(--red)' : 'var(--green)';
    const icon = isDenied ? Icons['x-circle'](32) : Icons['check-circle'](32);

    return `
      <div style="background: ${bg}; border: 2px solid ${border}; border-radius: var(--radius); padding: 20px; display: flex; gap: 16px; align-items: center;">
        <div style="color: ${color}; align-self: flex-start;">${icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 20px; color: ${color}; letter-spacing: 0.5px;">${isDenied ? 'EXIT DENIED' : 'EXIT GRANTED'}</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--text); margin: 4px 0;">${escapeHTML(student.name)} <span style="color: var(--text3); font-weight: 500;">(${escapeHTML(student.studid || student.id)})</span></div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text2); margin-bottom: 12px;">${escapeHTML(student.grade)}</div>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${designatedGate ? `<div style="font-size: 13px; color: var(--text); padding: 6px 12px; background: rgba(0,0,0,0.05); border-radius: 6px; display: inline-block; border-left: 3px solid ${color};"><b>Gate:</b> ${escapeHTML(designatedGate)}</div>` : ''}
            ${student.arrangements ? `<div style="font-size: 13px; color: var(--text); padding: 6px 12px; background: rgba(0,0,0,0.05); border-radius: 6px; display: inline-block; border-left: 3px solid ${color};"><b>Arrangement:</b> ${escapeHTML(student.arrangements)}</div>` : ''}
            ${student.vehicleDetails ? `<div style="font-size: 13px; color: var(--text); padding: 6px 12px; background: rgba(0,0,0,0.05); border-radius: 6px; display: inline-block; border-left: 3px solid ${color};"><b>Vehicle:</b> ${escapeHTML(student.vehicleDetails)}</div>` : ''}
          </div>

          ${message ? `<div style="font-size: 14px; font-weight: 700; margin-top: 12px; color: ${color}; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 6px;">${escapeHTML(message)}</div>` : ''}
        </div>
        ${hasPhoto(student.photo) ? `<div style="width: 120px; height: 120px; border-radius: 12px; overflow: hidden; border: 3px solid ${border}; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"><img src="${escapeHTML(resolvePhotoUrl(student.photo))}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
      </div>
    `;
  }
}
