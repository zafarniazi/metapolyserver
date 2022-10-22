// Use the web-push library to hide the implementation details of the communication
// between the application server and the push service.
// For details, see https://tools.ietf.org/html/draft-ietf-webpush-protocol and
// https://tools.ietf.org/html/draft-ietf-webpush-encryption.
const webPush = require("web-push")
const express = require("express")
const router = express.Router()
const NotificationsController = require("../../controllers/notifications.controller")
const controller = new NotificationsController()
const {vapidPublicKey, vapidPrivateKey} = require("../../../config/constants")

// Set the keys used for encrypting the push messages.
webPush.setVapidDetails(
  "https://serviceworke.rs/",
  vapidPublicKey,
  vapidPrivateKey,
)
router.route("/vapidPublicKey").get((req, res) => {
  res.send(vapidPublicKey)
})
router.route("/register").post(
  (...args) => controller.register(...args),
  // A real world application would store the subscription info.
  // console.log("register", JSON.stringify(req.body))
  // res.sendStatus(201)
)
router.route("/sendNotification").post((req, res) => {
  // A real world application would store the subscription info.
  const subscription = req.body.subscription
  const payload = {title: "Test Notification"}
  console.log("sendNotification", JSON.stringify(payload))
  webPush
    .sendNotification(subscription, JSON.stringify(payload))
    .then(function () {
      res.sendStatus(201)
    })
    .catch(function (error) {
      console.log(error)
      res.sendStatus(500)
    })
})

module.exports = router
