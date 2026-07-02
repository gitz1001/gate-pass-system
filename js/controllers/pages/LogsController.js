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
}
