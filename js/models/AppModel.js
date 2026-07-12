import SheetsService from '../services/SheetsService.js';

// ════════════════════════════════════════════════════════════════
// AppModel — Data Layer with Google Sheets + localStorage Cache
// ════════════════════════════════════════════════════════════════
// Data flows:
//   READ:  Google Sheet → localStorage cache → Views
//   WRITE: Views → Google Sheet + localStorage cache
//   OFFLINE: Falls back to localStorage cache automatically
// ════════════════════════════════════════════════════════════════

export default class AppModel {
  constructor() {
    // Load cached data from localStorage (instant load)
    this.students = JSON.parse(localStorage.getItem('pgp_students') || '[]');
    this.exitLogs = JSON.parse(localStorage.getItem('pgp_logs') || '[]');
    this.tgp = JSON.parse(localStorage.getItem('pgp_tgp') || '[]');
    this.users = JSON.parse(localStorage.getItem('pgp_users') || '[]');
    this.emailQueue = JSON.parse(localStorage.getItem('pgp_email_queue') || '[]');

    // Session management
    const profile = JSON.parse(localStorage.getItem('pgp_session') || 'null');
    const browserAlive = sessionStorage.getItem('pgp_browser_alive');
    this.currentUser = (profile && browserAlive) ? profile : null;
    if (profile && !browserAlive) localStorage.removeItem('pgp_session');

    // Sync state
    this.lastSyncTime = parseInt(localStorage.getItem('pgp_last_sync') || '0');
    this.syncStatus = 'idle'; // 'idle' | 'syncing' | 'error'
    this.isOnline = navigator.onLine;

    // Session timeout (15 minutes)
    this.SESSION_TIMEOUT = 15 * 60 * 1000;

    // Offline write queue (for writes that failed due to no internet)
    this.writeQueue = JSON.parse(localStorage.getItem('pgp_write_queue') || '[]');
  }

  // ════════════════════════════════════════════════════════════
  // SYNC ENGINE — Pulls fresh data from Google Sheets
  // ════════════════════════════════════════════════════════════

  async syncFromSheet() {
    this.syncStatus = 'syncing';
    try {
      const data = await SheetsService.getAll();

      // Map Sheet columns to frontend field names
      this.students = (data.students || []).map(s => this.mapStudentFromSheet(s));
      this.exitLogs = (data.scan_logs || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.tgp = data.temporary_passes || [];
      this.users = data.users || [];

      // Cache to localStorage
      this.cacheAll();
      this.lastSyncTime = Date.now();
      localStorage.setItem('pgp_last_sync', this.lastSyncTime.toString());
      this.syncStatus = 'idle';
      this.isOnline = true;

      // Process any queued offline writes
      await this.processWriteQueue();

      return true;
    } catch (err) {
      console.error('Sync failed:', err);
      this.syncStatus = 'error';
      this.isOnline = false;
      return false;
    }
  }

  // ── Field Mapping: Sheet → Frontend ───────────────────────
  mapStudentFromSheet(s) {
    return {
      id: String(s.PassID || ''),
      pgp: String(s.PassID || ''),
      studid: String(s.StudentID || ''),
      lastName: s.LastName || '',
      firstName: s.FirstName || '',
      midName: s.MidName || '',
      name: this.buildFullName(s.LastName, s.FirstName, s.MidName),
      grade: s.GradeLevel || '',
      section: '',
      fullSection: s.GradeLevel || '',
      schoolYear: s.SchoolYear || '',
      arrangements: s.Arrangements || '',
      preferredGate: s.PreferredGate || '',
      vehicleDetails: s.VehicleDetails || '',
      parentName: s.ParentName || '',
      parentEmail: s.ParentEmail || '',
      phone: String(s.ParentMobile || ''),
      photo: s.photo || '',
      status: s.status || 'active'
    };
  }

  // ── Field Mapping: Frontend → Sheet ───────────────────────
  mapStudentToSheet(s) {
    return {
      PassID: s.pgp || s.id || '',
      StudentID: s.studid || '',
      LastName: s.lastName || '',
      FirstName: s.firstName || '',
      MidName: s.midName || '',
      GradeLevel: s.grade || s.fullSection || '',
      SchoolYear: s.schoolYear || '',
      Arrangements: s.arrangements || '',
      PreferredGate: s.preferredGate || '',
      VehicleDetails: s.vehicleDetails || '',
      ParentName: s.parentName || '',
      ParentEmail: s.parentEmail || '',
      ParentMobile: s.phone || '',
      photo: s.photo || '',
      status: s.status || 'active'
    };
  }

  // ── Name Helpers ──────────────────────────────────────────
  buildFullName(last, first, mid) {
    const parts = [];
    if (last) parts.push(last + ',');
    if (first) parts.push(first);
    if (mid) parts.push(mid.charAt(0) + '.');
    return parts.join(' ') || 'Unknown';
  }

  extractGrade(section) {
    // "Grade 7 - Diligence" → "Grade 7"
    const match = section.match(/^(.*?)\s*-/);
    return match ? match[1].trim() : section;
  }

  extractSection(section) {
    // "Grade 7 - Diligence" → "Diligence"
    const match = section.match(/-\s*(.+)$/);
    return match ? match[1].trim() : '';
  }

  // ── Cache all data to localStorage ────────────────────────
  cacheAll() {
    localStorage.setItem('pgp_students', JSON.stringify(this.students));
    localStorage.setItem('pgp_logs', JSON.stringify(this.exitLogs));
    localStorage.setItem('pgp_tgp', JSON.stringify(this.tgp));
    localStorage.setItem('pgp_users', JSON.stringify(this.users));
  }

  // ════════════════════════════════════════════════════════════
  // OFFLINE WRITE QUEUE
  // ════════════════════════════════════════════════════════════

  async queueWrite(action, data) {
    this.writeQueue.push({ action, data, timestamp: Date.now() });
    localStorage.setItem('pgp_write_queue', JSON.stringify(this.writeQueue));
  }

  async processWriteQueue() {
    if (this.writeQueue.length === 0) return;
    console.log(`Processing ${this.writeQueue.length} queued writes...`);

    const remaining = [];
    for (const item of this.writeQueue) {
      try {
        if (item.action === 'addStudent') await SheetsService.addStudent(item.data);
        else if (item.action === 'addLog') await SheetsService.addLog(item.data);
        else if (item.action === 'addTGP') await SheetsService.addTGP(item.data);
        else if (item.action === 'updateTGPStatus') await SheetsService.updateTGPStatus(item.data.id, item.data.status);
        else if (item.action === 'updateStudentStatus') await SheetsService.updateStudentStatus(item.data.id, item.data.status);
        else if (item.action === 'removeStudent') await SheetsService.removeStudent(item.data.id);
        console.log('Queued write sent:', item.action);
      } catch (err) {
        console.error('Queued write failed, keeping in queue:', err);
        remaining.push(item);
      }
    }
    this.writeQueue = remaining;
    localStorage.setItem('pgp_write_queue', JSON.stringify(this.writeQueue));
  }

  // ════════════════════════════════════════════════════════════
  // STUDENT CRUD — Writes to Sheet + updates local cache
  // ════════════════════════════════════════════════════════════

  async addStudent(student) {
    // Add to local cache immediately
    this.students.push(student);
    localStorage.setItem('pgp_students', JSON.stringify(this.students));

    // Write to Sheet
    const sheetData = this.mapStudentToSheet(student);
    try {
      await SheetsService.addStudent(sheetData);
    } catch (err) {
      console.error('Failed to write student to Sheet, queuing...', err);
      await this.queueWrite('addStudent', sheetData);
    }
  }

  async removeStudent(id) {
    this.students = this.students.filter(s => s.id !== id);
    localStorage.setItem('pgp_students', JSON.stringify(this.students));

    try {
      await SheetsService.removeStudent(id);
    } catch (err) {
      console.error('Failed to remove student from Sheet, queuing...', err);
      await this.queueWrite('removeStudent', { id });
    }
  }

  getStudentByPassId(id) {
    return this.students.find(s => s.id === id || s.pgp === id);
  }

  getStudentByStudId(studid) {
    return this.students.find(s => s.studid === studid || s.id === studid);
  }

  async updateStudentStatus(id, status) {
    const student = this.students.find(s => s.id === id);
    if (student) {
      student.status = status;
      localStorage.setItem('pgp_students', JSON.stringify(this.students));

      try {
        await SheetsService.updateStudentStatus(id, status);
      } catch (err) {
        console.error('Failed to update status on Sheet, queuing...', err);
        await this.queueWrite('updateStudentStatus', { id, status });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // EXIT LOG CRUD
  // ════════════════════════════════════════════════════════════

  async addExitLog(logEntry) {
    this.exitLogs.unshift(logEntry);
    localStorage.setItem('pgp_logs', JSON.stringify(this.exitLogs));

    try {
      await SheetsService.addLog(logEntry);
    } catch (err) {
      console.error('Failed to write log to Sheet, queuing...', err);
      await this.queueWrite('addLog', logEntry);
    }
  }

  async clearLogs() {
    this.exitLogs = [];
    localStorage.setItem('pgp_logs', JSON.stringify(this.exitLogs));
  }

  // ════════════════════════════════════════════════════════════
  // EMAIL QUEUE
  // ════════════════════════════════════════════════════════════

  async addEmailToQueue(emailParams) {
    this.emailQueue.push(emailParams);
    localStorage.setItem('pgp_email_queue', JSON.stringify(this.emailQueue));
  }

  async removeEmailFromQueue(index) {
    this.emailQueue.splice(index, 1);
    localStorage.setItem('pgp_email_queue', JSON.stringify(this.emailQueue));
  }

  // ════════════════════════════════════════════════════════════
  // TGP CRUD
  // ════════════════════════════════════════════════════════════

  async addTGP(tgpEntry) {
    this.tgp.unshift(tgpEntry);
    localStorage.setItem('pgp_tgp', JSON.stringify(this.tgp));

    try {
      await SheetsService.addTGP(tgpEntry);
    } catch (err) {
      console.error('Failed to write TGP to Sheet, queuing...', err);
      await this.queueWrite('addTGP', tgpEntry);
    }
  }

  async updateTGPStatus(id, status) {
    const pass = this.tgp.find(t => t.id === id);
    if (pass) {
      pass.status = status;
      localStorage.setItem('pgp_tgp', JSON.stringify(this.tgp));

      try {
        await SheetsService.updateTGPStatus(id, status);
      } catch (err) {
        console.error('Failed to update TGP status on Sheet, queuing...', err);
        await this.queueWrite('updateTGPStatus', { id, status });
      }
    }
  }

  getTGP(id) {
    return this.tgp.find(t => t.id === id);
  }

  // ════════════════════════════════════════════════════════════
  // AUTHENTICATION — Now checks against users from Google Sheet
  // ════════════════════════════════════════════════════════════

  async authenticateUser(username, password) {
    // Try to fetch fresh users from sheet first
    try {
      this.users = await SheetsService.getUsers();
      localStorage.setItem('pgp_users', JSON.stringify(this.users));
    } catch (err) {
      console.warn('Could not fetch users from Sheet, using cached data');
      // users already loaded from localStorage cache
    }

    const user = this.users.find(u =>
      u.username === username && u.password === password
    );

    if (user) {
      const userPayload = {
        username: user.username,
        name: user.name,
        role: user.role,
        gate: user.gate || '',
        loginTime: new Date().toISOString(),
        lastActivity: Date.now()
      };
      this.currentUser = userPayload;
      localStorage.setItem('pgp_session', JSON.stringify(userPayload));
      sessionStorage.setItem('pgp_browser_alive', '1');
      return userPayload;
    }
    return null;
  }

  login(userPayload) {
    userPayload.loginTime = new Date().toISOString();
    userPayload.lastActivity = Date.now();
    this.currentUser = userPayload;
    localStorage.setItem('pgp_session', JSON.stringify(userPayload));
    sessionStorage.setItem('pgp_browser_alive', '1');
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('pgp_session');
    sessionStorage.removeItem('pgp_browser_alive');
  }

  // ── Theme / Sidebar / Session ─────────────────────────────
  getTheme() { return localStorage.getItem('pgp_theme') || null; }
  setTheme(theme) {
    if (theme) localStorage.setItem('pgp_theme', theme);
    else localStorage.removeItem('pgp_theme');
  }

  getSidebarCollapsed() { return localStorage.getItem('pgp_sidebar') === 'collapsed'; }
  setSidebarCollapsed(c) { localStorage.setItem('pgp_sidebar', c ? 'collapsed' : 'expanded'); }

  updateActivity() {
    if (!this.currentUser) return;
    this.currentUser.lastActivity = Date.now();
    localStorage.setItem('pgp_session', JSON.stringify(this.currentUser));
  }

  isSessionExpired() {
    if (!this.currentUser || !this.currentUser.lastActivity) return true;
    return (Date.now() - this.currentUser.lastActivity) > this.SESSION_TIMEOUT;
  }
}
