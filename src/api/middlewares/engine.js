var gpsDistance = require("gps-distance")

const {Business, geoSchema} = require("../models/business.model")
const {
  User,
  rewardItemTypes,
  rewardItemSchema,
} = require("../models/user.model")

const {
  valueChangeModel,
  valueChangeReasons,
} = require("../models/transaction.model")

const twitter = require("../../config/twitter")
const axios = require("axios")
const {env} = require("../../config/constants")

class Rule {
  constructor(name, callback) {
    this.name = name
    this.execute = callback
  }
}

rules = {}

const addRule = (name, eventType, cb) => {
  rule = new Rule(name, cb)
  if (!rules[eventType]) {
    rules[eventType] = []
  }
  rules[eventType].push(rule)
}

const NEAR_BUSINESS_VALUE_INCREASE = 0.003 // percentage of current business value
const NEAR_BUSINESS_RADIUS = 1000 // meters

// while I feel this should be part of the business.controller, as it operates on the business model
// having to import it from their leads to a circular dependency graph which is messy to handle and leads to
// undefined imports.
const changeBusinessValue = async (business, delta) => {
  // Create Transaction
  new valueChangeModel({
    transaction_value: delta,
    business_id: business._id,
    reason: valueChangeReasons.nearBusiness,
  }).save()

  doc = await Business.findOneAndUpdate(
    {
      _id: business._id,
    },
    {
      $inc: {current_value: delta},
    },
    {new: true},
  )
}

//*****RULES_LIST*****/

// this rule only affects businesses which have already been purchased once and thus are handled
// in our database. Buildings, which are bought for the first time, need to compute their value
// on the fly elsewhere.

const increaseNearBusinessesValueOnBuy = async event => {
  // const business = await Business.findOne({business_id: event.business_id})
  const business = event.business
  const user = event.buyer
  const nearBusinesses = await Business.aggregate([
    {
      $geoNear: {
        near: business.geoLocation,
        distanceField: "dist.calculated",
        maxDistance: NEAR_BUSINESS_RADIUS,
        spherical: true,
      },
    },
    {
      $match: {
        business_id: {$ne: business.business_id},
        owner: {$ne: user._id},
      },
    },
  ])

  nearBusinesses.forEach(nearBusiness => {
    changeBusinessValue(
      nearBusiness,
      nearBusiness.current_value * NEAR_BUSINESS_VALUE_INCREASE,
    )
  })
  const res = {affectedBusinesses: nearBusinesses}
  return res
}
const tweetOnBuying10MBusiness = async event => {
  // const business = await Business.findOne({business_id: event.business_id})
  const business = event.business
  
  if (business.current_value >= 10_000_000) {
    var params = {
      place_id: business.business_id,
      key: "AIzaSyCbZ0RVOBt-LKFZkZVEKrt7tg_lY6fIOp4",
      language: "en",
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {params: params},
    )
    let city = ""
    const compound_code = response.data.result.plus_code.compound_code
    const shorted_value = (business.current_value / 1_000_000).toFixed(1)
    if (compound_code) {
      city = compound_code.split(",")[0].substring(compound_code.indexOf(" ") + 1)

    } else {
      city = response.data.result.address_components.find(
        addr_comp =>
          addr_comp.types.length == 2 &&
          addr_comp.types.includes("locality") &&
          addr_comp.types.includes("political"),
      ).short_name
    }

    if (city == "") {
      console.error("could not find city name")
    }

    city = city.split(" ").join("")

    const buyer = event.buyer
    const message = `${business.name} was bought by ${
      buyer.username
    } for ${shorted_value}M$ ${city && "#" + city}`
    twitter.v2.tweet(message)
  }

  return {}
}

const decreaseNearBusinessesValueOnSell = async event => {
  // const business = await Business.findOne({business_id: event.business_id})
  const business = event.business

  const nearBusinesses = await Business.aggregate([
    {
      $geoNear: {
        near: business.geoLocation,
        distanceField: "dist.calculated",
        maxDistance: NEAR_BUSINESS_RADIUS,
        spherical: true,
      },
    },
    {
      $match: {
        business_id: {$ne: business.business_id},
      },
    },
  ])

  nearBusinesses.forEach(nearBusiness => {
    changeBusinessValue(
      nearBusiness,
      -nearBusiness.current_value * NEAR_BUSINESS_VALUE_INCREASE,
    )
  })
  const res = {affectedBusinesses: nearBusinesses}
  return res
}

const getValueIncreaseForMissingBusiness = async event => {
  const {lat, lng} = event
  const businessLocation = {type: "Point", coordinates: [lng, lat]}
  const nearBusinesses = await Business.aggregate([
    {
      $geoNear: {
        near: businessLocation,
        distanceField: "dist.calculated",
        maxDistance: NEAR_BUSINESS_RADIUS,
        spherical: true,
      },
    },
    {
      $match: {
        owner: {$ne: null},
      },
    },
  ])
  const value_increase =
    (1 + NEAR_BUSINESS_VALUE_INCREASE) ** nearBusinesses.length
  const res = {value_increase: value_increase}
  return res
}

const setTieredValuesForLocallyBoughtBusiness = event => {
  const tieredValues = {}
  let now = new Date()
  const tomorrow = new Date(now).setDate(now.getDate() + 1)
  const dayAfterTomorrow = new Date(now).setDate(now.getDate() + 2)
  now = now.getTime()
  tieredValues.byDate = {}
  tieredValues.byDate[now] = 0.6
  tieredValues.byDate[tomorrow] = 0.8
  tieredValues.byDate[dayAfterTomorrow] = 1.0
  return {tieredValues}
}

addRule(
  "INCREASE_NEAR_BUSINESSES_VALUE_ON_BUY",
  "BuyEvent",
  increaseNearBusinessesValueOnBuy,
)

if (env == "production") {
  addRule("TWEET_ON_BUYING_10M_BUSINESS", "BuyEvent", tweetOnBuying10MBusiness)
}

addRule(
  "DECREASE_NEAR_BUSINESSES_VALUE_ON_SELL",
  "SellEvent",
  decreaseNearBusinessesValueOnSell,
)

addRule(
  "GET_VALUE_INCREASE_FOR_MISSING_BUSINESS",
  "ViewMissingBusinessEvent",
  getValueIncreaseForMissingBusiness,
)

addRule(
  "SET_TIERED_VALUES_FOR_LOCALLY_BOUGHT_BUSINESS",
  "LocalBuyEvent",
  setTieredValuesForLocallyBoughtBusiness,
)
//********************/

processEvent = async event => {
  res = {}
  relevantRules = rules[event.name]
  for (const rule of relevantRules) {
    res = {...res, ...(await rule.execute(event))}
  }

  return res
}

/** EVENTS **/

// this event is only fired when a business is acquired for the first time.
class BuyEvent {
  constructor(business, buyer) {
    this.name = "BuyEvent"
    this.business = business
    this.buyer = buyer
  }
}

class SellEvent {
  constructor(business) {
    this.name = "SellEvent"
    this.business = business
  }
}

class ViewMissingBusinessEvent {
  constructor(place_id, lat, lng) {
    this.name = "ViewMissingBusinessEvent"
    this.place_id = place_id
    this.lat = lat
    this.lng = lng
  }
}

class LocalBuyEvent {
  constructor() {
    this.name = "LocalBuyEvent"
  }
}

async function checkForBadges(user) {
  try {
    const ownedBusinesses = await Business.find({owner: user.id})
    if (
      ownedBusinesses.length === 1 &&
      !user.badges.includes(rewardItemTypes.firstBusiness)
    ) {
      await addBadgeRewardToUser(user, rewardItemTypes.firstBusiness, 10000)
    }

    if (
      ownedBusinesses.length === 5 &&
      !user.badges.includes(rewardItemTypes.fifthBusiness)
    ) {
      await addBadgeRewardToUser(user, rewardItemTypes.fifthBusiness, 20000)
    }
  } catch (error) {
    console.error("checkForBadges error: ", error)
  }
}
/**
 *
 * @param {string} userId
 * pays a reward to the inviting user
 */
async function addBadgeRewardToUser(user, badgeType, rewardAmount) {
  try {
    if (
      !user.badges?.includes(badgeType) &&
      rewardItemTypes.hasOwnProperty(badgeType)
    ) {
      const updatedUser = await User.findOneAndUpdate(
        {_id: user.id},
        {
          $push: {
            outstanding_rewards: rewardItemSchema({
              type: badgeType,
              amount: rewardAmount,
            }),
          },
          $addToSet: {
            badges: badgeType,
          },
        },
        {new: true},
      )
      return true
    } else {
      console.error("addBadgeRewardToUser already got that badge")
      return false
    }
  } catch (error) {
    console.error("addBadgeRewardToUser error: ", error)
    return true
  }
}

async function checkIfFakeGpsUsed(user, coords) {
  if (user.lastLocation?.coordinates[0] !== undefined) {
    const distance =
      gpsDistance(
        user.lastLocation.coordinates[1],
        user.lastLocation.coordinates[0],
        coords.latitude,
        coords.longitude,
      ) * 1000
    const timePassed = (Date.now() - user.lastLocationTimestamp) / 1000
    const mPerS = distance / timePassed
    if (mPerS > 25) {
      return true
    }
  }
  await User.findOneAndUpdate(
    {_id: user.id},
    {
      lastLocation: geoSchema({
        coordinates: [coords.longitude, coords.latitude],
      }),
      lastLocationTimestamp: Date.now(),
    },
  )
  return false
}

function calculateBankPrice(current_value, starting_interest) {
  // This is a rough approximation of up to half of the total interest you collect in 21 days
  const randomFactor = Math.random() * (5.5 - 3.5) + 3.5
  const newBankPrice =
    current_value - current_value * starting_interest * 0.01 * randomFactor
  return newBankPrice.toFixed()
}

module.exports = {
  checkForBadges,
  addBadgeRewardToUser,
  processEvent,
  events: {
    BuyEvent,
    SellEvent,
    ViewMissingBusinessEvent,
    LocalBuyEvent,
  },
  NEAR_BUSINESS_VALUE_INCREASE,
  NEAR_BUSINESS_RADIUS,
  checkIfFakeGpsUsed,
  calculateBankPrice,
}
