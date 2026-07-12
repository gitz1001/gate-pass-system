export default class LogsController {
  static bind(controller) {
    // Clear Logs
    const btnClear = document.getElementById('logs-btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all exit logs? This cannot be undone.')) {
          controller.model.clearLogs();
          controller.view.showToast('Exit logs cleared.');
          controller.navigateToPage('logs'); // Refresh
        }
      });
    }

    // Export CSV
    const btnExport = document.getElementById('logs-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const logs = controller.model.exitLogs || [];
        if (logs.length === 0) {
          controller.view.showToast('No logs to export', 'error');
          return;
        }
        
        let csv = 'Date,Time,Student Name,Student ID,Gate,Result,Pass Type\n';
        const escapeCSV = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        logs.forEach(log => {
          const student = controller.model.getStudentByPassId(log.studentId) || controller.model.getStudentByStudId(log.studentId);
          const sName = student ? student.name : 'Unknown';
          const sId = student ? (student.studid || student.id) : log.studentId;
          const date = new Date(log.timestamp);
          const dateStr = date.toLocaleDateString('en-CA');
          const timeStr = date.toLocaleTimeString('en-GB');
          
          csv += `${escapeCSV(dateStr)},${escapeCSV(timeStr)},${escapeCSV(sName)},${escapeCSV(sId)},${escapeCSV(log.gate || 'Main Gate')},${escapeCSV(log.result)},${escapeCSV(log.passType || 'PGP')}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PGP_ExitLogs_${new Date().toLocaleDateString('en-CA')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        controller.view.showToast('Logs exported successfully');
      });
    }

    // Filter Logic (Search & Gate)
    const searchIn = document.getElementById('logs-search');
    const gateSel = document.getElementById('logs-filter-gate');
    const filterLogs = () => {
      const term = (searchIn ? searchIn.value : '').toLowerCase();
      const gate = gateSel ? gateSel.value : 'all';
      const rows = document.querySelectorAll('#logs-table tbody tr');
      
      rows.forEach(row => {
        if (row.querySelector('.empty')) return; // skip empty msg
        const text = row.textContent.toLowerCase();
        const rowGate = row.cells[2] ? row.cells[2].textContent.trim() : '';
        const matchesSearch = text.includes(term);
        const matchesGate = gate === 'all' || rowGate === gate;
        row.style.display = matchesSearch && matchesGate ? '' : 'none';
      });
    };

    if (searchIn) searchIn.addEventListener('input', filterLogs);
    if (gateSel) gateSel.addEventListener('change', filterLogs);
  }
}
