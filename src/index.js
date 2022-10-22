/* eslint-disable max-len */
const { port, env } = require('./config/constants');
const logger = require('./config/logger');
const app = require('./config/express');
const mongoose = require('./config/mongoose');
const log4jsConfig = require("./config/log4js")
// open mongoose connection
mongoose.connect()

const server = require("http").createServer(app)
// const io = require('socket.io')(server);
// require('./config/socket')(app, io);
// eslint-disable-next-line no-undef
process.on("uncaughtException", err => {
  logger.error(err)
})

// eslint-disable-next-line no-undef
process.on("unhandledRejection", err => {
  logger.error(err)
})

// eslint-disable-next-line no-undef
process.on("exit", e => {
  logger.error(e)
})

// listen to requests
// eslint-disable-next-line max-len
if (process.env.NODE_ENV !== "test") {
  server.listen(port, () =>
    logger.info(`server started on port ${port} (${env})`),
  )
}

// setup log4js for event loggin

const fs = require("fs")
const readline = require("readline")
const log4js = require("log4js")

const csvStream = fs.createReadStream("events/events_LogFields.csv")
reader = readline.createInterface({
  input: csvStream,
})

const logFields = []

reader.on("line", function (line) {
  console.log("Line from file:", line)
  reader.close()
  reader.removeAllListeners()
  let params = line.split(";")
  params.forEach(param => {
    logFields[param] = param
  })
})

log4js.addLayout("csv", function (config) {
  return function (logEvent) {
    let out = ""
    let first = true
    const eventObject = logEvent.data[0]
    for (var logField in logFields) {
      if (!first) {
        out += ";"
      }

      let s = ""
      if (eventObject[logField] !== undefined) {
        s = eventObject[logField]
      }
      if (typeof s == "string") {
        s = s.replace(/;/g, "")
      }
      out += s
      first = false
    }
    let data = ""
    for (var param in eventObject) {
      if (logFields[param]) {
      } else {
        data += param + "=" + eventObject[param] + "/"
      }
    }

    data = data.replace(/;/g, "")

    out += ";" + data
    return out
  }
})

log4js.configure(log4jsConfig)
console.log("setting up task")
const cron = require("node-cron")
const NotificationsController = require("./api/controllers/notifications.controller")
const notificationController = new NotificationsController()
var task = cron.schedule("00 8 */2 * *", () => {
  console.log("sending notification")
  notificationController.sendNotificationToAll()
},{
  scheduled: true,
  timezone: "Europe/Berlin"
})
task.start()



/**
* Exports express
* @public
*/
module.exports = app;

