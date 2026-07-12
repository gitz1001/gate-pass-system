import Icons from '../icons.js';
import { escapeHTML } from '../utils.js';

export default class ScannerView {
  static render(model) {
    const todayLogs = (model.exitLogs || []).filter(l => l.timestamp && l.timestamp.startsWith(new Date().toLocaleDateString('en-CA')));

    return `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 14px; align-items: start;" class="scanner-grid">
        
        <!-- Scanner Main Area -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title" style="display: flex; align-items: center; gap: 8px;">
                ${Icons['scan-line'](18)} Gate Scanner
              </div>
              <div class="card-sub">Scan ID or enter pass number manually</div>
            </div>
            
            <div class="form-group" style="width: 160px; margin: 0;">
              <select id="scan-gate" class="form-input">
                <option value="Main Gate">Main Gate</option>
                <option value="Gate 1">Gate 1</option>
                <option value="Gate 2">Gate 2</option>
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
          </div>

          <!-- Panels -->
          <div style="padding: 24px;">
            
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

            <!-- Scan Result Box (Shared) -->
            <div id="scan-result" style="margin-top: 20px; display: none;"></div>

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

  static renderResult(student, isDenied, message) {
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
        <div style="color: ${color};">${icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 16px; color: ${color};">${isDenied ? 'EXIT DENIED' : 'EXIT GRANTED'}</div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text); margin: 2px 0;">${escapeHTML(student.name)} (${escapeHTML(student.studid || student.id)})</div>
          <div style="font-size: 12px; color: var(--text2); margin-bottom: 4px;">${escapeHTML(student.grade)}</div>
          ${student.preferredGate ? `<div style="font-size: 11px; margin-top: 2px; color: var(--text2);"><b>Gate:</b> ${escapeHTML(student.preferredGate)}</div>` : ''}
          ${student.arrangements ? `<div style="font-size: 11px; margin-top: 2px; color: var(--text2);"><b>Arrangement:</b> ${escapeHTML(student.arrangements)}</div>` : ''}
          ${student.vehicleDetails ? `<div style="font-size: 11px; margin-top: 2px; color: var(--text2);"><b>Vehicle:</b> ${escapeHTML(student.vehicleDetails)}</div>` : ''}
          ${message ? `<div style="font-size: 12px; font-weight: 600; margin-top: 6px; color: ${color};">${escapeHTML(message)}</div>` : ''}
        </div>
        ${student.photo ? `<div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 2px solid ${border}; flex-shrink: 0;"><img src="${escapeHTML(student.photo)}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
      </div>
    `;
  }
}
