const fs = require("fs");
const path = require("path");

module.exports = {
  name: "databaseModule",
  addReminder(date, dueDate, content, className) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(__dirname, "reminders.json"), "utf8", (err, data) => {
        if (err) {
          return reject(err);
        }
        data = JSON.parse(data);
        data.push({ "id": data.length > 0 ? data.slice(-1)[0].id + 1 : 0, "date": date, "dueDate": dueDate, "reminder": content, "class": className });
        fs.writeFile(path.join(__dirname, "reminders.json"), JSON.stringify(data), (err) => {
          if (err) {
            return reject(err);
          }
          return resolve(err);
        })
      });
    });
  },
  getReminders() {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(__dirname, "reminders.json"), "utf8", (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(JSON.parse(data));
      });
    });
  },
  removeReminders(ids) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(__dirname, "reminders.json"), "utf8", (err, data) => {
        if (err) {
          return reject(err);
        }
        data = JSON.parse(data);
        data = data.filter(reminder => !ids.includes(reminder.id));
        fs.writeFile(path.join(__dirname, "reminders.json"), JSON.stringify(data), (err) => {
          if (err) {
            return reject(err);
          }
          return resolve(data);
        })
      });
    });
  }
}