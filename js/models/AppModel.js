export default class AppModel {
  constructor() {
    this.students = JSON.parse(localStorage.getItem('pgp_students') || '[]');
    this.exitLogs = JSON.parse(localStorage.getItem('pgp_logs') || '[]');
  }

  save() {
    localStorage.setItem('pgp_students', JSON.stringify(this.students));
    localStorage.setItem('pgp_logs', JSON.stringify(this.exitLogs));
  }

  addStudent(student) {
    this.students.push(student);
    this.save();
  }

  removeStudent(id) {
    this.students = this.students.filter(s => s.id !== id);
    this.save();
  }

  getStudentByPassId(id) {
    return this.students.find(s => s.id === id);
  }

  getStudentByStudId(studid) {
    return this.students.find(s => s.studid === studid || s.id === studid);
  }

  addExitLog(logEntry) {
    this.exitLogs.unshift(logEntry);
    this.save();
  }

  clearLogs() {
    this.exitLogs = [];
    this.save();
  }
}
