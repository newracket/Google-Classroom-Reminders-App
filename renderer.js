const classroom = require("./classroom");
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reminders.db');
const notifier = require("node-notifier");

const sortedWork = {};
const monthDictionary = { "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr", "May": "May", "June": "Jun", "July": "Jul", "August": "Aug", "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec" }
const dayDictionary = { "Sunday": "Sun", "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat" }

const scopes = ['https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/classroom.profile.photos'];
// classroom.authenticate(scopes)
//   .then(client => classroom.runSample(client).then(() => updateClasswork(classroom.showWork())))
//   .catch(console.error);

// document.getElementById("confirmReminder").addEventListener("click", () => {
//   const reminderDate = document.getElementById("reminderDate").value;
//   const remindersToAdd = [...document.querySelectorAll("input[type='checkbox'")].filter(checkbox => checkbox.checked);

//   remindersToAdd.forEach(reminderToAdd => {
//     addReminder(reminderDate, reminderToAdd.getAttribute("data-reminderContent"), reminderToAdd.getAttribute("data-reminderDueDate"), reminderToAdd.getAttribute("data-reminderClass"));
//     reminderToAdd.checked = false;
//   })
// });

db.run(`CREATE TABLE IF NOT EXISTS reminders (
  date TEXT,
  dueDate TEXT,
  reminder TEXT,
  class TEXT,
  timesReminded INT DEFAULT 0
);`);

updateClasswork(classroom.showWork());

setInterval(() => {
  getReminders((rows) => {
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
  });
}, 300000);

// document.getElementById("viewReminders").addEventListener("click", () => {
//   const modal = document.getElementById("modal");
//   const titleElement = modal.getElementsByClassName("title")[0];
//   const contentElement = modal.getElementsByClassName("description")[0];
//   const titleText = document.createTextNode("Current Reminders");
//   titleElement.appendChild(titleText);

//   getReminders(rows => {
//     rows.forEach(row => {
//       const reminderElement = document.createElement("p");
//       const reminderText = document.createTextNode(`Reminder on ${row.date} for ${row.reminder} due on ${row.dueDate.toString().split(" GM")[0]}`);
//       reminderElement.appendChild(reminderText)
//       contentElement.appendChild(reminderElement);
//     });
//   });

//   modal.style.display = "block";
// });

function updateClasswork(classworkJSON) {
  const classesContainer = document.getElementById("classesContainer");
  while (classesContainer.firstChild) {
    classesContainer.removeChild(classesContainer.firstChild);
  }

  document.getElementById("userpicture").src = `https:${classworkJSON.userinfo.photoUrl}`;
  document.getElementById("username").innerText = classworkJSON.userinfo.name.fullName;

  classworkJSON.classwork.forEach(w => {
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

    const classInfoHr = document.createElement("hr");
    classInfoHr.classList.add("classInfoHr");

    classInfoItem.appendChild(classNameElement);
    classInfoItem.appendChild(sectionElement);
    classInfoItem.appendChild(classInfoHr);
    classInfoItem.classList.add("classInfoItem");
    classElement.appendChild(classInfoItem);

    const allAssignmentsElement = document.createElement("div");
    allAssignmentsElement.classList.add("allAssignmentsItem");

    classWork.forEach(assignment => {
      const assignmentElement = document.createElement("div");
      const dueDate = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day, assignment.dueTime.hours - 8, assignment.dueTime.minutes)
        .toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
        .split(" ").map(word => monthDictionary[word] != undefined ? `${monthDictionary[word]}.` : word)
        .map(word => dayDictionary[word.slice(0, -1)] != undefined ? `${dayDictionary[word.slice(0, -1)]},` : word).join(" ");

      const assignmentTextElement = document.createElement("div");
      const assignmentNameElement = document.createElement("span");
      const assignmentDueDateElement = document.createElement("span");
      const assignmentNameText = document.createTextNode(assignment.title);
      assignmentNameElement.appendChild(assignmentNameText);
      assignmentNameElement.classList.add("assignmentName");
      const assignmentLineBreak = document.createElement("br");
      const assignmentDueDateText = document.createTextNode(dueDate);
      assignmentDueDateElement.classList.add("assignmentDueDate");
      assignmentDueDateElement.appendChild(assignmentDueDateText);
      assignmentTextElement.appendChild(assignmentDueDateElement);
      assignmentTextElement.appendChild(assignmentLineBreak);
      assignmentTextElement.appendChild(assignmentNameElement);
      assignmentTextElement.classList.add("assignmentDiv");
      assignmentNameElement.setAttribute("data-title", assignment.title);
      assignmentNameElement.setAttribute("data-description", assignment.description);

      assignmentNameElement.addEventListener("click", function () {
        const title = this.dataset.title;
        const description = this.dataset.description;

        console.log(title);
        console.log(description);
      });

      // const reminderCheckbox = document.createElement("input");
      // reminderCheckbox.setAttribute("type", "checkbox");
      // reminderCheckbox.setAttribute("data-reminderContent", assignment.title);
      // reminderCheckbox.setAttribute("data-reminderClass", className);
      // reminderCheckbox.setAttribute("data-reminderDueDate", dueDate);

      assignmentElement.classList.add("assignmentItem");
      // assignmentElement.appendChild(reminderCheckbox);
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

function getReminders(callback) {
  db.all(`SELECT * FROM reminders`, [], (err, rows) => {
    if (err) {
      throw err;
    }

    callback(rows);
  });
}