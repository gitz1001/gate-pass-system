export default class AppModel {
  constructor() {
    this.students = JSON.parse(localStorage.getItem('pgp_students') || '[]');
    this.exitLogs = JSON.parse(localStorage.getItem('pgp_logs') || '[]');
    this.tgp = JSON.parse(localStorage.getItem('pgp_tgp') || '[]');
    this.emailQueue = JSON.parse(localStorage.getItem('pgp_email_queue') || '[]');

    // Session: requires BOTH localStorage (profile) AND sessionStorage (browser-alive flag)
    const profile = JSON.parse(localStorage.getItem('pgp_session') || 'null');
    const browserAlive = sessionStorage.getItem('pgp_browser_alive');
    this.currentUser = (profile && browserAlive) ? profile : null;

    // If profile exists but browser flag is gone (tab was closed), clear stale session
    if (profile && !browserAlive) {
      localStorage.removeItem('pgp_session');
    }

    // Session timeout (15 minutes = 900000ms)
    this.SESSION_TIMEOUT = 15 * 60 * 1000;
  }

  async save() {
    await Promise.all([this.saveStudents(), this.saveLogs(), this.saveTGP()]);
  }

  async saveStudents() {
    localStorage.setItem('pgp_students', JSON.stringify(this.students));
    return Promise.resolve();
  }

  async saveLogs() {
    localStorage.setItem('pgp_logs', JSON.stringify(this.exitLogs));
    return Promise.resolve();
  }

  async saveTGP() {
    localStorage.setItem('pgp_tgp', JSON.stringify(this.tgp));
    return Promise.resolve();
  }

  async saveEmailQueue() {
    localStorage.setItem('pgp_email_queue', JSON.stringify(this.emailQueue));
    return Promise.resolve();
  }

  // ── Student CRUD ────────────────────────────────────────
  async addStudent(student) {
    this.students.push(student);
    await this.saveStudents();
  }

  async removeStudent(id) {
    this.students = this.students.filter(s => s.id !== id);
    await this.saveStudents();
  }

  getStudentByPassId(id) {
    return this.students.find(s => s.id === id);
  }

  getStudentByStudId(studid) {
    return this.students.find(s => s.studid === studid || s.id === studid);
  }

  async updateStudentStatus(id, status) {
    const student = this.students.find(s => s.id === id);
    if (student) {
      student.status = status;
      await this.saveStudents();
    }
  }

  // ── Exit Log CRUD ───────────────────────────────────────
  async addExitLog(logEntry) {
    this.exitLogs.unshift(logEntry);
    await this.saveLogs();
  }

  async clearLogs() {
    this.exitLogs = [];
    await this.saveLogs();
  }

  // ── Email Queue CRUD ────────────────────────────────────
  async addEmailToQueue(emailParams) {
    this.emailQueue.push(emailParams);
    await this.saveEmailQueue();
  }

  async removeEmailFromQueue(index) {
    this.emailQueue.splice(index, 1);
    await this.saveEmailQueue();
  }

  // ── TGP CRUD ────────────────────────────────────────────
  async addTGP(tgpEntry) {
    this.tgp.unshift(tgpEntry);
    await this.saveTGP();
  }

  async updateTGPStatus(id, status) {
    const pass = this.tgp.find(t => t.id === id);
    if (pass) {
      pass.status = status;
      await this.saveTGP();
    }
  }

  getTGP(id) {
    return this.tgp.find(t => t.id === id);
  }

  // ── Theme Preference ───────────────────────────────────
  getTheme() {
    return localStorage.getItem('pgp_theme') || null;
  }

  setTheme(theme) {
    if (theme) {
      localStorage.setItem('pgp_theme', theme);
    } else {
      localStorage.removeItem('pgp_theme');
    }
  }

  // ── Sidebar State ──────────────────────────────────────
  getSidebarCollapsed() {
    return localStorage.getItem('pgp_sidebar') === 'collapsed';
  }

  setSidebarCollapsed(collapsed) {
    localStorage.setItem('pgp_sidebar', collapsed ? 'collapsed' : 'expanded');
  }

  // ── Authentication ───────────────────────────────────────
  login(userPayload) {
    // Enrich payload with metadata
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

  // ── Activity Tracking ──────────────────────────────────
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
