export default class LoginController {
  static bind(controller) {
    document.querySelectorAll('.btn-login-role').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const role = target.dataset.role;
        const name = target.dataset.name;
        controller.model.login({ role, name });
        controller.view.showToast(`Logged in as ${name}`);
        controller.performSync();
        controller.navigateToPage('dashboard');
      });
    });
  }
}
