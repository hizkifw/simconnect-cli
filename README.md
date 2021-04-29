# simconnect-cli

Unofficial command-line interface to interact with [SIMConnect](https://simconnect.simge.edu.sg) using [Puppeteer](https://github.com/puppeteer/puppeteer/).

## Installation

```
$ npm i -g simconnect-cli
```

## Usage

```
simconnect-cli <command>

Commands:
  simconnect-cli ical  generate an iCal from the personalized timetable page

Options:
      --version   Show version number                                  [boolean]
  -u, --username  SIMConnect username                        [string] [required]
  -p, --password  SIMConnect password                        [string] [required]
  -q, --quiet     Do not output logs to stdout                         [boolean]
  -h, --help      Show help                                            [boolean]
```

## Example

Get your personalized timetable as an iCal file

```bash
$ simconnect-cli --username "someone001" --passsword "abc1234" ical > ~/calendar.ics
```
