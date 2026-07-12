export default class LoginController {
  static bind(controller) {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usernameInput = document.getElementById('login-username').value.trim();
      const passwordInput = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-login-submit');

      if (!usernameInput || !passwordInput) return;

      // Visual feedback
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Verifying...';
      submitBtn.disabled = true;

      try {
        const user = await controller.model.authenticateUser(usernameInput, passwordInput);
        
        if (user) {
          controller.view.showToast(`Welcome back, ${user.name}`);
          controller.performSync(); // Pull latest data for this user
          controller.navigateToPage('dashboard');
        } else {
          controller.view.showToast('Invalid username or password', 'error');
          document.getElementById('login-password').value = '';
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      } catch (err) {
        console.error('Login error:', err);
        controller.view.showToast('Network error while logging in', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}
