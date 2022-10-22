const mongoose = require("mongoose")

/**
 * Business Schema
 * @private
 */

const billingTokensModel = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  token: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
})

module.exports = {
  BillingTokens: mongoose.model("BillingTokensModel", billingTokensModel),
}
