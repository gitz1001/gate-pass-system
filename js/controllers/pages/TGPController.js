export default class TGPController {
  static bind(controller) {
    const modal = document.getElementById('modal-tgp');
    const btnAdd = document.getElementById('btn-add-tgp');
    const btnClose = document.getElementById('btn-close-tgp');
    const btnCancel = document.getElementById('btn-cancel-tgp');
    const form = document.getElementById('form-tgp');

    if (btnAdd && modal) btnAdd.addEventListener('click', () => modal.style.display = 'flex');
    if (btnClose && modal) btnClose.addEventListener('click', () => modal.style.display = 'none');
    if (btnCancel && modal) btnCancel.addEventListener('click', (e) => { e.preventDefault(); modal.style.display = 'none'; });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = document.getElementById('tgp-student').value;
        const validDate = document.getElementById('tgp-date').value;
        const gate = document.getElementById('tgp-gate').value;
        const reason = document.getElementById('tgp-reason').value;
        const requester = document.getElementById('tgp-requester').value;

        const newTGP = {
          id: 'TGP-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          studentId,
          validDate,
          gate,
          reason,
          requester,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        await controller.model.addTGP(newTGP);
        controller.view.showToast('TGP Request Submitted');
        modal.style.display = 'none';
        form.reset();
        controller.navigateToPage('tgp');
      });
    }

    // RBAC: Hide action buttons if guard
    if (controller.model.currentUser && controller.model.currentUser.role === 'guard') {
      document.querySelectorAll('.btn-tgp-action').forEach(btn => btn.style.display = 'none');
      if (btnAdd) btnAdd.style.display = 'none';
    }

    // Action buttons (Approve/Reject)
    document.querySelectorAll('.btn-tgp-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const action = e.currentTarget.dataset.action;
        
        if (confirm(`Are you sure you want to ${action === 'approved' ? 'APPROVE' : 'REJECT'} this pass?`)) {
          await controller.model.updateTGPStatus(id, action);
          controller.view.showToast(`Pass ${action}`);
          controller.navigateToPage('tgp');
        }
      });
    });

    // Pill filters
    const pills = document.querySelectorAll('#tgp-table-filters .pill, button.pill[data-filter]');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('on'));
        e.currentTarget.classList.add('on');
        const filter = e.currentTarget.dataset.filter || 'all';
        const rows = document.querySelectorAll('#tgp-table tbody tr');
        
        rows.forEach(row => {
          if (row.querySelector('.empty')) return;
          const status = row.dataset.status;
          row.style.display = (filter === 'all' || status === filter) ? '' : 'none';
        });
      });
    });
  }
}
