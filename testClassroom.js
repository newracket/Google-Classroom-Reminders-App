const classroom = require("./classroom");

const scopes = ['https://www.googleapis.com/auth/classroom.courses.readonly', 
'https://www.googleapis.com/auth/classroom.coursework.me.readonly', 
'https://www.googleapis.com/auth/classroom.rosters.readonly',
'https://www.googleapis.com/auth/classroom.profile.emails',
'https://www.googleapis.com/auth/classroom.profile.photos'];
classroom.authenticate(scopes)
  .then(client => classroom.getUserInfo(client))
  .catch(console.error);