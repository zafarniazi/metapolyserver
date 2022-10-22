const webPush = require("web-push")
const {NotificationSubscriptions} = require("../models/notifications.model")
const {ReS, ReE} = require("../services/util.service")
const engine = require("../middlewares/engine")
const {User, rewardItemTypes} = require("../models/user.model")
module.exports = class NotificationsController {
  async register(req, res) {
    try {
      const {subscription} = req.body
      console.log(
        "register notification",
        JSON.stringify(req.body),
        req.user.id,
      )
      const newSubscription = await NotificationSubscriptions.findOneAndUpdate(
        {endpoint: subscription.endpoint},
        {
          userId: req.user.id,
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: subscription.keys,
        },
        {
          upsert: true,
          new: true,
        },
      )
      const user = await User.findOne({_id: req.user.id})
      engine.addBadgeRewardToUser(
        user,
        rewardItemTypes.notificationPermission,
        20000,
      )
      // Send 201 - resource created
      // this.sendNotificationToAll()
      return ReS(res, "register successful")
    } catch (error) {
      console.error("notifications register error", error)
      return ReE(res, "register error", 422, error)
    }
  }

  async sendNotificationToAll() {
    const notification = {
      title: "MetaPoly",
      body: "Check if you have rewards to collect.",
      icon: "./Favicon 192.png",
    }

    const allSubscriptions = await NotificationSubscriptions.find()

    const notifications = []
    allSubscriptions.forEach(subscription => {
      notifications.push(
        webPush.sendNotification(subscription, JSON.stringify(notification)),
      )
    })
    await Promise.all(notifications)
  }

  async sendNotificationToUser(userId, message) {
    const subscription = await NotificationSubscriptions.findOne({
      userId: userId,
    })
    webPush.sendNotification(subscription, JSON.stringify(message))
  }
}
