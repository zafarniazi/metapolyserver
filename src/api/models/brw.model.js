const mongoose = require("mongoose")
const SchemaDefinition = require("../../config/constants").SchemaDefinition

/**
 * Business Schema
 * @private
 */
const geoSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Polygon", "MultiPolygon"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
})

const brwSchema = new mongoose.Schema({
  geometry: {
    type: geoSchema,
    index: "2dsphere",
  },
  avg_price: {
    type: Number,
  },
})

module.exports = {
  BodenRichtWerte: mongoose.model("BodenRichtWerte", brwSchema),
}
