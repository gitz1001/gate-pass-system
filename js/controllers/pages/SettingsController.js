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
}
