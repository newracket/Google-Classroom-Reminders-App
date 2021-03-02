const fs = require("fs");
const http = require("http");
const url = require("url");
const opn = require("open");
const destroyer = require("server-destroy");

const { google } = require("googleapis");
const classroom = google.classroom("v1");

const credentials = JSON.parse(fs.readFileSync("credentials.json")).web;
const oauth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uris[0]
);

google.options({ auth: oauth2Client });

module.exports = {
  name: "classroom",
  async authenticate(scopes) {
    return new Promise((resolve, reject) => {
      // grab the url that will be used for authorization
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes.join(" "),
      });
      const server = http
        .createServer(async (req, res) => {
          try {
            if (req.url.indexOf("/oauth2callback") > -1) {
              const qs = new url.URL(req.url, "http://localhost:3000")
                .searchParams;
              res.end("Authentication successful! Please return to the console.");
              server.destroy();
              const { tokens } = await oauth2Client.getToken(qs.get("code"));
              oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
              resolve(oauth2Client);
            }
          } catch (e) {
            reject(e);
          }
        })
        .listen(3000, () => {
          // open the browser to the authorize url to start the workflow
          opn(authorizeUrl, { wait: false }).then(cp => cp.unref());
        });
      destroyer(server);
    });
  },
  async getUserInfo() {
    const userInfo = await classroom.userProfiles.get({ userId: "me" });

    console.log(userInfo.data);
  },
  async runSample() {
    // retrieve user profile
    const coursesList = await classroom.courses.list({ studentId: "me" });
    const currentCourses = coursesList.data.courses.filter(e => e.courseState == "ACTIVE");

    let allCurrentWork = [];
    for (const course of currentCourses) {
      const courseWork = await classroom.courses.courseWork.list({ courseId: course.id });
      if (courseWork.data.courseWork != undefined) {
        allCurrentWork.push(courseWork.data.courseWork.filter(e => {
          if (e.dueDate == undefined) {
            return false;
          }

          if (e.dueTime.hours == undefined) {
            e.dueTime.hours = 24;
          }
          if (e.dueTime.minutes == undefined) {
            e.dueTime.minutes = 59;
          }

          return new Date(e.dueDate.year, e.dueDate.month - 1, e.dueDate.day, e.dueTime.hours - 8, e.dueTime.minutes) > Date.now();
        }));
      }
    };
    allCurrentWork = allCurrentWork.flat();

    fs.writeFileSync("coursework.json", JSON.stringify(allCurrentWork));
    fs.writeFileSync("currentcourses.json", JSON.stringify(currentCourses));
  },
  showWork() {
    const coursework = JSON.parse(fs.readFileSync("./coursework.json"));
    const classes = JSON.parse(fs.readFileSync("./currentcourses.json"));
    const output = []

    coursework.forEach(work => {
      work.class = classes.find(c => c.id == work.courseId);
      output.push(work);
    });

    return output;
  }
}

// const scopes = ["https://www.googleapis.com/auth/classroom.courses", "https://www.googleapis.com/auth/classroom.coursework.me"];
// authenticate(scopes)
//   .then(client => runSample(client))
//   .catch(console.error);