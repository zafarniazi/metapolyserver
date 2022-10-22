const mongoose = require("mongoose")
const SchemaDefinition = require("../../config/constants").SchemaDefinition

const transactionTypes = {
  interest: "interest",
  business_transfer: "business_transfer",
  business_lost: "business_lost",
  reward: "reward",
  value_change: "value_change",
  visit_business: "visit_business",
  visitor_income: "visitor_income",
}
/**
 * transaction Schema
 * @private
 */
const transactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: transactionTypes,
      required: true,
      index: true
    },
    transaction_value: {
      type: Number,
      default: 0,
    },
    business_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Business",
      index: true
    },
  },
  SchemaDefinition,
)

transactionSchema.methods.getTime = function (){
  return this.created_at.getTime();
}

const transactionModel = mongoose.model("transaction", transactionSchema)
const interestModel = transactionModel.discriminator(
  "interest",
  new mongoose.Schema({
    transactionType: {
      type: transactionTypes,
      required: true,
      default: transactionTypes.interest,
      index: true
    },
    to_user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
  }),
)
const transferModel = transactionModel.discriminator(
  "transfer",
  new mongoose.Schema({
    transactionType: {
      type: transactionTypes,
      required: true,
      default: transactionTypes.business_transfer,
      index: true
    },
    to_user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    from_user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
  }),
)
const businessLostModel = transactionModel.discriminator(
  "businessLost",
  new mongoose.Schema({
    transactionType: {
      type: transactionTypes,
      required: true,
      default: transactionTypes.business_lost,
      index: true
    },
    from_user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
  }),
)
const rewardModel = transactionModel.discriminator(
  "reward",
  new mongoose.Schema({
    transactionType: {
      type: transactionTypes,
      required: true,
      default: transactionTypes.reward,
      index: true
    },
    to_user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
  }),
)

const valueChangeReasons = {
  nearBusiness: "nearBusiness",
  visitor: "visitor",
}
const valueChangeModel = transactionModel.discriminator(
  "valueChange",
  new mongoose.Schema({
    transactionType: {
      type: transactionTypes,
      required: true,
      default: transactionTypes.value_change,
      index: true
    },
    reason:{
      type: valueChangeReasons,
      required: true,
    }
  }),
)

/**
 * @typedef Transaction
 */
module.exports = {
  transactionModel,
  interestModel,
  transferModel,
  businessLostModel,
  rewardModel,
  valueChangeModel,
  valueChangeReasons,
  transactionTypes,
}
