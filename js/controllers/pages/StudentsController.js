export default class StudentsController {
  static bind(controller) {
    // Wizard state
    controller.currentWizardStep = 1;

    // Show wizard modal
    const btnAdd = document.getElementById('btn-add-student');
    const wizardModal = document.getElementById('modal-wizard');
    if (btnAdd && wizardModal) {
      btnAdd.addEventListener('click', () => {
        wizardModal.style.display = 'flex';
        controller.goToWizardStep(1);
        document.getElementById('form-enroll').reset();
        document.getElementById('w-photo-preview').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
      });
    }
}
