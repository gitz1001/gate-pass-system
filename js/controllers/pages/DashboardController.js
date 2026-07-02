export default class DashboardController {
  static bind(controller) {
    const btnScan = document.getElementById('dash-btn-scan');
    const btnEnroll = document.getElementById('dash-btn-enroll');
    const btnLogs = document.getElementById('dash-btn-quick-logs') || document.getElementById('dash-btn-logs');

    if (btnScan) btnScan.addEventListener('click', () => controller.navigateToPage('scanner'));
    if (btnLogs) btnLogs.addEventListener('click', () => controller.navigateToPage('logs'));
    if (btnEnroll) btnEnroll.addEventListener('click', () => {
      controller.navigateToPage('students');
      setTimeout(() => {
        const addBtn = document.getElementById('btn-add-student');
        if (addBtn) addBtn.click();
      }, 100);
    });
  }
}
