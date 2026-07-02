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

    return `
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
                <div style="width: ${activePct}%; height: 100%; background: var(--green); border-radius: 5px;"></div>
              </div>
              <div style="width: 30px; font-weight: 700; color: var(--green); text-align: right;">${active}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Suspended</div>
              <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                <div style="width: ${suspendedPct}%; height: 100%; background: var(--orange); border-radius: 5px;"></div>
              </div>
              <div style="width: 30px; font-weight: 700; color: var(--orange); text-align: right;">${suspended}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Revoked</div>
              <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                <div style="width: ${revokedPct}%; height: 100%; background: var(--red); border-radius: 5px;"></div>
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
                <div style="width: ${grantedPct}%; height: 100%; background: var(--primary); border-radius: 5px;"></div>
              </div>
              <div style="width: 30px; font-weight: 700; color: var(--primary); text-align: right;">${granted}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
              <div style="width: 80px; text-align: right; font-size: 11px; color: var(--text2);">Denied Attempts</div>
              <div style="flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden;">
                <div style="width: ${deniedPct}%; height: 100%; background: var(--red); border-radius: 5px;"></div>
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
    `;
  }
}
