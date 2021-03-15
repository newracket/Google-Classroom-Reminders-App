const classroom = require("./classroom");
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reminders.db');
const notifier = require("node-notifier");
const flatpickr = require("flatpickr");

const monthDictionary = { "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "May", "June": "Jun", "July": "Jul", "August": "Aug", "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec" }
const dayDictionary = { "Sunday": "Sun", "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat" }

const reminderDateFpicker = flatpickr("#reminderDate", {
  altInput: true,
  altFormat: "F j, Y",
  dateFormat: "Y-m-d",
  defaultDate: new Date()
});
const reminderTimeFpicker = flatpickr("#reminderTime", {
  enableTime: true,
  noCalendar: true,
  dateFormat: "h:i K",
  defaultDate: new Date(),
  time_24hr: false
});

const scopes = ['https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/classroom.profile.photos'];
// classroom.authenticate(scopes)
//   .then(client => classroom.runSample(client)
//     .then(updateClasswork))
//   .catch(console.error);

Element.prototype.appendChildren = function (...children) {
  children.forEach(child => {
    this.appendChild(child);
  });

  return this;
}

// classroom.authenticateSaved()
//   .then(client => classroom.runSample(client)
//     .then(updateClasswork))
//   .catch(console.error);

document.getElementById("saveReminder").addEventListener("click", () => {
  const reminderName = document.getElementById("reminderName").innerText;
  const reminderClass = document.getElementById("reminderName").dataset.class;
  const reminderDueDate = document.getElementById("reminderDueDate").innerText;

  const reminderDate = new Date(reminderDateFpicker.selectedDates)
  const reminderTime = new Date(reminderTimeFpicker.selectedDates)
  const reminderDateTimeFormatted = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate(), reminderTime.getHours(), reminderTime.getMinutes());

  addReminder(reminderDateTimeFormatted, reminderDueDate, reminderName, reminderClass);
});

db.run(`CREATE TABLE IF NOT EXISTS reminders (
  date TEXT,
  dueDate TEXT,
  reminder TEXT,
  class TEXT,
  timesReminded INT DEFAULT 0
);`);

document.getElementById("reminders").addEventListener("click", showActiveReminders);
document.getElementById("classroom").addEventListener("click", updateClasswork);
document.getElementById("arrowleft").addEventListener("click", updateClasswork);
document.getElementById("deleteReminder").addEventListener("click", function () {
  const remindersToDelete = [...document.querySelectorAll(".deleteReminderCheckbox")].filter(checkbox => checkbox.checked);

  remindersToDelete.forEach(reminderToDelete => {
    console.log(reminderToDelete.dataset.reminderdate);
    console.log(reminderToDelete.dataset.remindercontent);
    console.log(reminderToDelete.dataset.reminderduedate);
    console.log(reminderToDelete.dataset.reminderclass);
    db.run(`DELETE FROM reminders WHERE date="${reminderToDelete.dataset.reminderdate}" AND reminder="${reminderToDelete.dataset.remindercontent}" AND dueDate="${reminderToDelete.dataset.reminderduedate}" AND class="${reminderToDelete.dataset.reminderclass}"`)
  });

  showActiveReminders();
});

updateClasswork();

setInterval(() => {
  getReminders()
    .then(rows => {
      rows.forEach(row => {
        if (new Date(row.date) < new Date()) {
          if (row.timesReminded % 1 == 0) {
            notifier.notify({
              title: `Reminder for ${row.class}`,
              message: `Reminder to do the assignment ${row.reminder}\nDue on ${row.dueDate.toString().split(" GM")[0].toString().split(" GM")[0]}`,
              icon: "./googleclassroomicon.png",
              wait: true,
              sound: true
            });

            notifier.on('click', (notifierObject, options, event) => {
              db.run(`DELETE FROM reminders WHERE date="${row.date}"`);
            });
          }

          db.run(`UPDATE reminders SET timesReminded=${row.timesReminded + 1} WHERE date="${row.date}"`);
        }
      });
    })
    .catch(console.error);
}, 300000);

function updateClasswork() {
  const classworkJSON = classroom.showWork();
  const classesContainer = document.getElementById("classesContainer");
  while (classesContainer.firstChild) {
    classesContainer.removeChild(classesContainer.firstChild);
  }
  document.getElementsByClassName("title")[0].innerText = "Google Classroom";
  document.getElementById("classesContainer").style.display = "flex";
  document.getElementById("reminderContainer").style.display = "none";
  document.getElementById("descriptionContainer").style.display = "none";

  document.getElementById("userpicture").src = `https:${classworkJSON.userinfo.photoUrl}`;
  document.getElementById("username").innerText = classworkJSON.userinfo.name.fullName;
  const sortedWork = {};

  classworkJSON.classwork.forEach(w => {
    if (sortedWork[w.class.name] == undefined) {
      sortedWork[w.class.name] = [];
    }
    sortedWork[w.class.name].push(w);
  });

  Object.entries(sortedWork).forEach(([className, classWork]) => {
    const classElement = document.createElement("div");
    classElement.classList.add("classItem");

    const classInfoItem = createElement("div", "classInfoItem");
    const classNameElement = createElement("p", "className", className);
    const sectionElement = createElement("p", "section", classWork[0].class.section);

    const classInfoHr = createElement("hr", "classInfoHr");

    classInfoItem.appendChildren(classNameElement, sectionElement, classInfoHr);
    classElement.appendChild(classInfoItem);

    const allAssignmentsElement = createElement("div", "allAssignmentsItem");

    classWork.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day, assignment.dueTime.hours - 8, assignment.dueTime.minutes)
        .toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
        .split(" ").map(word => monthDictionary[word] != undefined ? `${monthDictionary[word]}.` : word)
        .map(word => dayDictionary[word.slice(0, -1)] != undefined ? `${dayDictionary[word.slice(0, -1)]},` : word).join(" ");
      const assignmentElement = createElement("div", "assignmentItem", undefined, undefined, { "data-title": assignment.title, "data-description": assignment.description, "data-class": assignment.class.name, "data-duedate": dueDate });

      const assignmentTextElement = createElement("div", "assignmentDiv");
      const assignmentNameElement = createElement("span", "assignmentName", assignment.title);
      const assignmentDueDateElement = createElement("span", "assignmentDueDate");
      const assignmentLineBreak = createElement("br");
      const assignmentDueDateText = document.createTextNode(dueDate);
      assignmentDueDateElement.appendChild(assignmentDueDateText);
      assignmentTextElement.appendChildren(assignmentDueDateElement, assignmentLineBreak, assignmentNameElement);

      assignmentElement.addEventListener("click", showReminderContent);

      assignmentElement.appendChild(assignmentTextElement);
      allAssignmentsElement.appendChild(assignmentElement)
    });
    classElement.appendChild(allAssignmentsElement);
    classesContainer.appendChild(classElement);
  });

  console.log("Classwork Updated!");
}

function addReminder(date, dueDate, content, className) {
  db.run(`INSERT INTO reminders (date, dueDate, reminder, class) VALUES ("${date}", "${dueDate}", "${content}", "${className}")`, (err) => {
    if (err) {
      return console.log(err.message);
    }
  });
}

function getReminders() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM reminders`, [], (err, rows) => {
      if (err) {
        throw err;
      }

      resolve(rows);
    });
  });
}

function showReminderContent() {
  document.getElementsByClassName("title")[0].innerText = "Active Reminders";
  document.getElementById("classesContainer").style.display = "none";
  document.getElementById("reminderContainer").style.display = "flex";
  document.getElementById("descriptionContainer").style.display = "none";

  document.getElementById("reminderName").innerText = this.dataset.title;
  document.getElementById("reminderName").dataset.class = this.dataset.class;
  document.getElementById("reminderDueDate").innerText = this.dataset.duedate;

  console.log(this.dataset.description);
  if (this.dataset.description != "undefined") {
    document.getElementById("reminderDescription").innerText = this.dataset.description;
  }
  else {
    document.getElementById("reminderDescription").innerText = "No Description.";
  }
}

function showActiveReminders() {
  document.getElementsByClassName("title")[0].innerText = "Active Reminders";
  document.getElementById("classesContainer").style.display = "none";
  document.getElementById("descriptionContainer").style.display = "flex";
  document.getElementById("reminderContainer").style.display = "none";

  const descriptionBoxElement = document.getElementById("descriptionBox");
  while (descriptionBoxElement.firstChild) {
    descriptionBoxElement.removeChild(descriptionBoxElement.firstChild);
  }

  getReminders()
    .then(rows => {
      rows.forEach((row, i) => {
        const reminderElement = createElement("div", "reminderElement");
        const reminderContentElement = createElement("label", "reminderContentElement", undefined, undefined, { "for": `${i}Checkbox` });
        const reminderNameDateElement = createElement("div", "reminderNameDateElement");
        const reminderNameElement = createElement("div", "reminderNameElement", row.reminder);
        const reminderDateElement = createElement("div", "reminderDateElement", row.date);

        const reminderCheckbox = createElement("input", "deleteReminderCheckbox", undefined, `${i}Checkbox`,
          {
            "type": "checkbox",
            "data-remindercontent": row.reminder,
            "data-reminderclass": row.class,
            "data-reminderdate": row.date,
            "data-reminderduedate": row.dueDate
          });

        reminderNameDateElement.appendChildren(reminderNameElement, reminderDateElement);
        reminderContentElement.appendChild(reminderNameDateElement);
        reminderElement.appendChildren(reminderCheckbox, reminderContentElement);
        descriptionBoxElement.appendChild(reminderElement);
      });
    })
    .catch(console.error);
}

function formatDate(date) {
  const formattedDate = new Date(date)
    .toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
    .split(" ").map(word => monthDictionary[word] != undefined ? `${monthDictionary[word]}.` : word)
    .map(word => dayDictionary[word.slice(0, -1)] != undefined ? `${dayDictionary[word.slice(0, -1)]},` : word).join(" ");

  return formattedDate;
}

function createElement(elementName, classes, text, id, attributes) {
  const element = document.createElement(elementName);

  if (typeof classes == "string") {
    element.classList.add(classes);
  }
  else if (typeof classes == "object") {
    classes.forEach(c => element.classList.add(c));
  }

  if (text) {
    const elementText = document.createTextNode(text);
    element.appendChild(elementText);
  }

  if (id) {
    element.setAttribute("id", id);
  }

  if (attributes) {
    Object.entries(attributes).forEach(([attributeName, attributeValue]) => {
      element.setAttribute(attributeName, attributeValue);
    });
  }

  return element;
}