let quiet = false;

const setQuiet = (val) => (quiet = val);

const log = (...message) => {
  if (!quiet) console.error(...message);
};

module.exports = { setQuiet, log };
