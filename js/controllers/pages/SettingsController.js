import Dialog from '../../services/Dialog.js';

export default class SettingsController {
  static bind(controller) {
    // Theme Select
    const themeSel = document.getElementById('settings-theme');
    if (themeSel) {
      themeSel.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'auto') {
          controller.model.setTheme(null);
          controller.view.applyTheme('auto');
        } else {
          controller.model.setTheme(val);
          controller.view.applyTheme(val);
        }
        controller.view.showToast('Theme preference updated');
      });
    }

    // Export Data
    const btnExport = document.getElementById('settings-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const data = {
          exportDate: new Date().toISOString(),
          students: controller.model.students,
          exitLogs: controller.model.exitLogs,
          tgp: controller.model.tgp
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PGP_Backup_${new Date().toLocaleDateString('en-CA')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        controller.view.showToast('Data exported successfully');
      });
    }

    // Import Data
    const btnImport = document.getElementById('settings-import-btn');
    const fileImport = document.getElementById('settings-import-file');
    
    if (btnImport && fileImport) {
      btnImport.addEventListener('click', () => fileImport.click());
      
      fileImport.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const confirmed = await Dialog.confirm(
          'Import Data',
          'Are you sure you want to import data? This will overwrite existing students, logs, and TGPs. This action cannot be undone.',
          { confirmText: 'Yes, Import', type: 'warning' }
        );
        if (confirmed) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              if (data.students) controller.model.students = data.students;
              if (data.exitLogs) controller.model.exitLogs = data.exitLogs;
              if (data.tgp) controller.model.tgp = data.tgp;
              
              controller.model.cacheAll();
              
              controller.view.showToast('Data imported successfully. Refreshing...', 'success');
              setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
              console.error(err);
              controller.view.showToast('Error importing data. Invalid JSON format.', 'error');
            }
          };
          reader.readAsText(file);
        }
        fileImport.value = ''; // Reset input
      });
    }

    // Clear Data
    const btnClear = document.getElementById('settings-clear-db');
    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        const confirmed1 = await Dialog.confirm(
          'CRITICAL WARNING',
          'This will permanently delete ALL students and logs. Are you absolutely sure?',
          { confirmText: 'Delete All', type: 'danger' }
        );
        if (confirmed1) {
          const confirmed2 = await Dialog.confirm(
            'Final Confirmation',
            'Are you REALLY sure? This cannot be undone.',
            { confirmText: 'Yes, Delete Everything', type: 'danger' }
          );
          if (confirmed2) {
            controller.model.students = [];
            controller.model.exitLogs = [];
            controller.model.tgp = [];
            controller.model.cacheAll();
            controller.view.showToast('All database records cleared', 'error');
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      });
    }
  }
}
