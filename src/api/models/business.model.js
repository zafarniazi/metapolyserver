const mongoose = require("mongoose")
const SchemaDefinition = require("../../config/constants").SchemaDefinition

/**
 * Business Schema
 * @private
 */
const visitorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    timestamp: {
      type: Date,
      default: null,
    },
    collected: {
      type: Boolean,
      default: false,
    },
    local: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  {_id: false},
) 

const offerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  price: {
    type: Number,
    default: 0,
    required: true,
  },
})

const geoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  {_id: false},
)

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    business_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    starting_value: {
      type: Number,
      default: 0,
    },
    current_value: {
      type: Number,
      default: 0,
    },
    is_on_sale: {
      index: true,
      type: Boolean,
      default: false,
    },
    bought_locally: {
      type: Boolean,
      default: false,
    },
    tieredValues: {
      type: mongoose.SchemaTypes.Mixed,
    },
    geoLocation: {
      type: geoSchema,
    },
    created_by: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    starting_interest: {
      type: Number,
      default: 0,
    },
    current_interest: {
      type: Number,
      default: 0,
    },
    interest_collected_at: {
      type: Date,
      default: Date.now,
    },
    visitors: {
      type: [visitorSchema],
    },
    offers: {
      type: [offerSchema],
    },
    types: {
      type: [String],
    },
    sale_price: {
      type: Number,
    },
    bank_price: {
      type: Number,
    },
  },
  SchemaDefinition,
)

businessSchema.index({created_at: -1})

module.exports = {
  Business: mongoose.model("Business", businessSchema),
  offerSchema: mongoose.model("offerSchema", offerSchema),
  geoSchema: mongoose.model("geoSchema", geoSchema),
  visitorSchema: mongoose.model("visitorSchema", visitorSchema),
}
