const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reminders.db');

module.exports = {
  name: "databaseModule",
  initialize() {
    return new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id INT,
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
      db.all(`SELECT * FROM reminders ORDER BY id DESC LIMIT 1`, [], (err, rows) => {
        if (err) {
          reject(err);
        }

        if (rows.length == 0) {
          rows.push({ id: 0 });
        }

        db.run(`INSERT INTO reminders (id, date, dueDate, reminder, class) VALUES (${rows[0].id + 1}, "${date}", "${dueDate}", "${content.replace(/"/g, "'")}", "${className.replace(/"/g, "'")}")`, (err) => {
          if (err) {
            reject(err);
          }
          else {
            resolve();
          }
        });
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
  removeReminders(ids) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM reminders WHERE id=${ids.join(" OR id=")}`, (err) => {
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