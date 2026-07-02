export default class ScannerController {
  static bind(controller) {
    controller.scannerActive = false;
    controller.videoStream = null;

    // Tabs
    const tabs = document.querySelectorAll('.scan-tab');
    const panels = document.querySelectorAll('.scan-panel');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        // Update active tab styling
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.fontWeight = '500';
          t.style.color = 'var(--text2)';
          t.style.borderBottomColor = 'transparent';
        });
        const curr = e.currentTarget;
        curr.classList.add('active');
        curr.style.fontWeight = '600';
        curr.style.color = 'var(--primary)';
        curr.style.borderBottomColor = 'var(--primary)';

        // Show panel
        const target = curr.dataset.target;
        panels.forEach(p => p.style.display = 'none');
        document.getElementById(`panel-${target}`).style.display = 'block';

        // Logic based on tab
        if (target === 'usb') {
          document.getElementById('scan-usb-input').focus();
          controller.stopCamera();
        } else if (target === 'camera') {
          // Camera started manually via button now
        } else {
          controller.stopCamera();
        }
}
