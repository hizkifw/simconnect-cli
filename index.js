const calendar = require("./calendar");

calendar
  .getTimetable("SIMConnect Username", "SIMConnect Password")
  .then(calendar.parseTimetable)
  .then(calendar.createICS)
  .then(console.log);
