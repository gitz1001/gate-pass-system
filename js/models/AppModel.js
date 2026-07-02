export default class AppModel {
  constructor() {
    this.students = JSON.parse(localStorage.getItem('pgp_students') || '[]');
    this.exitLogs = JSON.parse(localStorage.getItem('pgp_logs') || '[]');
    this.tgp = JSON.parse(localStorage.getItem('pgp_tgp') || '[]');

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

  save() {
    this.saveStudents();
    this.saveLogs();
    this.saveTGP();
  }

  saveStudents() {
    localStorage.setItem('pgp_students', JSON.stringify(this.students));
  }

  saveLogs() {
    localStorage.setItem('pgp_logs', JSON.stringify(this.exitLogs));
  }

  saveTGP() {
    localStorage.setItem('pgp_tgp', JSON.stringify(this.tgp));
  }

  // ── Student CRUD ────────────────────────────────────────
  addStudent(student) {
    this.students.push(student);
    this.saveStudents();
  }

  removeStudent(id) {
    this.students = this.students.filter(s => s.id !== id);
    this.saveStudents();
  }

  getStudentByPassId(id) {
    return this.students.find(s => s.id === id);
  }

  getStudentByStudId(studid) {
    return this.students.find(s => s.studid === studid || s.id === studid);
  }

  updateStudentStatus(id, status) {
    const student = this.students.find(s => s.id === id);
    if (student) {
      student.status = status;
      this.saveStudents();
    }
  }

  // ── Exit Log CRUD ───────────────────────────────────────
  addExitLog(logEntry) {
    this.exitLogs.unshift(logEntry);
    this.saveLogs();
  }

  clearLogs() {
    this.exitLogs = [];
    this.saveLogs();
  }

  // ── TGP CRUD ────────────────────────────────────────────
  addTGP(tgpEntry) {
    this.tgp.unshift(tgpEntry);
    this.saveTGP();
  }

  updateTGPStatus(id, status) {
    const pass = this.tgp.find(t => t.id === id);
    if (pass) {
      pass.status = status;
      this.saveTGP();
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
