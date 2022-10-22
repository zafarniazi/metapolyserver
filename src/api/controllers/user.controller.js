/* eslint-disable max-len */
const httpStatus = require("http-status")
const moment = require("moment-timezone")
const {v4: uuidv4} = require("uuid")
const ejs = require("ejs")
const jwt = require("jwt-simple")
const fs = require("fs")
const addUserToMailingList = require("../../config/cleverreach")
const axios = require("axios")

const APIError = require("../utils/APIError")
const BaseController = require("./base.controller")

const {ReS, ReE} = require("../services/util.service")
const {
  jwtExpirationInterval,
  web_url,
  jwtSecret,
} = require("../../config/constants")
const mailer = require("./../../config/mailer")
// Models

const {
  rewardModel,
  transactionModel,
  transactionTypes,
} = require("../models/transaction.model")
const {
  User,
  rewardItemSchema,
  rewardItemTypes,
} = require("../models/user.model")
const mongoose = require("mongoose")
const engine = require("../middlewares/engine")
module.exports = class UsersController extends BaseController {
  constructor(...props) {
    super(...props)
  }

  /**
   * Register new user
   * if all data are get correct then creating user and sending success response
   */

  async isIpAlreadyInUse(ip) {
    try {
      const now = new Date()
      const yesterday = new Date(new Date(now).setDate(now.getDate() - 1))
      const other = await User.findOne({
        "last_login.ip": ip,
        "last_login.timestamp": {$gte: yesterday},
      })

      // ip was used within the last 24 hours => disallow new registrations from it
      return other != null
    } catch (ex) {
      console.error(ex)
    }
  }

  async socialRegister(data) {
    try {
      const AMOUNT_OF_PICTURES = 50
      const unique_id = uuidv4()
      data.unique_id = `metapoly-${unique_id}`
      const profile_picture_index =
        parseInt(unique_id.split("-").join(""), 16) % AMOUNT_OF_PICTURES
      const profile_picture = `uploads/user-profile/Frame ${
        profile_picture_index + 12
      }-min.jpg`
      const userWithHighestUsername = await User.aggregate([
        {
          $match: {
            username: RegExp(`^${data.username}?([0-9]+)$`, "g"),
          },
        },
        {
          $sort: {
            username: -1,
          },
        },
        {$limit: 1},
      ])
      let highestUsername = ""
      if (userWithHighestUsername.length > 0) {
        highestUsername = userWithHighestUsername[0].username
      }
      const highestSuffix = parseInt(
        highestUsername.split(data.username)[1] || 0,
      )
      data.username = `${data.username}${highestSuffix + 1}`

      if (data.subscribeToNewsletter) {
        addUserToMailingList(data.username, data.email)
      }
      const validInviterId = mongoose.isValidObjectId(data.invited_by)
      if (!validInviterId) {
        delete data.invited_by
      }
      data.profile_picture = profile_picture
      data.cash_value = 100000.0
      const userData = {
        ...data,
        last_login: {
          ip: null,
          timestamp: Date.now(),
        },
      }
      const user = await new User(userData).save()
      if (user) {
        if (data.invited_by) {
          this.addInviteRewardToUser(data.invited_by, user, 100000)
        }
        return [null, user]
      } else {
        return ["Failed to create user, please try again", null]
      }
    } catch (error) {
      return [error, null]
    }
  }

  async register(req, res, next) {
    try {

      const isRealuser = await this.verifyToken(req.body.token)
      if (!isRealuser) {
        return ReE(res, "Verification failed")
      }  

      // don't allow registrations from ip's that have been used by users within the last 24 hours
      // to prevent abuse of invitation
      if (req.body.invited_by && (await this.isIpAlreadyInUse(req.ip))) {
        return ReE(res, "IP blocked")
      }

      const AMOUNT_OF_PICTURES = 50
      const unique_id = uuidv4()
      req.body.unique_id = `metapoly-${unique_id}`
      const profile_picture_index =
        parseInt(unique_id.split("-").join(""), 16) % AMOUNT_OF_PICTURES
      const profile_picture = `uploads/user-profile/Frame ${
        profile_picture_index + 12
      }-min.jpg`

      const usernameAvailable = await this.checkIfUsernameIsAvailable(
        req.body.username,
        null,
      )

      if (!usernameAvailable) {
        return ReE(res, "Username unavailable", 400)
      }

      if (req.body.subscribeToNewsletter) {
        addUserToMailingList(req.body.username, req.body.email)
      }
      const validInviterId = mongoose.isValidObjectId(req.body.invited_by)
      if (!validInviterId) {
        delete req.body.invited_by
      }
      req.body.profile_picture = profile_picture
      req.body.cash_value = 100000.0
      const userData = {
        ...req.body,
        last_login: {
          ip: req.ip,
          timestamp: Date.now(),
        },
      }
      const user = await new User(userData).save()
      if (user) {
        if (req.body.invited_by) {
          this.addInviteRewardToUser(req.body.invited_by, user, 100000)
        }
        return ReS(res, "User created successfully", {}, httpStatus.CREATED)
      } else {
        return ReE(res, "Failed to create user, please try again", 422)
      }
    } catch (error) {
      return next(User.checkDuplicateEmail(error))
    }
  }
  /**
   *
   * @param {string} userId
   * pays a reward to the inviting user
   */
  async addInviteRewardToUser(invitedById, user, rewardAmount) {
    try {
      const updatedUser = await User.findOneAndUpdate(
        {_id: invitedById},
        {
          $push: {
            outstanding_rewards: rewardItemSchema({
              type: rewardItemTypes.invite,
              userId: user.id,
              username: user.username,
              profile_picture_url: `${web_url}/${user.profile_picture}`,
              amount: rewardAmount,
            }),
          },
        },
        {new: true},
      )
    } catch (error) {
      console.error("addInviteRewardToUser error: ", error)
    }
  }

  // TODO hier
  async payRewardToUser(req, res) {
    try {
      const rewardData = req.body
      const updatedUser = await User.findOneAndUpdate(
        {_id: req.user.id},
        {
          $inc: {cash_value: rewardData.amount},
          $pull: {outstanding_rewards: {_id: rewardData._id}},
        },
        {new: true},
      )
      if (updatedUser) {
        new rewardModel({
          transaction_value: rewardData.amount,
          to_user: updatedUser.id,
        }).save()
        return ReS(res, "payRewardToUser success", updatedUser)
      } else {
        return ReE(res, "payRewardToUser error: User not found")
      }
    } catch (error) {
      console.error("payRewardToUser error: " + error)
      return ReE(
        res,
        "payRewardToUser Something wrong with call, please try again.",
        422,
        error,
      )
    }
  }

  /**
   * Returns a formated object with tokens
   * @private
   */
  async generateTokenResponse(tokenContainer, scope = "access") {
    const {token, expires:expiresSeconds} = tokenContainer
    const expires = expiresSeconds * 1000
    const tokenType = "Bearer"
    // expires contains expirations date in seconds since unix epoch, multiply by 1000 such that
    // it can be directly used by javascript date as milliseconds

    if(scope === "access"){
      return {
        tokenType,
        accessToken: token,
        expires,
      }
    }else if(scope === "refresh"){
      return {
        tokenType,
        refreshToken: token,
        expires,
      }
    }
  }

  async refreshToken(req, res, next){
    try {
      // does not implement refreshToken rotation.

      const refreshTokenData = jwt.decode(req.body.refreshToken, jwtSecret)
      const user = await User.findOne({_id: refreshTokenData.sub._id})
      const accessToken = user.token()
      
      const token = await this.generateTokenResponse(accessToken)
      const userTransformed = user.transform()

      return ReS(res, "Refreshed token successfully.", {
        token,
        user: userTransformed,
      })
    }catch(error){
      return next(error)
    }
  }

  /**
   *  Login
   * Return user token and user detail if provided details are valid
   */
  async login(req, res, next) {
    try {
      const {user, accessToken, refreshToken} = await User.findAndGenerateToken({
        ...req.body,
        ip: req.ip,
      })
      const token = await this.generateTokenResponse(accessToken)
      const userTransformed = user.transform()

      const refreshTokenResponse = await this.generateTokenResponse(refreshToken, "refresh")

      return ReS(res, "User logged in successfully.", {
        token,
        refreshToken: refreshTokenResponse,
        user: userTransformed,
      })
    } catch (error) {
      return next(error)
    }
  }

  async verifyToken(token) {
    const SECRET_KEY = "6LeP-mIhAAAAAOtAsfFRaQ1IZj-Tjq8LaX8ZYT0r"
    const body = `secret=${SECRET_KEY}&response=${token}`
    const {data} = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      body,
    )
    return data.success && data.score > 0.5
  }

  async socialLoginOrRegister(req, res, next) {
    try {
      const {google_id, discord_id, facebook_id} = req.body
      let user
      if (google_id) {
        user = await User.findOne({google_id}).exec()
      } else if (discord_id) {
        user = await User.findOne({discord_id}).exec()
      } else if (facebook_id) {
        user = await User.findOne({facebook_id}).exec()
      }
      let error = null
      let created = false
      if (!user) {
        const isRealuser = await this.verifyToken(req.body.token)
        if (!isRealuser) {
          return ReE(res, "Verification failed")
        }  
        ;[error, user] = await this.socialRegister(req.body)
        created = true
      }
      if (error) {
        if (error.code === 11000 && error.keyPattern.email) {
          return ReE(res, "Email already exists!")
        } else {
          return ReE(res, "Problem registering Google account.")
        }
      }

      const accessToken = user.token()
      const refreshToken = user.refreshToken()
      const token = await this.generateTokenResponse(accessToken)
      const refreshTokenResponse = await this.generateTokenResponse(
        refreshToken,
        "refresh",
      )
      const userTransformed = user.transform()

      const code = created ? httpStatus.CREATED : 200
      return ReS(
        res,
        "User logged in successfully.",
        {
          token,
          refreshToken: refreshTokenResponse,
          user: userTransformed,
        },
        code,
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * Forgot password
   * send an code mail if found email
   */
  async forGotPassword(req, res, next) {
    try {
      const user = await User.findOne(req.body)
      if (user) {
        user.forgotpwd_code = Math.floor(100000 + Math.random() * 900000)
        await user.save()
        const html = await ejs.renderFile(
          "emailtemplates/forgot_password.ejs",
          {
            name: user.username,
            forgotpwd_code: user.forgotpwd_code,
          },
        )
        mailer.sendmail(
          {
            to: user.email,
            subject: "How to reset your password on MetaPoly",
            text: "",
            html: html,
          },
          success => {
            return ReS(res, "Please Check your mail, Vefication code sent")
          },
          error => {
            throw new APIError({
              message: "Unable to send mail",
              status: httpStatus.INTERNAL_SERVER_ERROR,
            })
          },
        )
      } else {
        throw new APIError({
          message: "Email is not registered yet.",
          status: httpStatus.NOT_FOUND,
        })
      }
    } catch (error) {
      return next(error)
    }
  }

  /**
   * Verify forgot password code
   */
  async verifyForgotPasswordCode(req, res, next) {
    try {
      const {email, code} = req.body
      const user = await User.findOne({email})
      if (user && user.forgotpwd_code == code) {
        const token = user.shortToken()
        user.forgotpwd_code = token
        await user.save()
        return ReS(res, "Code is valid", {token})
      } else {
        throw new APIError({
          message: "Code is expired.",
          status: httpStatus.UNPROCESSABLE_ENTITY,
        })
      }
    } catch (error) {
      return next(error)
    }
  }

  /**
   * Rest password
   */
  async resetPassword(req, res, next) {
    try {
      const tokenData = jwt.decode(req.body.token, jwtSecret)
      const user = await User.findOne({_id: tokenData.sub._id})
      if (user && user.forgotpwd_code == req.body.token) {
        user.password = req.body.password
        user.forgotpwd_code = null
        await user.save()
        return ReS(res, "Password Changed Successfully")
      } else {
        throw new APIError({
          message: "Link is expired.",
          status: httpStatus.UNPROCESSABLE_ENTITY,
        })
      }
    } catch (error) {
      return next(error)
    }
  }

  /**
   * Load user and append to req.
   */
  async load(req, res, next, id) {
    try {
      const user = await User.getByUniqueId(id)
      req.locals = {user}
      return next()
    } catch (error) {
      return next(error)
    }
  }

  translateToFloat(value) {
    const stringValue = value.toString()
    return parseFloat(stringValue)
  }

  async getSingleProfile(req) {
    var url = ""
    if (req.user.profile_picture) {
      url = `${web_url}/${req.user.profile_picture}`
    }
    const user = await User.findOne({
      _id: req.user.id,
    })
    user.profile_picture = url
    return user
  }

  /**
   * Get Profile
   */
  async getProfile(req, res, next) {
    var user = await this.getSingleProfile(req)
    return ReS(res, "User profile get successfully.", user)
  }

  /**
   * Update new password
   */
  async updatePassword(req, res, next) {
    try {
      if (req.locals.user.id.toString() === req.user.id.toString()) {
        const body = {...req.body, email: req.locals.user.email}
        await User.updatePassword(body)
        return ReS(res, "Password updated successfully.")
      } else {
        throw new APIError({
          message: "UnAuthorized",
          status: httpStatus.UNAUTHORIZED,
        })
      }
    } catch (error) {
      next(error)
    }
  }

  async checkIfUsernameIsAvailable(username, userId) {
    // check if username already taken
    const lowerCaseUsername = username.toLowerCase()
    const specialRegexCharacters = "|^$?*+()[]{}\\"
    const similarUsernamesRegexBase = Array.from(lowerCaseUsername)
      .map(c => {
        if ("a" <= c && c <= "z") {
          return `[${c}${String.fromCharCode(c.charCodeAt(0) - 32)}]`
        } else if (specialRegexCharacters.includes(c)) {
          return `\\${c}}`
        } else {
          return c
        }
      })
      .join("")

    const similarUsernamesRegex = new RegExp(`^${similarUsernamesRegexBase}$`)
    const user = await User.findOne({
      username: similarUsernamesRegex,
      _id: {$ne: userId},
    })
    if (user) {
      return false
    }
    return true
  }

  /**
   * Update profile values like username and email and profile image
   */
  async update(req, res, next) {
    try {
      if (req.locals.user.id.toString() === req.user.id.toString()) {
        var {file, body} = req
        if (file) {
          body.profile_picture = file.path.replace("\\", "/").replace("\\", "/")
          if (
            req.locals.user.profile_picture &&
            req.locals.user.profile_picture != ""
          ) {
            if (!req.locals.user.profile_picture.includes("-min.jpg")) {
              try {
                fs.unlinkSync(req.locals.user.profile_picture)
              } catch (error) {}
            }
          }
        }

        if (body.username == "" || body.username == null) {
          delete body.username
        } else {
          const usernameAvailable = await this.checkIfUsernameIsAvailable(
            body.username,
            req.user.id,
          )
          if (!usernameAvailable) {
            return ReE(
              res,
              "Username is already in use, please try different one.",
            )
          }
        }

        if (body.email == "" || body.email == null) {
          delete body.email
        } else {
          const user = await User.findOne({email: body.email})
          if (user && user.id != req.user.id) {
            return ReE(
              res,
              "Email is already in use, please try different one.",
            )
          }
        }

        const response = await this.Update(req.user.id, body, req, res, next)
        if (response) {
          var user = await User.get(req.user.id)
          req.user = user
          var user = await this.getSingleProfile(req)
          if (
            body.profile_picture &&
            !user.badges?.includes(rewardItemTypes.profilePicture)
          ) {
            engine.addBadgeRewardToUser(
              user,
              rewardItemTypes.profilePicture,
              10000,
            )
          }
          return ReS(res, "Updated Successfully.", user)
        } else {
          return ReE(res, "Failed to update, please try again.")
        }
      } else {
        throw new APIError({
          message: "UnAuthorized",
          status: httpStatus.UNAUTHORIZED,
        })
      }
    } catch (error) {
      next(error)
    }
  }

  async getProfileOfUser(req, res, next) {
    try {
      const userId = req.body.userId
      const validId = mongoose.isValidObjectId(userId)
      if (validId) {
        const user = await User.findOne({
          _id: userId,
        })
        if (user) {
          const url = `${web_url}/${user.profile_picture}`
          user.profile_picture = url
          return ReS(res, "getProfileOfUser success", user)
        } else {
          return ReE(res, "getProfileOfUser: no user found!", 422)
        }
      } else {
        return ReE(res, "getProfileOfUser: userId is not valid!", 422)
      }
    } catch (error) {
      console.error("getProfileOfUser error: ", error)
      next(error)
    }
  }
  async getUserRanking(req, res, next) {
    try {
      const rankedUsers = await User.aggregate([
        {
          $match: {
            cash_value: {$ne: 100000},
          },
        },
        {
          $lookup: {
            from: "businesses",
            foreignField: "owner",
            localField: "_id",
            as: "businessData",
          },
        },
        {
          $addFields: {
            business_value: {$sum: "$businessData.current_value"},
            profile_picture_url: {
              $concat: [`${web_url}/`, "$profile_picture"],
            },
          },
        },
        {
          $addFields: {
            total_value: {$add: ["$business_value", "$cash_value"]},
          },
        },
        {
          $sort: {
            total_value: -1,
            business_value: -1,
          },
        },
        {
          $unset: "businessData",
        },
      ])
      return ReS(res, "getUserRanking success", rankedUsers)
    } catch (error) {
      console.error("getUserRanking error: ", error)
      next(error)
    }
  }

  async getActivityFeed(req, res, next) {
    try {
      const feed = await transactionModel.aggregate([
        {
          $match: {
            transactionType: transactionTypes.business_transfer,
          },
        },
        {
          $lookup: {
            from: "businesses",
            foreignField: "_id",
            localField: "business_id",
            as: "businessData",
          },
        },
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "to_user",
            as: "buyerData",
          },
        },
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "from_user",
            as: "sellerData",
          },
        },
        {
          $unwind: {
            path: "$businessData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$buyerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$sellerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            business_name: "$businessData.name",
            place_id: "$businessData.business_id",
            buyer_name: "$buyerData.username",
            buyer_picture: {
              $concat: [`${web_url}/`, "$buyerData.profile_picture"],
            },
            seller_name: "$sellerData.username",
            seller_picture: {
              $concat: [`${web_url}/`, "$sellerData.profile_picture"],
            },
          },
        },
        {
          $unset: ["businessData", "buyerData", "sellerData"],
        },
        {
          $sort: {
            _id: -1,
          },
        },
        {$limit: 50},
      ])
      return ReS(res, "getActivityFeed success", feed)
    } catch (error) {
      console.error("getActivityFeed error: ", error)
      next(error)
    }
  }

  async addBadgeToUser(req, res, next) {
    try {
      const badgeType = rewardItemTypes[req.body.badgeType]
      console.log("badgeType ", badgeType)
      engine.addBadgeRewardToUser(req.user, badgeType, req.body.rewardAmount)
      return ReS(res, "addBadgeToUser success")
    } catch (error) {
      console.error("addBadgeToUser error: ", error)
      next(error)
    }
  }
}
