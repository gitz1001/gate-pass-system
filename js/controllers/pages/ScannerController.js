export default class ScannerController {
  static bind(controller) {
    controller.scannerActive = false;
    controller.videoStream = null;

    // Tabs
    const tabs = document.querySelectorAll('.scan-tab');
    const panels = document.querySelectorAll('.scan-panel');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
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

        const target = curr.dataset.target;
        panels.forEach(p => p.style.display = 'none');
        document.getElementById(`panel-${target}`).style.display = 'block';

        if (target === 'usb') {
          document.getElementById('scan-usb-input').focus();
          controller.stopCamera();
        } else if (target === 'camera') {
          // Camera started manually via button now
        } else {
          controller.stopCamera();
        }
      });
    });

    // USB Scanner Input
    const usbInput = document.getElementById('scan-usb-input');
    if (usbInput) {
      usbInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          controller.processScan(usbInput.value.trim());
          usbInput.value = '';
        }
      });
    }

    // Manual Input
    const manualBtn = document.getElementById('btn-manual-verify');
    const manualInput = document.getElementById('scan-manual-input');
    if (manualBtn && manualInput) {
      manualBtn.addEventListener('click', () => {
        if (manualInput.value.trim()) {
          controller.processScan(manualInput.value.trim().toUpperCase());
          manualInput.value = '';
        }
      });
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          manualBtn.click();
        }
      });
    }

    // Camera Start Button
    const camStartBtn = document.getElementById('btn-start-camera');
    if (camStartBtn) {
      camStartBtn.addEventListener('click', () => {
        controller.startCamera();
      });
    }
  }
}
