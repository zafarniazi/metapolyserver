/* eslint-disable max-len */
const httpStatus = require("http-status")
const {v4: uuidv4} = require("uuid")
const axios = require("axios")
const mongoose = require("mongoose")

// Models
const {Business, geoSchema, visitorSchema} = require("../models/business.model")
const {User} = require("../models/user.model")
const APIError = require("../utils/APIError")
const BaseController = require("./base.controller")

const {ReS, ReE} = require("../services/util.service")
const {
  interestModel,
  transferModel,
  valueChangeModel,
  valueChangeReasons,
  transactionTypes,
} = require("../models/transaction.model")
const {BodenRichtWerte} = require("../models/brw.model")
const {web_url} = require("../../config/constants")
const {checkForBadges, processEvent, events} = require("../middlewares/engine")
const engine = require("../middlewares/engine")
module.exports = class BusinessController extends BaseController {
  constructor(...props) {
    super(...props)
  }
  /**
   * Add New Business
   *
   */
  async create(req, res, next) {
    try {
      let salePrice = req.body.businessValue
      let discount = 1.0
      let body = {}
      let boughtBusiness = null
      const user = await User.findOne({
        _id: req.user.id,
      })
      const existingBusiness = await Business.findOne({
        business_id: req.body.place_id,
      })
      if (existingBusiness) {
        salePrice =
          existingBusiness.is_on_sale && existingBusiness.sale_price
            ? existingBusiness.sale_price
            : existingBusiness.current_value
        const now = new Date()
        const timeToWaitBetweenBuys = new Date(
          new Date(now).setDate(now.getDate() - 21),
        )
        const notEnoughTimeBetweenBuys = await transferModel.findOne({
          business_id: existingBusiness.id,
          to_user: req.user.id,
          created_at: {$gte: timeToWaitBetweenBuys},
        })
        if (notEnoughTimeBetweenBuys) {
          return ReE(
            res,
            "You can only buy a business every 3 weeks, you have to wait to buy it again",
          )
        }
      }
      if (req.body.buyLocal) {
        const fakeGpsUsed = await engine.checkIfFakeGpsUsed(
          user,
          req.body.coords,
        )
        if (fakeGpsUsed) {
          return ReE(
            res,
            "Suspicous movement detected, please don't use any gps faking apps",
          )
        }
        if (existingBusiness) {
          const alreadyBought = await transferModel.findOne({
            business_id: existingBusiness.id,
            to_user: req.user.id,
          })
          if (alreadyBought) {
            return ReE(
              res,
              "You already bought the business before, you only get a discount on businesses you've never had before",
            )
          }
        }
        discount = 0.5
      }
      if (user.cash_value > salePrice * discount) {
        let additionalFields = {}

        if (req.body.buyLocal) {
          const e = new events.LocalBuyEvent()
          additionalFields = await processEvent(e)
        }
        if (existingBusiness) {
          if (
            existingBusiness.owner === null ||
            (existingBusiness.is_on_sale && existingBusiness.sale_price > 0)
          ) {
            const newBankPrice = engine.calculateBankPrice(
              existingBusiness.current_value,
              existingBusiness.starting_interest,
            )
            boughtBusiness = await Business.findOneAndUpdate(
              {
                business_id: req.body.place_id,
              },
              {
                owner: req.user.id,
                is_on_sale: false,
                interest_collected_at: new Date(),
                current_value: existingBusiness.current_value,
                starting_value: existingBusiness.current_value,
                current_interest: existingBusiness.starting_interest,
                bought_locally: req.body.buyLocal,
                bank_price: newBankPrice,
                sale_price: null,
                ...additionalFields,
              },
            )
            new transferModel({
              transaction_value: salePrice,
              from_user: existingBusiness.owner || "6267c6f7ae5c9b31bccdc875",
              business_id: boughtBusiness.id,
              to_user: req.user.id,
            }).save()
          }
          // TODO: hier
        } else {
          var params = {
            place_id: req.body.place_id,
            key: "AIzaSyCbZ0RVOBt-LKFZkZVEKrt7tg_lY6fIOp4",
          }

          const response = await axios.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            {params: params},
          )
          if (
            response.status == 200 &&
            response.data &&
            response.data.status == "OK"
          ) {
            const placeDetail = response.data.result
            const newBankPrice = engine.calculateBankPrice(
              salePrice,
              1 + Math.exp(placeDetail.rating * 2) / 3000,
            )
            body = {
              owner: req.user.id,
              business_id: placeDetail.place_id,
              name: placeDetail.name,
              starting_value: salePrice,
              current_value: salePrice,
              is_on_sale: false,
              geoLocation: geoSchema({
                coordinates: [
                  placeDetail.geometry.location.lng,
                  placeDetail.geometry.location.lat,
                ],
              }),
              created_by: req.user.id,
              types: placeDetail.types,
              current_interest: 1 + Math.exp(placeDetail.rating * 2) / 3000,
              starting_interest: 1 + Math.exp(placeDetail.rating * 2) / 3000,
              visitors: [],
              offers: [],
              bank_price: newBankPrice,
              bought_locally: req.body.buyLocal,
              ...additionalFields,
            }
            req.body = body
            boughtBusiness = await this.Create(req, res, next)
            // Fire Event
            const e = new events.BuyEvent(boughtBusiness, user)
            processEvent(e)
          } else {
            return ReE(
              res,
              "Something wrong with the business, please try again.",
            )
          }
        }
        if (boughtBusiness) {
          await checkForBadges(user)
          const updatedUser = await User.findOneAndUpdate(
            {_id: req.user.id},
            {
              $inc: {cash_value: -salePrice * discount},
            },
            {new: true},
          )
          if (boughtBusiness.sale_price && boughtBusiness.is_on_sale) {
            const updatedOwner = await User.findOneAndUpdate(
              {_id: boughtBusiness.owner},
              {
                $inc: {cash_value: salePrice},
              },
              {new: true},
            )
          }
          return ReS(res, "Business added successfully.", updatedUser)
        } else {
          return ReE(res, "Something wrong with the business, please try again")
        }
      } else {
        return ReE(
          res,
          "You don't have enough money to buy this business.",
          422,
        )
      }
    } catch (error) {
      console.error("create error: " + error)
      return ReE(
        res,
        "Something wrong with the business, please try again.",
        422,
        error,
      )
    }
  }

  async list(req, res, next) {
    try {
    } catch (error) {
      return ReE(
        res,
        "Something wrong with the business, please try again.",
        422,
        error,
      )
    }
  }

  async getSingleBusiness(req, res) {
    try {
      const now = new Date()
      const yesterday = new Date(new Date(now).setDate(now.getDate() - 1))
      const queryResult = await Business.aggregate([
        {
          $match: {business_id: req.params.place_id},
        },
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "owner",
            as: "ownerData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "visitors.userId",
            foreignField: "_id",
            as: "visitorMapping",
          },
        },
        {
          $unwind: "$ownerData",
        },
        {
          $addFields: {
            profile_picture_url: {
              $concat: [`${web_url}/`, "$ownerData.profile_picture"],
            },
            owner_name: "$ownerData.username",
          },
        },
        {
          $unset: "ownerData",
        },
      ])
      const existingBusiness = queryResult.length > 0 ? queryResult[0] : null

      if (existingBusiness) {
        existingBusiness.visitor_income =
          this._getVisitorIncomeAmount(existingBusiness)
        existingBusiness.alreadyVisited = this._checkIfAlreadyVisited(
          existingBusiness,
          req.user.id,
        )
        existingBusiness.visitors.forEach(visitor => {
          let mapping = existingBusiness.visitorMapping.find(
            user => user._id.toString() == visitor.userId.toString(),
          )
          if (mapping) {
            visitor.username = mapping.username
            visitor.profile_picture_url =
              web_url + "/" + mapping.profile_picture
          }
        })
        delete existingBusiness.visitorMapping
        return ReS(res, "Business found succesfully.", existingBusiness)
      } else {
        const params = {
          place_id: req.params.place_id,
          key: "AIzaSyCbZ0RVOBt-LKFZkZVEKrt7tg_lY6fIOp4",
        }
        const response = await axios.get(
          "https://maps.googleapis.com/maps/api/place/details/json",
          {params: params},
        )
        if (
          response.status == 200 &&
          response.data &&
          response.data.status == "OK"
        ) {
          const placeDetail = response.data.result
          const {lat, lng} = placeDetail.geometry.location
          const e = new events.ViewMissingBusinessEvent(
            req.params.place_id,
            lat,
            lng,
          )
          processEvent(e).then(data => {
            return ReE(res, "Business not found", 404, data)
          })
        } else {
          return ReE(
            res,
            "Something wrong with the business, please try again.",
            422,
            error,
          )
        }
        // const nearPrices = await BodenRichtWerte.aggregate([
        //   {
        //     $geoNear: {
        //       near: {
        //         type: "Point",
        //         coordinates: [0.49858, 45.56477],
        //       },
        //       distanceField: "dist.calculated",
        //       maxDistance: 100000,
        //       spherical: true,
        //     },
        //   },
        // ])
        // console.log("nearPrices: " + JSON.stringify(nearPrices))
      }
    } catch (error) {
      console.error("getSingleBusiness error " + error)
      return ReE(
        res,
        "Something wrong with the business, please try again.",
        422,
        error,
      )
    }
  }

  async getBusinessesOnSale(req, res){
    try {
      const businesses = await Business.find({
        is_on_sale: true,
        owner: {$nin: [null, req.user.id]},
      })

      if(businesses){
        return ReS(res, "Businesses found succesfully.", businesses)
      } else {
        return ReE(res, "Business not found")
      }

    }catch(error){
      console.error("getBusinessesOnSale error " + error)
      return ReE(
        res,
        "Something wrong with the business, please try again.",
        422,
        error,
      )

    }
  }

  async getOwnBusinesses(req, res) {
    try {
      let businesses = await Business.find({
        owner: req.user.id,
      })
      if (businesses) {
        businesses = businesses.map(businessDoc => {
          const business = businessDoc.toObject()
          const timeOffset = req.body.timeOffset
          business.interest_available =
            this._checkIfInterestAvailableForBusiness(business, timeOffset)
          const interestPayment =
            business.current_value * business.current_interest * 0.01
          business.interest = interestPayment
          business.visitor_income = this._getVisitorIncomeAmount(business)
          return business
        })
        return ReS(res, "Businesses found succesfully.", businesses)
      } else {
        return ReE(res, "Business not found")
      }
    } catch (error) {
      console.error("getOwnBusinesses error: " + error)
      return ReE(
        res,
        "getOwnBusinesses Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async getBusinessesOfUser(req, res) {
    try {
      const userId = req.body.userId
      const validId = mongoose.isValidObjectId(userId)
      if (!validId) {
        return ReE(res, "getBusinessesOfUser: userId is not valid!", 422)
      }
      let businesses = await Business.find({
        owner: userId,
      })
      if (businesses) {
        return ReS(res, "Businesses found succesfully.", businesses)
      } else {
        return ReE(res, "Business not found")
      }
    } catch (error) {
      console.error("getBusinessesOfUser error: " + error)
      return ReE(
        res,
        "getBusinessesOfUser Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async sellBusinessToBank(req, res) {
    try {
      const soldBusiness = await Business.findOneAndUpdate(
        {
          business_id: req.body.place_id,
          owner: req.user.id,
        },
        {
          owner: null,
          is_on_sale: true,
        },
        {new: true},
      )

      if (soldBusiness) {
        const transfer = new transferModel({
          transaction_value: soldBusiness.bank_price,
          from_user: req.user.id,
          business_id: soldBusiness.id,
          to_user: "6267c6f7ae5c9b31bccdc875",
        })
        // await is needed so that created_at is generated upon insertion into db so that we can in turn get the timestamp
        await transfer.save()
        const currentTime = transfer.getTime()
        let factor = 1.0
        if (soldBusiness.bought_locally) {
          const maxKey = Math.max(
            ...Object.keys(soldBusiness.tieredValues.byDate).filter(
              timestamp => timestamp <= currentTime,
            ),
          )
          factor = soldBusiness.tieredValues.byDate[maxKey]
        }

        const user = await User.findOneAndUpdate(
          {_id: req.user.id},
          {
            $inc: {cash_value: soldBusiness.bank_price * factor},
          },
        )

        // Fire Event
        const e = new events.SellEvent(soldBusiness)
        processEvent(e)

        return ReS(res, "sellBusiness success.", soldBusiness)
      } else {
        return ReE(res, "Business not found")
      }
    } catch (error) {
      console.error("sellBusiness error " + error)
      return ReE(
        res,
        "sellBusiness Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  _checkIfInterestAvailableForBusiness(business, offset) {
    const collectDate = business.interest_collected_at
    const newDate = new Date()
    const localCollectDate = new Date(collectDate - offset * -1)
    const localNewDate = new Date(newDate - offset * -1)
    if (
      localCollectDate.getFullYear() !== localNewDate.getFullYear() ||
      localCollectDate.getMonth() !== localNewDate.getMonth() ||
      localCollectDate.getDate() !== localNewDate.getDate()
    ) {
      return true
    } else {
      return false
    }
  }

  _getVisitorIncomeAmount(business) {
    let collectAmount = 0
    for (let visitor of business.visitors) {
      if (!visitor.collected && visitor.amount !== undefined) {
        collectAmount += visitor.amount
      }
    }
    return collectAmount
  }
  _checkIfAlreadyVisited(business, userId) {
    let alreadyVisited = false
    const now = new Date()
    const yesterday = new Date(new Date(now).setDate(now.getDate() - 1))
    for (let visitor of business.visitors) {
      if (
        visitor.userId.toString() === userId.toString() &&
        visitor.timestamp >= yesterday
      ) {
        alreadyVisited = true
      }
    }
    return alreadyVisited
  }
  async checkIfInterestAvailable(req, res) {
    try {
      const business = await Business.findOne({
        business_id: req.body.place_id,
      })
      const offset = req.body.timeOffset
      const isAvailable = this._checkIfInterestAvailableForBusiness(
        business,
        offset,
      )
      if (isAvailable) {
        return ReS(
          res,
          "checkIfInterestAvailable success.",
          business.current_value * business.current_interest * 0.01,
        )
      } else {
        return ReE(res, "Login not far enough away")
      }
    } catch (error) {
      console.error("checkIfInterestAvailable error: " + error)
      return ReE(
        res,
        "checkIfInterestAvailable Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async getInterest(req, res) {
    try {
      const business = await Business.findOne({
        business_id: req.body.place_id,
      })
      const offset = req.body.timeOffset
      const isAvailable = this._checkIfInterestAvailableForBusiness(
        business,
        offset,
      )
      if (isAvailable) {
        const current_interest = business.current_interest
        const starting_interest = business.starting_interest
        const current_value = business.current_value
        const interestPayment = current_value * current_interest * 0.01
        const valueIncrease = current_value * (1 / current_interest) * 0.05
        const now = new Date()
        const collectDate = business.interest_collected_at
        const msInDay = 24 * 60 * 60 * 1000
        const daysPassed = Math.round(Math.abs(collectDate - now) / msInDay)
        const decreasedInterest = Math.max(
          current_interest - ((starting_interest - 0.5) / 20) * daysPassed,
          0.5,
        )
        const newBankPrice = engine.calculateBankPrice(
          current_value,
          starting_interest,
        )
        await User.findOneAndUpdate(
          {_id: req.user.id},
          {
            $inc: {cash_value: interestPayment},
          },
        )
        await Business.findOneAndUpdate(
          {business_id: req.body.place_id},
          {
            interest_collected_at: new Date(),
            current_interest: decreasedInterest,
            bank_price: newBankPrice,
            // $inc: {current_value: valueIncrease},
          },
        )
        new interestModel({
          transaction_value: interestPayment,
          business_id: business.id,
          to_user: req.user.id,
        }).save()
        return ReS(res, "getInterest success.", interestPayment)
      } else {
        return ReE(res, "Login not far enough away")
      }
    } catch (error) {
      console.error("getInterest error: " + error)
      return ReE(
        res,
        "getInterest Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async getBusinessesOnMap(req, res) {
    try {
      const businesses = await Business.aggregate([
        {
          $match: {
            geoLocation: {
              $geoIntersects: {
                $geometry: {type: "Polygon", coordinates: [req.body.polygon]},
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "owner",
            as: "ownerData",
          },
        },
        {
          $unwind: "$ownerData",
        },
        {
          $addFields: {
            profile_picture_url: "$ownerData.profile_picture",
            owner_name: "$ownerData.username",
          },
        },
        {
          $set: {
            profile_picture_url: {
              $concat: [`${web_url}/`, "$profile_picture_url"],
            },
            marker_url: {
              $concat: [`${web_url}/`, "$profile_picture_url", ".marker"],
            },
          },
        },
        {
          $unset: "ownerData",
        },
      ])
      if (businesses.length > 0) {
        return ReS(
          res,
          "getBusinessesOnMap Businesses found succesfully.",
          businesses,
        )
      } else {
        return ReE(res, "getBusinessesOnMap no business found")
      }
    } catch (error) {
      console.error("getBusinessesOnMap error: ", error)
      return ReE(
        res,
        "getBusinessesOnMap Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async visitBusiness(req, res) {
    try {
      const now = new Date()
      const yesterday = new Date(new Date(now).setDate(now.getDate() - 1))
      // check if  last visit was before yesterday, or never
      const business = await Business.findOne({
        $and: [
          {business_id: req.body.place_id},
          {
            $or: [
              {
                $and: [
                  {"visitors.userId": {$eq: req.user.id}},
                  {"visitors.timestamp": {$not: {$gte: yesterday}}},
                ],
              },
              {
                "visitors.userId": {$nin: [req.user.id]},
              },
            ],
          },
        ],
      })
      if (business) {
        const value_increase = Math.log2(business.current_value) * 15
        const payout = req.body.local ? 5000 : 200
        const updatedBusiness = await Business.findOneAndUpdate(
          {business_id: req.body.place_id},
          {
            $push: {
              visitors: visitorSchema({
                userId: req.user.id,
                local: req.body.local,
                timestamp: new Date(),
                amount: payout,
              }),
            },
            $inc: {
              current_value: value_increase,
            },
          },
          {new: true},
        )
        if (updatedBusiness) {
          await User.findOneAndUpdate(
            {_id: req.user.id},
            {
              $inc: {cash_value: payout},
            },
          )
          new valueChangeModel({
            transaction_value: value_increase,
            business_id: updatedBusiness._id,
            reason: valueChangeReasons.visitor,
          }).save()
          new interestModel({
            transaction_value: payout,
            transaction_type: transactionTypes.visit_business,
            to_user: req.user.id,
          }).save()
        }
        return ReS(res, "visitBusiness success.", {visit_reward: payout})
      } else {
        return ReE(
          res,
          "You already visited this business in the last 24hrs, wait a little bit",
        )
      }
    } catch (error) {
      console.error("visitBusiness error: ", error)
      return ReE(
        res,
        "visitBusiness Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async getVisitorIncome(req, res) {
    try {
      const business = await Business.findOne({business_id: req.body.place_id})
      let collectAmount = 0
      console.log(
        "getVisitorIncome business visitors: ",
        JSON.stringify(business.visitors),
      )
      for (let visitor of business.visitors) {
        if (!visitor.collected) {
          collectAmount += visitor.amount
        }
      }
      if (collectAmount > 0) {
        const updatedBusiness = await Business.findOneAndUpdate(
          {business_id: req.body.place_id},
          {
            $set: {"visitors.$[].collected": true},
          },
          {new: true},
        )
        if (updatedBusiness) {
          await User.findOneAndUpdate(
            {_id: req.user.id},
            {
              $inc: {cash_value: collectAmount},
            },
          )
          new interestModel({
            transaction_value: collectAmount,
            transaction_type: transactionTypes.visitor_income,
            to_user: req.user.id,
          }).save()
          return ReS(res, "getVisitorIncome success.", {
            visitor_income: collectAmount,
          })
        }
      } else {
        return ReE(res, "No rewards to collect from this business")
      }
    } catch (error) {
      console.error("getVisitorIncome error: ", error)
      return ReE(
        res,
        "getVisitorIncome Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async offerBusinessForSale(req, res, next) {
    try {
      // const business = await Business.findOne({
      //   business_id: req.body.place_id,
      //   owner: req.user.id,
      // })
      // let factor = 1.0
      // if (business.bought_locally) {
      //   const currentTime = Date.now()
      //   const maxKey = Math.max(
      //     ...Object.keys(business.tieredValues.byDate).filter(
      //       timestamp => timestamp <= currentTime,
      //     ),
      //   )
      //   factor = business.tieredValues.byDate[maxKey]
      // }
      // if (req.body.sale_price > business.current_value * factor) {
      //   ReE(res, "You can't sell the business for more than it's current value")
      // }

      const offeredBusiness = await Business.findOneAndUpdate(
        {
          business_id: req.body.place_id,
          owner: req.user.id,
        },
        {
          sale_price: req.body.sale_price,
          is_on_sale: true,
        },
        {new: true},
      )
      return ReS(res, "offerBusinessForSale success.", offeredBusiness)
    } catch (error) {
      console.error("offerBusinessForSale error: ", error)
      return ReE(
        res,
        "offerBusinessForSale Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async stopSaleOfBusiness(req, res, next) {
    try {
      const offeredBusiness = await Business.findOneAndUpdate(
        {
          business_id: req.body.place_id,
          owner: req.user.id,
        },
        {
          sale_price: null,
          is_on_sale: false,
        },
        {new: true},
      )
      return ReS(res, "stopSaleOfBusiness success.", offeredBusiness)
    } catch (error) {
      console.error("stopSaleOfBusiness error: ", error)
      return ReE(
        res,
        "stopSaleOfBusiness Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  async getBusinessesOnMapNiazi(req, res) {
    try {
      const businesses = await Business.aggregate([
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "owner",
            as: "ownerData",
          },
        },
        {
          $unwind: "$ownerData",
        },
        {
          $addFields: {
            profile_picture_url: "$ownerData.profile_picture",
            owner_name: "$ownerData.username",
          },
        },
        {
          $set: {
            profile_picture_url: {
              $concat: [`${web_url}/`, "$profile_picture_url"],
            },
            marker_url: {
              $concat: [`${web_url}/`, "$profile_picture_url", ".marker"],
            },
          },
        },
        {
          $unset: "ownerData",
        },
        {
          $project: {
            '_id': 0,
            'geoLocation': 1
          }
        }
      ])
      if (businesses.length > 0) {
        return ReS(
          res,
          "getBusinessesOnMap Businesses found succesfully.",
          businesses,
        )
      } else {
        return ReE(res, "getBusinessesOnMap no business found")
      }
    } catch (error) {
      console.error("getBusinessesOnMap error: ", error)
      return ReE(
        res,
        "getBusinessesOnMap Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }




}
