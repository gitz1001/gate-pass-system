import Dialog from '../../services/Dialog.js';
import { debounce } from '../../utils.js';

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

    const debouncedFilter = debounce(filterTable, 250);

    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('on'));
        e.currentTarget.classList.add('on');
        filterTable(); // Instant response for pills
      });
    });

    if (searchIn) searchIn.addEventListener('input', debouncedFilter);

    // Status Updates
    document.querySelectorAll('.btn-status-update').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const action = e.currentTarget.dataset.action;
        const confirmMsg = action === 'revoked' 
          ? 'Revoke this pass permanently?' 
          : action === 'suspended' 
            ? 'Suspend this pass temporarily?' 
            : 'Reactivate this pass?';
            
        const confirmed = await Dialog.confirm(
          'Update Pass Status',
          confirmMsg,
          { 
            confirmText: 'Yes, Update', 
            type: action === 'revoked' ? 'danger' : action === 'suspended' ? 'warning' : 'primary' 
          }
        );
            
        if (confirmed) {
          await controller.model.updateStudentStatus(id, action);
          controller.view.showToast(`Pass status updated to ${action}`);
          controller.navigateToPage('pgp'); // Refresh view
        }
      });
    });
  }
}
