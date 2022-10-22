const mongoose = require("mongoose")

/**
 * Business Schema
 * @private
 */

const notificationSubscriptionModel = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    unique: true,
    required: true,
  },
  expirationTime: {
    type: Number,
    required: false,
  },
  keys: {
    auth: String,
    p256dh: String,
  },
})

module.exports = {
  NotificationSubscriptions: mongoose.model(
    "NotificationSubscriptions",
    notificationSubscriptionModel,
  ),
}
