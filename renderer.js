const classroom = require("./classroom");
const db = require("./databaseModules");
const notifier = require("node-notifier");
const flatpickr = require("flatpickr");
const fs = require("fs");

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
  const reminderId = document.getElementById("reminderName").dataset.id;

  const reminderDate = new Date(reminderDateFpicker.selectedDates);
  const reminderTime = new Date(reminderTimeFpicker.selectedDates);
  const reminderDateTimeFormatted = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate(), reminderTime.getHours(), reminderTime.getMinutes());

  if (reminderId != undefined) {
    db.removeReminders([reminderId])
      .then(res => db.addReminder(reminderDateTimeFormatted, reminderDueDate, reminderName, reminderClass)
        .then(res => document.getElementById("arrowleft").click())
        .catch(console.log))
      .catch(console.log);
  }
  else {
    db.addReminder(reminderDateTimeFormatted, reminderDueDate, reminderName, reminderClass)
      .then(res => document.getElementById("arrowleft").click())
      .catch(console.log);
  }
});

db.initialize()
  .catch(console.log);

document.getElementById("reminders").addEventListener("click", showActiveReminders);
document.getElementById("classroom").addEventListener("click", updateClasswork);
document.getElementById("deleteReminder").addEventListener("click", function () {
  const remindersToDelete = [...document.querySelectorAll(".deleteReminderCheckbox")].filter(checkbox => checkbox.checked);

  db.removeReminders(remindersToDelete.map(reminderToDelete => reminderToDelete.dataset.id))
    .then(showActiveReminders)
    .catch(console.log);
});

updateClasswork();

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
      const dueDate = formatDate(new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day, assignment.dueTime.hours - 8, assignment.dueTime.minutes));
      const assignmentElement = createElement("div", "assignmentItem", undefined, undefined, { "data-title": assignment.title, "data-description": assignment.description, "data-class": assignment.class.name, "data-duedate": dueDate });

      const assignmentTextElement = createElement("div", "assignmentDiv");
      const assignmentNameElement = createElement("span", "assignmentName", assignment.title);
      const assignmentDueDateElement = createElement("span", "assignmentDueDate");
      const assignmentLineBreak = createElement("br");
      const assignmentDueDateText = document.createTextNode(dueDate);
      assignmentDueDateElement.appendChild(assignmentDueDateText);
      assignmentTextElement.appendChildren(assignmentDueDateElement, assignmentLineBreak, assignmentNameElement);

      assignmentElement.addEventListener("click", function () { showReminderContent(updateClasswork, this) });

      assignmentElement.appendChild(assignmentTextElement);
      allAssignmentsElement.appendChild(assignmentElement)
    });
    classElement.appendChild(allAssignmentsElement);
    classesContainer.appendChild(classElement);
  });
}

function showReminderContent(backfunction, element) {
  document.getElementsByClassName("title")[0].innerText = "Active Reminders";
  document.getElementById("classesContainer").style.display = "none";
  document.getElementById("reminderContainer").style.display = "flex";
  document.getElementById("descriptionContainer").style.display = "none";

  document.getElementById("reminderName").innerText = element.dataset.title;
  document.getElementById("reminderName").dataset.class = element.dataset.class;
  document.getElementById("reminderDueDate").innerText = element.dataset.duedate;

  if (element.dataset.id != undefined) {
    document.getElementById("reminderName").dataset.id = element.dataset.id;
  }

  if (element.dataset.description != "undefined") {
    document.getElementById("reminderDescription").innerText = element.dataset.description;
  }
  else {
    document.getElementById("reminderDescription").innerText = "No Description.";
  }

  document.getElementById("arrowleft").addEventListener("click", backfunction);
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

  const classworkJSON = JSON.parse(fs.readFileSync("coursework.json"));
  db.getReminders()
    .then(rows => {
      rows.forEach((row, i) => {
        const reminderElement = createElement("div", "reminderElement");
        const reminderContentElement = createElement("label", "reminderContentElement", undefined, undefined, { "for": `${i}Checkbox` });
        const reminderNameDateElement = createElement("div", "reminderNameDateElement");
        const reminderNameElement = createElement("div", "reminderNameElement", row.reminder);
        const reminderDateElement = createElement("div", "reminderDateElement", formatDate(row.date));
        const editReminderButton = createElement("button", "reminderEditButton", "EDIT");

        const description = classworkJSON.find(classwork => classwork.title == row.reminder) != undefined ? classworkJSON.find(classwork => classwork.title == row.reminder).description : "undefined";
        const reminderCheckbox = createElement("input", "deleteReminderCheckbox", undefined, `${i}Checkbox`,
          {
            "type": "checkbox",
            "data-title": row.reminder,
            "data-date": row.date,
            "data-duedate": row.dueDate,
            "data-description": description,
            "data-class": row.class,
            "data-id": row.id
          });

        editReminderButton.addEventListener("click", () => {
          showReminderContent(showActiveReminders, reminderCheckbox);
        });

        reminderNameDateElement.appendChildren(reminderNameElement, reminderDateElement);
        reminderContentElement.appendChildren(reminderNameDateElement);
        reminderElement.appendChildren(reminderCheckbox, reminderContentElement, editReminderButton);
        descriptionBoxElement.appendChild(reminderElement);
      });
    })
    .catch(console.log);
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

setInterval(() => {
  db.getReminders()
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
          }
        }
      });
    })
    .catch(console.log);
}, 300000);