const db = require("./databaseModules");
const notifier = require("node-notifier");
const flatpickr = require("flatpickr");
const flow = require("./flow");
const authFlow = new flow.AuthFlow();
const path = require("path");
const electron = require("electron");

const monthDictionary = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};
const dayDictionary = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const reminderDateFpicker = flatpickr("#reminderDate", {
  altInput: true,
  altFormat: "F j, Y",
  dateFormat: "Y-m-d",
  defaultDate: new Date(),
});
const reminderTimeFpicker = flatpickr("#reminderTime", {
  enableTime: true,
  noCalendar: true,
  dateFormat: "h:i K",
  defaultDate: new Date(),
  time_24hr: false,
});

Element.prototype.appendChildren = function (...children) {
  children.forEach((child) => {
    this.appendChild(child);
  });

  return this;
};

switchScreen("Google Classroom");
loop();
setInterval(loop, 300000);

document.getElementById("saveReminder").addEventListener("click", () => {
  const reminderName = document.getElementById("reminderName").innerText;
  const reminderClass = document.getElementById("reminderName").dataset.class;
  const reminderDueDate = document.getElementById("reminderDueDate").innerText;
  const reminderId = document.getElementById("reminderName").dataset.id;

  const reminderDate = new Date(reminderDateFpicker.selectedDates);
  const reminderTime = new Date(reminderTimeFpicker.selectedDates);
  const reminderDateTimeFormatted = new Date(
    reminderDate.getFullYear(),
    reminderDate.getMonth(),
    reminderDate.getDate(),
    reminderTime.getHours(),
    reminderTime.getMinutes()
  );

  if (reminderId != undefined) {
    db.removeReminders([parseInt(reminderId)])
      .then((res) =>
        db
          .addReminder(reminderDateTimeFormatted, reminderDueDate, reminderName, reminderClass)
          .then((res) => document.getElementById("arrowleft").click())
          .catch(console.log)
      )
      .catch(console.log);
  } else {
    db.addReminder(reminderDateTimeFormatted, reminderDueDate, reminderName, reminderClass)
      .then((res) => document.getElementById("arrowleft").click())
      .catch(console.log);
  }
});

document.getElementById("reminders").addEventListener("click", showActiveReminders);
document.getElementById("classroom").addEventListener("click", () => {
  switchScreen("Google Classroom");
});
document.getElementById("deleteReminder").addEventListener("click", function () {
  const remindersToDelete = [...document.querySelectorAll(".deleteReminderCheckbox")].filter(
    (checkbox) => checkbox.checked
  );

  db.removeReminders(remindersToDelete.map((reminderToDelete) => parseInt(reminderToDelete.dataset.id)))
    .then(showActiveReminders)
    .catch(console.log);
});

function switchScreen(newScreen) {
  document.getElementsByClassName("title")[0].innerText = newScreen;
  document.getElementById("classesContainer").style.display = "none";
  document.getElementById("reminderContainer").style.display = "none";
  document.getElementById("descriptionContainer").style.display = "none";

  if (newScreen == "Google Classroom") {
    document.getElementById("classesContainer").style.display = "";
  } else if (newScreen == "Active Reminders") {
    document.getElementById("descriptionContainer").style.display = "";
  } else if (newScreen == "Edit Reminder") {
    document.getElementById("reminderContainer").style.display = "";
  }
}

function updateClasswork() {
  const classworkJSON = authFlow.showWork();
  const classesContainer = document.getElementById("classesContainer");
  while (classesContainer.firstChild) {
    classesContainer.removeChild(classesContainer.firstChild);
  }

  document.getElementById("userpicture").src = `https:${classworkJSON.userinfo.photoUrl}`;
  document.getElementById("username").innerText = classworkJSON.userinfo.name.fullName;
  const sortedWork = {};

  classworkJSON.classwork.forEach((w) => {
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

    classWork.forEach((assignment) => {
      const dueDate = formatDate(
        new Date(
          assignment.dueDate.year,
          assignment.dueDate.month - 1,
          assignment.dueDate.day,
          assignment.dueTime.hours - 7,
          assignment.dueTime.minutes
        )
      );
      const assignmentElement = createElement("div", "assignmentItem", undefined, undefined, {
        "data-title": assignment.title,
        "data-description": assignment.description,
        "data-class": assignment.class.name,
        "data-duedate": dueDate,
        "data-link": assignment.alternateLink,
      });

      const assignmentTextElement = createElement("div", "assignmentDiv");
      const assignmentNameElement = createElement("span", "assignmentName", assignment.title);
      const assignmentDueDateElement = createElement("span", "assignmentDueDate");
      const assignmentLineBreak = createElement("br");
      const assignmentDueDateText = document.createTextNode(dueDate);
      assignmentDueDateElement.appendChild(assignmentDueDateText);
      assignmentTextElement.appendChildren(assignmentDueDateElement, assignmentLineBreak, assignmentNameElement);

      assignmentElement.addEventListener("click", function () {
        showReminderContent(() => {
          switchScreen("Google Classroom");
        }, this);
      });

      assignmentElement.appendChild(assignmentTextElement);
      allAssignmentsElement.appendChild(assignmentElement);
    });
    classElement.appendChild(allAssignmentsElement);
    classesContainer.appendChild(classElement);
  });
}

function showReminderContent(backfunction, element) {
  document.getElementById("reminderName").innerText = element.dataset.title;
  document.getElementById("reminderName").dataset.link = element.dataset.link;
  document.getElementById("reminderName").dataset.class = element.dataset.class;
  document.getElementById("reminderDueDate").innerText = element.dataset.duedate;

  document.getElementById("reminderName").addEventListener("click", function () {
    electron.shell.openExternal(this.dataset.link);
  });

  if (element.dataset.id != undefined) {
    document.getElementById("reminderName").dataset.id = element.dataset.id;
  }

  if (element.dataset.description != "undefined") {
    document.getElementById("reminderDescription").innerText = element.dataset.description;
  } else {
    document.getElementById("reminderDescription").innerText = "No Description.";
  }

  if (element.dataset.date != undefined) {
    reminderDateFpicker.setDate(new Date(element.dataset.date));
    reminderTimeFpicker.setDate(new Date(element.dataset.date));
  } else {
    reminderDateFpicker.setDate(new Date());
    reminderTimeFpicker.setDate(new Date());
  }

  document.getElementById("arrowleft").addEventListener("click", backfunction);
  switchScreen("Edit Reminder");
}

function showActiveReminders() {
  const descriptionBoxElement = document.getElementById("descriptionBox");
  while (descriptionBoxElement.firstChild) {
    descriptionBoxElement.removeChild(descriptionBoxElement.firstChild);
  }

  const classworkJSON = authFlow.courseWorkJson();

  db.getReminders()
    .then((rows) => {
      rows.forEach((row, i) => {
        const reminderElement = createElement("div", "reminderElement");
        const reminderContentElement = createElement("label", "reminderContentElement", undefined, undefined, {
          for: `${i}Checkbox`,
        });
        const reminderNameDateElement = createElement("div", "reminderNameDateElement");
        const reminderNameElement = createElement("div", "reminderNameElement", row.reminder);
        const reminderDateElement = createElement("div", "reminderDateElement", formatDate(row.date));
        const editReminderButton = createElement("button", "reminderEditButton", "EDIT");

        const description =
          classworkJSON.find((classwork) => classwork.title == row.reminder) != undefined
            ? classworkJSON.find((classwork) => classwork.title == row.reminder).description
            : "undefined";
        const link = classworkJSON.find((classwork) => classwork.title == row.reminder).alternateLink;
        const reminderCheckbox = createElement("input", "deleteReminderCheckbox", undefined, `${i}Checkbox`, {
          type: "checkbox",
          "data-title": row.reminder,
          "data-date": row.date,
          "data-duedate": row.dueDate,
          "data-description": description,
          "data-class": row.class,
          "data-id": row.id,
          "data-link": link,
        });

        editReminderButton.addEventListener("click", () => {
          showReminderContent(showActiveReminders, reminderCheckbox);
        });

        reminderNameDateElement.appendChildren(reminderNameElement, reminderDateElement);
        reminderContentElement.appendChildren(reminderNameDateElement);
        reminderElement.appendChildren(reminderCheckbox, reminderContentElement, editReminderButton);
        descriptionBoxElement.appendChild(reminderElement);
      });

      switchScreen("Active Reminders");
    })
    .catch(console.log);
}

function formatDate(date) {
  const formattedDate = new Date(date)
    .toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
    .split(" ")
    .map((word) => (monthDictionary[word] != undefined ? `${monthDictionary[word]}.` : word))
    .map((word) => (dayDictionary[word.slice(0, -1)] != undefined ? `${dayDictionary[word.slice(0, -1)]},` : word))
    .join(" ");

  return formattedDate;
}

function createElement(elementName, classes, text, id, attributes) {
  const element = document.createElement(elementName);

  if (typeof classes == "string") {
    element.classList.add(classes);
  } else if (typeof classes == "object") {
    classes.forEach((c) => element.classList.add(c));
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

function loop() {
  authFlow.processData().then(updateClasswork);

  db.getReminders()
    .then((rows) => {
      rows.forEach((row) => {
        if (new Date(row.date) < new Date()) {
          notifier.notify({
            title: `${row.class}`,
            message: `${row.reminder}\nDue on ${row.dueDate}`,
            icon: path.join(__dirname, "googleclassroomicon.png"),
            wait: true,
            sound: true,
            appID: "Google Classroom Reminders",
          });

          db.removeReminders([row.id]).then(showActiveReminders).catch(console.log);
        }
      });
    })
    .catch(console.log);
}
