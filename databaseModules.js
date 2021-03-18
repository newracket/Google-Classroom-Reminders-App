const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reminders.db');

module.exports = {
  name: "databaseModule",
  initialize() {
    return new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS reminders (
        date TEXT,
        dueDate TEXT,
        reminder TEXT,
        class TEXT,
        timesReminded INT DEFAULT 0
      );`);
    });
  },
  addReminder(date, dueDate, content, className) {
    return new Promise((resolve, reject) => {
      db.run(`INSERT INTO reminders (date, dueDate, reminder, class) VALUES ("${date}", "${dueDate}", "${content}", "${className}")`, (err, rows) => {
        console.log(rows);
        console.log(err);
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  },
  getReminders() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM reminders`, [], (err, rows) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(rows);
        }
      });
    });
  },
  removeReminder(date, dueDate, content, className) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM reminders WHERE date="${date}" AND reminder="${content}" AND dueDate="${dueDate}" AND class="${className}"`, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(err);
        }
      });
    });
  }
}