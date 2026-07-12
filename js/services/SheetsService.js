// ════════════════════════════════════════════════════════════════
// SheetsService — Google Sheets API Wrapper
// All network calls to the Apps Script Web App go through here.
// ════════════════════════════════════════════════════════════════

const API_URL = 'https://script.google.com/macros/s/AKfycbzgwT0E6lmE0xJ2wi_cbuA70BeiiCp7zoZZMVmr2xXBJ6soOEHY7hOESV1jMYpxsPevIA/exec';

export default class SheetsService {

  // ── Generic GET request ───────────────────────────────────
  static async get(action, params = {}) {
    const query = new URLSearchParams({ action, ...params }).toString();
    const url = `${API_URL}?${query}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json.data;
  }

  // ── Generic POST request ──────────────────────────────────
  static async post(action, body = {}) {
    const url = `${API_URL}?action=${action}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json.data;
  }

  // ── Bulk fetch (single network call for ALL data) ─────────
  static async getAll() {
    return this.get('getAll');
  }

  // ── Students ──────────────────────────────────────────────
  static async getStudents() { return this.get('getStudents'); }

  static async addStudent(student) {
    return this.post('addStudent', student);
  }

  static async updateStudentStatus(id, status) {
    return this.get('updateStudentStatus', { id, status });
  }

  static async removeStudent(id) {
    return this.get('removeStudent', { id });
  }

  // ── Scan Logs ─────────────────────────────────────────────
  static async getLogs() { return this.get('getLogs'); }

  static async addLog(logEntry) {
    return this.post('addLog', logEntry);
  }

  // ── Temporary Gate Passes ─────────────────────────────────
  static async getTGP() { return this.get('getTGP'); }

  static async addTGP(tgp) {
    return this.post('addTGP', tgp);
  }

  static async updateTGPStatus(id, status) {
    return this.get('updateTGPStatus', { id, status });
  }

  // ── Users ─────────────────────────────────────────────────
  static async getUsers() { return this.get('getUsers'); }
}
