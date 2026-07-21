import Icons from '../icons.js';

export default class ReportsView {
  static render(model) {
    const students = model.students || [];
    const passes = students.filter(s => s.pgp);
    const logs = model.exitLogs || [];

    // Pass Status Summary
    const active = passes.filter(p => p.status === 'active').length;
    const suspended = passes.filter(p => p.status === 'suspended').length;
    const revoked = passes.filter(p => p.status === 'revoked').length;
    const totalPasses = Math.max(passes.length, 1);

    const activePct = Math.round((active / totalPasses) * 100);
    const suspendedPct = Math.round((suspended / totalPasses) * 100);
    const revokedPct = Math.round((revoked / totalPasses) * 100);

    // Exit Activity
    const granted = logs.filter(l => l.result === 'granted').length;
    const denied = logs.filter(l => l.result === 'denied').length;
    const totalLogs = Math.max(logs.length, 1);
    
    const grantedPct = Math.round((granted / totalLogs) * 100);
    const deniedPct = Math.round((denied / totalLogs) * 100);

    // Gate usage
    const gateUsage = {};
    logs.forEach(l => {
      const gate = l.gate || 'Main Gate';
      gateUsage[gate] = (gateUsage[gate] || 0) + 1;
    });
    const topGate = Object.keys(gateUsage).sort((a, b) => gateUsage[b] - gateUsage[a])[0] || 'N/A';

    // Grade Level Distribution
    const gradeUsage = {};
    passes.forEach(p => {
      const g = p.grade || 'Unknown';
      gradeUsage[g] = (gradeUsage[g] || 0) + 1;
    });

    return `
      <!-- Header with Print Button -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;" class="no-print">
        <div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--text);">System Reports</h2>
          <div style="font-size: 13px; color: var(--text2);">Analytics and printable PDF reports</div>
        </div>
        <button class="btn btn-primary" id="btn-print-report" style="display: flex; align-items: center; gap: 8px;">
          ${Icons['printer'](16)} Print PDF Report
        </button>
      </div>

      <!-- Printable Report Container -->
      <div id="print-area">
        
        <!-- Print Header (hidden on screen) -->
        <div class="print-only" style="margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <h1 style="margin: 0; font-size: 24px;">Southville International School and Colleges</h1>
          <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #555;">Gate Pass System - Official Report</h2>
          <div style="font-size: 12px; color: #777; margin-top: 5px;">Generated on: ${new Date().toLocaleString('en-PH')}</div>
        </div>

        <div class="grid-2">
          <!-- Pass Status Summary -->
          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Pass Status Summary</div>
                <div class="card-sub">Distribution of permanent gate passes</div>
              </div>
              ${Icons['shield-check'](20)}
            </div>
            <div class="card-body">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Active</div>
                <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                  <div style="width: ${activePct}%; height: 100%; background: var(--green); border-radius: 5px;" class="print-bg-exact"></div>
                </div>
                <div style="width: 30px; font-weight: 700; color: var(--green); text-align: right;">${active}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Suspended</div>
                <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                  <div style="width: ${suspendedPct}%; height: 100%; background: var(--orange); border-radius: 5px;" class="print-bg-exact"></div>
                </div>
                <div style="width: 30px; font-weight: 700; color: var(--orange); text-align: right;">${suspended}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Revoked</div>
                <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                  <div style="width: ${revokedPct}%; height: 100%; background: var(--red); border-radius: 5px;" class="print-bg-exact"></div>
                </div>
                <div style="width: 30px; font-weight: 700; color: var(--red); text-align: right;">${revoked}</div>
              </div>
            </div>
          </div>

          <!-- Exit Activity -->
          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Overall Exit Activity</div>
                <div class="card-sub">All-time scan results</div>
              </div>
              ${Icons['scan-line'](20)}
            </div>
            <div class="card-body">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Granted Exits</div>
                <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                  <div style="width: ${grantedPct}%; height: 100%; background: var(--primary); border-radius: 5px;" class="print-bg-exact"></div>
                </div>
                <div style="width: 30px; font-weight: 700; color: var(--primary); text-align: right;">${granted}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Denied Attempts</div>
                <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                  <div style="width: ${deniedPct}%; height: 100%; background: var(--red); border-radius: 5px;" class="print-bg-exact"></div>
                </div>
                <div style="width: 30px; font-weight: 700; color: var(--red); text-align: right;">${denied}</div>
              </div>
              <div style="background: var(--primary-soft); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 11px; color: var(--primary); font-weight: 700; text-transform: uppercase;">Most Active Gate</div>
                  <div style="font-size: 14px; font-weight: 700; color: var(--text);">${topGate}</div>
                </div>
                ${Icons['door-open'](24)}
              </div>
            </div>
          </div>
        </div>

        <!-- Details Table for Print -->
        <div class="card mt-16">
          <div class="card-head">
            <div>
              <div class="card-title">Enrolled Students per Grade Level</div>
              <div class="card-sub">Active PGP holders broken down by grade</div>
            </div>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Grade Level</th>
                  <th>Total Enrolled</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(gradeUsage).sort().map(g => `
                  <tr>
                    <td style="font-weight: 600;">${g}</td>
                    <td>${gradeUsage[g]} Students</td>
                    <td>${Math.round((gradeUsage[g] / Math.max(passes.length, 1)) * 100)}%</td>
                  </tr>
                `).join('')}
                ${Object.keys(gradeUsage).length === 0 ? '<tr><td colspan="3" style="text-align:center;">No students found</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}
