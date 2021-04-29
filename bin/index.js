const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { setQuiet } = require("../lib/logger");
const { calendar } = require("../lib");

const run = async () => {
  const argv = yargs(hideBin(process.argv))
    .command(
      "ical",
      "generate an iCal from the personalized timetable page",
      (y) =>
        y.option("visible", {
          type: "boolean",
          description: "Show the puppeteer window",
        })
    )
    .option("username", {
      alias: "u",
      type: "string",
      description: "SIMConnect username",
      demandOption: true,
    })
    .option("password", {
      alias: "p",
      type: "string",
      description: "SIMConnect password",
      demandOption: true,
    })
    .option("quiet", {
      alias: "q",
      type: "boolean",
      description: "Do not output logs to stdout",
    })
    .demandCommand(1)
    .help()
    .alias("help", "h").argv;

  if (argv.quiet) setQuiet(true);

  if (argv._[0] === "ical")
    calendar
      .getTimetable(argv.username, argv.password, {
        visible: argv.visible,
      })
      .then(calendar.parseTimetable)
      .then(calendar.createICS)
      .then(console.log);
  else console.error("Unknown command:", argv._.join(" "));
};

run();
