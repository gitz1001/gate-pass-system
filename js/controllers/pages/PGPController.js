export default class PGPController {
  static bind(controller) {
    // PGP Filters
    const pills = document.querySelectorAll('#pgp-filters .pill');
    const searchIn = document.getElementById('pgp-search');

    const filterTable = () => {
      const activeFilter = document.querySelector('#pgp-filters .pill.on')?.dataset.filter || 'all';
      const term = (searchIn ? searchIn.value : '').toLowerCase();
      const rows = document.querySelectorAll('#pgp-table tbody tr');

      rows.forEach(row => {
        if (row.querySelector('.empty')) return;
        const status = row.dataset.status;
        const text = row.textContent.toLowerCase();
        
        const matchesStatus = activeFilter === 'all' || status === activeFilter;
        const matchesSearch = text.includes(term);
        
        row.style.display = matchesStatus && matchesSearch ? '' : 'none';
      });
    };

    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('on'));
        e.currentTarget.classList.add('on');
        filterTable();
      });
    });

    if (searchIn) searchIn.addEventListener('input', filterTable);

    // Status Updates
    document.querySelectorAll('.btn-status-update').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const action = e.currentTarget.dataset.action;
        const confirmMsg = action === 'revoked' 
          ? 'Revoke this pass permanently?' 
          : action === 'suspended' 
            ? 'Suspend this pass temporarily?' 
            : 'Reactivate this pass?';
            
        if (confirm(confirmMsg)) {
          controller.model.updateStudentStatus(id, action);
          controller.view.showToast(`Pass status updated to ${action}`);
          controller.navigateToPage('pgp'); // Refresh view
        }
}
