const classroom = require("./classroom");

const scopes = ['https://www.googleapis.com/auth/classroom.courses.readonly', 'https://www.googleapis.com/auth/classroom.coursework.me.readonly', 'https://www.googleapis.com/auth/classroom.rosters.readonly'];
classroom.authenticate(scopes)
  .then(client => classroom.getUserInfo(client))
  .catch(console.error);