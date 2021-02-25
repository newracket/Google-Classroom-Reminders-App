const classroom = require("./classroom");
const fs = require("fs");
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reminders.db');
const notifier = require("node-notifier");
const { container } = require("googleapis/build/src/apis/container");

const sortedWork = {};
const monthDictionary = { "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "May", "June": "Jun", "July": "Jul", "August": "Aug", "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec" }
const dayDictionary = { "Sunday": "Sun", "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat" }

// const scopes = ['https://www.googleapis.com/auth/classroom.courses.readonly', 'https://www.googleapis.com/auth/classroom.coursework.me.readonly'];
// classroom.authenticate(scopes)
//   .then(client => classroom.runSample(client).then(() => updateClasswork(classroom.showWork())))
//   .catch(console.error);

document.getElementById("confirmReminder").addEventListener("click", function () {
  const reminderDate = document.getElementById("reminderDate").value;
  const remindersToAdd = [...document.querySelectorAll("input[type='checkbox'")].filter(checkbox => checkbox.checked);

  remindersToAdd.forEach(reminderToAdd => {
    db.run(`INSERT INTO reminders (date, reminder, class) VALUES ("${reminderDate}", "${reminderToAdd.getAttribute("data-reminderContent")}", "${reminderToAdd.getAttribute("data-reminderClass")}")`, function (err) {
      if (err) {
        return console.log(err.message);
      }
    });

    reminderToAdd.checked = false;
  })
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reminders (
    date TEXT,
    reminder TEXT,
    class TEXT,
    timesReminded INT DEFAULT 0
  );`);

  updateClasswork(classroom.showWork());

  setInterval(function () {
    db.all(`SELECT * FROM reminders`, [], (err, rows) => {
      if (err) {
        throw err;
      }

      const classworkJSON = classroom.showWork();
      console.log(rows);

      rows.forEach(row => {
        if (new Date(row.date) < new Date()) {
          if (row.timesReminded % 1 == 0) {
            const assignment = classworkJSON.find(e => e.title == row.reminder);
            
            const dueDate = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day, assignment.dueTime.hours - 8, assignment.dueTime.minutes);

            notifier.notify({
              title: `Reminder for ${row.class}`,
              message: `Reminder to do the assignment ${row.reminder}\nDue on ${dueDate.toString().split(" GM")[0]}`,
              icon: "./googleclassroomicon.png",
              wait: true,
              sound: true
            });

            notifier.on('click', function (notifierObject, options, event) {
              db.run(`DELETE FROM reminders WHERE date="${row.date}"`);
            });
          }

          db.run(`UPDATE reminders SET timesReminded=${row.timesReminded + 1} WHERE date="${row.date}"`);
        }
      });
    });
  }, 3000/*00*/);
});

function updateClasswork(classworkJSON) {
  const classesContainer = document.getElementById("classesContainer");
  while (classesContainer.firstChild) {
    classesContainer.removeChild(classesContainer.firstChild);
  }

  classworkJSON.forEach(w => {
    if (sortedWork[w.class.name] == undefined) {
      sortedWork[w.class.name] = [];
    }
    sortedWork[w.class.name].push(w);
  });

  Object.entries(sortedWork).forEach(([className, classWork]) => {
    const classElement = document.createElement("div");
    classElement.classList.add("classItem");

    const classInfoItem = document.createElement("div");
    const classNameElement = document.createElement("p");
    const sectionElement = document.createElement("p");
    const classNameText = document.createTextNode(className);
    const sectionText = document.createTextNode(classWork[0].class.section)
    classNameElement.appendChild(classNameText);
    sectionElement.appendChild(sectionText);
    classNameElement.classList.add("className");
    sectionElement.classList.add("section");

    classInfoItem.appendChild(classNameElement);
    classInfoItem.appendChild(sectionElement);
    classInfoItem.classList.add("classInfoItem");
    classElement.appendChild(classInfoItem);

    classWork.forEach(assignment => {
      const assignmentElement = document.createElement("div");
      const dueDate = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day, assignment.dueTime.hours - 8, assignment.dueTime.minutes)
        .toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
        .split(" ").map(word => monthDictionary[word] != undefined ? `${monthDictionary[word]}.` : word)
        .map(word => dayDictionary[word.slice(0, -1)] != undefined ? `${dayDictionary[word.slice(0, -1)]},` : word).join(" ");

      const assignmentTextElement = document.createElement("div");
      const assignmentNameElement = document.createElement("span");
      const assignmentNameText = document.createTextNode(assignment.title);
      assignmentNameElement.appendChild(assignmentNameText);
      assignmentNameElement.classList.add("assignmentName");
      const assignmentLineBreak = document.createElement("br");
      const assignmentDueDateText = document.createTextNode(dueDate);
      assignmentTextElement.appendChild(assignmentNameElement);
      assignmentTextElement.appendChild(assignmentLineBreak);
      assignmentTextElement.appendChild(assignmentDueDateText);
      assignmentTextElement.classList.add("assignmentDiv");
      assignmentNameElement.setAttribute("data-title", assignment.title);
      assignmentNameElement.setAttribute("data-description", assignment.description);

      assignmentNameElement.addEventListener("click", function () {
        const title = this.dataset.title;
        const description = this.dataset.description;

        console.log(title);
        console.log(description);
      });

      const reminderCheckbox = document.createElement("input");
      reminderCheckbox.setAttribute("type", "checkbox");
      reminderCheckbox.setAttribute("data-reminderContent", assignment.title);
      reminderCheckbox.setAttribute("data-reminderClass", className);

      assignmentElement.classList.add("assignmentItem");
      assignmentElement.appendChild(reminderCheckbox);
      assignmentElement.appendChild(assignmentTextElement);
      classElement.appendChild(assignmentElement);
    });
    classesContainer.appendChild(classElement);
  });

  console.log("Classwork Updated!");
}