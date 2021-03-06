const puppeteer = require("puppeteer");
const crypto = require("crypto");
const fs = require("fs");
const logger = require("./logger");

const getTimetable = async (username, password, options) => {
  logger.log("Launching browser");
  const browser = await puppeteer.launch({
    headless: !options.visible,
    defaultViewport: { width: 1280, height: 720 },
  });
  const page = await browser.newPage();

  logger.log("Loading page");
  await page.goto("https://simconnect.simge.edu.sg", {
    waitUntil: "load",
  });
  // Page will redirect to actual login form
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  logger.log("Page loaded, selecting login mode");
  await page.select("#User_Type", "Student");

  logger.log("Inserting login details");
  await page.type("#userid", username);
  await page.type("#pwd", password);

  logger.log("Loggin in...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }),
    page.click("input[type=submit]"),
  ]);

  logger.log("Logged in!");
  logger.log("Navigating to My Apps");
  await page.goto(
    "https://simconnect.simge.edu.sg/psp/paprd/EMPLOYEE/EMPL/h/?tab=SM_STUDENT",
    { waitUntil: "networkidle0" }
  );

  logger.log("Loading timetable");
  await page.select("#DERIVED_SSS_SCL_SSS_MORE_ACADEMICS", "1002");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.click("#DERIVED_SSS_SCL_SSS_GO_1"),
  ]);

  logger.log("Timetable loaded! Extracting data");
  const iframe = await page
    .$("#ptifrmtgtframe")
    .then((frame) => frame.contentFrame());
  const table = await iframe.waitForSelector("#ACE_STDNT_ENRL_SSV2\\$0");
  const tableContent = await table.evaluate((t) => t.innerText);

  logger.log("Logging out");
  await page.goto(
    "https://simconnect.simge.edu.sg/psp/paprd/EMPLOYEE/EMPL/?cmd=logout",
    { waitUntil: "load" }
  );

  logger.log("Closing");
  await browser.close();

  return tableContent;
};

const fixAMPM = (_time) => {
  const [hh, mm] = _time
    .replace(/(am|pm)/gi, "")
    .split(":")
    .map(Number);

  let offset = 0;
  if (["pm", "PM"].some((s) => _time.includes(s))) offset = 12;
  if (hh === 12 && offset === 12) offset = 0; // Fix 12PM
  return [hh + offset, mm].map((t) => String(t).padStart(2, "0")).join(":");
};

const parseTimetable = (rawTable) => {
  const calendarDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const parts = rawTable
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const events = [];

  let courseCode = "";
  let courseName = "";
  let currentClass = "";
  while (parts.length > 0) {
    const part = parts.shift();
    const partparts = part.split(" ");
    if (calendarDays.includes(partparts[0])) {
      const { 1: timeStart, 3: timeEnd } = partparts.map(fixAMPM);
      const location = parts.shift();
      const teacher = parts.shift();
      const [dateStart, dateEnd] = parts
        .shift()
        .split(" - ")
        .map((date) => date.split("/").reverse().join("-"));

      events.push({
        title: courseCode + " - " + currentClass,
        description: courseName + "\n" + teacher,
        location,
        start: new Date(dateStart + "T" + timeStart + ":00+0800").toISOString(),
        end: new Date(dateEnd + "T" + timeEnd + ":00+0800").toISOString(),
      });
    } else if (parts[0] === "Status\tUnits\tGrading") {
      // New course
      [courseCode, courseName] = part.split(" - ");
      while (!parts.shift().startsWith("Class Nbr")) {}
    } else {
      // New class
      const classNumber = part;
      const section = parts.shift(); // e.g. L01
      const component = parts.shift(); // e.g. Tutorial
      currentClass = component + " " + section;
    }
  }

  return events;
};

const createICS = (parsedTimetable) => {
  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:SIM Calendar",
    "METHOD:PUBLISH",
  ];
  parsedTimetable.map((entry) => {
    const eventHash = crypto.createHash("SHA256");
    eventHash.update(JSON.stringify(entry));
    const hash = eventHash.digest().toString("hex");

    cal.push("BEGIN:VEVENT");
    cal.push("SUMMARY:" + entry.title);
    cal.push("DESCRIPTION:" + entry.description.replace(/\n/g, "\\n"));
    cal.push("UID:" + hash);
    cal.push("SEQUENCE:0");
    cal.push("STATUS:CONFIRMED");
    cal.push("DTSTART:" + entry.start.replace(/([-:]|\.000)/g, ""));
    cal.push("DTEND:" + entry.end.replace(/([-:]|\.000)/g, ""));
    cal.push("LOCATION:" + entry.location);
    cal.push("END:VEVENT");
  });
  cal.push("END:VCALENDAR");
  return cal.join("\n");
};

module.exports = {
  getTimetable,
  parseTimetable,
  createICS,
};
