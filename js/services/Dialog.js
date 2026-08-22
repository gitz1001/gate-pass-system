import Icons from '../icons.js';

export default class Dialog {
  /**
   * Show a confirmation dialog.
   * @param {string} title - The title of the dialog
   * @param {string} message - The main message body
   * @param {Object} options - Options object
   * @param {string} [options.confirmText='Confirm'] - Text for confirm button
   * @param {string} [options.cancelText='Cancel'] - Text for cancel button
   * @param {string} [options.type='primary'] - 'primary', 'danger', 'warning'
   * @returns {Promise<boolean>} True if confirmed, false if canceled
   */
  static confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const {
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'primary'
      } = options;

      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      let iconHtml = '';
      if (type === 'danger') {
        iconHtml = `<div class="dialog-icon danger">${Icons.alert || '⚠'}</div>`;
      } else if (type === 'warning') {
        iconHtml = `<div class="dialog-icon warning">${Icons.alert || '⚠'}</div>`;
      } else {
        iconHtml = `<div class="dialog-icon info">${Icons.info || 'ℹ'}</div>`;
      }

      overlay.innerHTML = `
        <div class="dialog-box">
          <div class="dialog-head">
            ${iconHtml}
            <div class="dialog-title">${this.escape(title)}</div>
          </div>
          <div class="dialog-body">
            ${this.escape(message)}
          </div>
          <div class="dialog-foot">
            <button class="dialog-btn cancel" id="dlg-cancel">${this.escape(cancelText)}</button>
            <button class="dialog-btn ${type}" id="dlg-confirm">${this.escape(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const closeDialog = (result) => {
        overlay.classList.add('closing');
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          resolve(result);
        }, 200); // Wait for fade-out animation
      };

      overlay.querySelector('#dlg-cancel').addEventListener('click', () => closeDialog(false));
      overlay.querySelector('#dlg-confirm').addEventListener('click', () => closeDialog(true));
      
      // Allow clicking outside to cancel (optional, but good UX)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog(false);
      });

      // Keyboard: Escape to cancel, Enter to confirm
      const keyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); closeDialog(false); }
        if (e.key === 'Enter') { e.preventDefault(); closeDialog(true); }
      };
      document.addEventListener('keydown', keyHandler);
      // Cleanup listener when dialog closes (patch into closeDialog)
      const origClose = closeDialog;
      const closeDialogWithCleanup = (result) => {
        document.removeEventListener('keydown', keyHandler);
        origClose(result);
      };
      // Re-bind buttons to use cleanup version
      overlay.querySelector('#dlg-cancel').onclick = () => closeDialogWithCleanup(false);
      overlay.querySelector('#dlg-confirm').onclick = () => closeDialogWithCleanup(true);
      overlay.onclick = (e) => { if (e.target === overlay) closeDialogWithCleanup(false); };
    });
  }

  /**
   * Show a prompt dialog for user input.
   * @param {string} title 
   * @param {string} message 
   * @param {string} defaultValue 
   * @returns {Promise<string|null>} The inputted string, or null if canceled
   */
  static prompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      overlay.innerHTML = `
        <div class="dialog-box">
          <div class="dialog-head">
            <div class="dialog-icon info">${Icons.edit || '✎'}</div>
            <div class="dialog-title">${this.escape(title)}</div>
          </div>
          <div class="dialog-body">
            ${this.escape(message)}
            <input type="text" class="dialog-input" id="dlg-input" value="${this.escape(defaultValue)}" />
          </div>
          <div class="dialog-foot">
            <button class="dialog-btn cancel" id="dlg-cancel">Cancel</button>
            <button class="dialog-btn primary" id="dlg-confirm">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const input = overlay.querySelector('#dlg-input');
      // Auto focus input
      setTimeout(() => input.focus(), 50);

      const closeDialog = (result) => {
        overlay.classList.add('closing');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 200);
      };

      overlay.querySelector('#dlg-cancel').addEventListener('click', () => closeDialog(null));
      overlay.querySelector('#dlg-confirm').addEventListener('click', () => closeDialog(input.value));
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') closeDialog(input.value);
        if (e.key === 'Escape') closeDialog(null);
      });
    });
  }

  static escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
