/* eslint-disable no-useless-catch */
const mongoose = require("mongoose")
const APIError = require("../utils/APIError")
const httpStatus = require("http-status")
const SchemaDefinition = require("../../config/constants").SchemaDefinition

const bcrypt = require("bcryptjs")
const moment = require("moment-timezone")
const jwt = require("jwt-simple")

const {jwtSecret, jwtExpirationInterval} = require("../../config/constants")
const rewardItemTypes = {
  invite: "invite",
  firstBusiness: "firstBusiness",
  fifthBusiness: "fifthBusiness",
  profilePicture: "profilePicture",
  notificationPermission: "notificationPermission",
  joinDiscord: "joinDiscord",
  followInstagram: "followInstagram",
}

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

const rewardItem = new mongoose.Schema({
  type: {
    type: rewardItemTypes,
    required: true,
  },
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
  },
  username: {
    type: String,
  },
  profile_picture_url: {
    type: String,
  },
  amount: {
    type: Number,
    default: 0.0,
  },
})
/**
 * User Schema
 * @private
 */
const userSchema = new mongoose.Schema(
  {
    unique_id: {
      type: String,
      maxlength: 128,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      maxlength: 128,
      index: true,
      trim: true,
      // lowercase: true
    },
    profile_picture: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    last_login: {
      ip: {
        type: String,
        default: null,
        index: true,
      },
      timestamp: {
        type: Date,
        default: null,
      },
    },
    password: {
      type: String,
      default: null,
      minlength: 8,
      maxlength: 128,
    },
    forgotpwd_code: {
      type: String,
      default: null,
    },
    business_value: {
      type: mongoose.SchemaTypes.Decimal128,
      default: 0.0,
    },
    cash_value: {
      type: mongoose.SchemaTypes.Decimal128,
      default: 100000.0,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    invited_by: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    outstanding_rewards: {
      type: [rewardItem],
      unique: false,
      required: false,
    },
    badges: {
      type: [String],
      default: [],
    },
    google_id: {
      type: String,
      default: null,
      index: true,
    },
    discord_id: {
      type: String,
      default: null,
      index: true,
    },
    facebook_id: {
      type: String,
      default: null,
      index: true,
    },
    lastLocation: {
      type: geoSchema,
    },
    lastLocationTimestamp: {
      type: Date,
      default: null,
    },
    subscription_active: {
      type: Boolean,
      default: false,
    },
    // flags:{
    //   surpassed_million:{
    //     type: Boolean,
    //     default: false
    //   }
    // }
  },
  SchemaDefinition,
)

/**
 * Methods
 */
/**
 * changed toJson so that it does not put the decimal values in objects
 */
userSchema.set("toJSON", {
  getters: true,
  transform: (doc, ret) => {
    if (ret.cash_value) {
      ret.cash_value = ret.cash_value.toString()
    }
    if (ret.business_value) {
      ret.business_value = ret.business_value.toString()
    }
    delete ret.__v
    return ret
  },
})

userSchema.method({
  transform() {
    const transformed = {}
    const fields = [
      // 'id',
      // 'first_name',
      // 'last_name',
      "unique_id",
      "username",
      "email",
      "profile_picture",
    ]

    fields.forEach(field => {
      transformed[field] = this[field]
    })

    return transformed
  },
})

/**
 * Statics
 */
userSchema.statics = {
  /**
   * Get user
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async get(id) {
    try {
      console.log("getting User")
      let user

      if (mongoose.Types.ObjectId.isValid(id)) {
        user = await this.findById(id).exec()
      }
      if (user) {
        return user
      }

      throw new APIError({
        message: "User does not exist",
        status: httpStatus.NOT_FOUND,
      })
    } catch (error) {
      throw error
    }
  },
  /**
   * Get user by unique id
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async getByUniqueId(unique_id) {
    try {
      console.log("getting User via unique id", JSON.stringify(unique_id))
      let user

      user = await this.findOne({unique_id}).exec()
      if (user) {
        return user
      }

      throw new APIError({
        message: "User does not exist",
        status: httpStatus.NOT_FOUND,
      })
    } catch (error) {
      throw error
    }
  },
  /**
   * Find user by email and tries to generate a JWT token
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async findAndGenerateToken(options) {
    var {username, password, ip} = options
    if (!username)
      throw new APIError({
        message: "An username is required to generate a token",
      })

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

    var condition = {username: similarUsernamesRegex, deleted: false}

    // Checking if string is email then compare with email else check with username
    if (
      username.match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      )
    ) {
      condition = {email: username, deleted: false}
    }

    const user = await this.findOne(condition).exec()
    const err = {
      status: httpStatus.BAD_REQUEST,
      isPublic: true,
    }
    if (user) {
      if (password && user.password) {
        if (user && (await user.passwordMatches(password))) {
          if (user && !user.verified) {
            throw new APIError({message: "UnVerified Email"})
          } else {
            if (username != "demo") {
              user.last_login.ip = ip
              user.last_login.timestamp = Date.now()
              user.save()
            }

            return {user, accessToken: user.token(), refreshToken: user.refreshToken()}
          }
        } else {
          err.message = "Incorrect email or password"
        }
      } else {
        err.message = "User with provided credentials do not exist."
      }
    } else {
      throw new APIError({
        message: "User with provided credentials do not exist.",
      })
    }
    throw new APIError(err)
  },

  /**
   * Find user by id and validate password
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async updatePassword(options) {
    const {email, current_password, password} = options
    if (!email)
      throw new APIError({message: "An email is required to update password"})

    const user = await this.findOne({email, deleted: false}).exec()
    const err = {
      status: httpStatus.BAD_REQUEST,
      isPublic: true,
    }
    if (user) {
      if (current_password && user.password) {
        if (user && (await user.passwordMatches(current_password))) {
          if (user && !user.verified) {
            throw new APIError({message: "UnVerified Email"})
          } else {
            user.password = password
            await user.save()
            return true
          }
        } else {
          err.message = "Incorrect email or password"
        }
      } else {
        err.message = "User with provided credentials do not exist."
      }
    } else {
      throw new APIError({
        message: "User with provided credentials do not exist.",
      })
    }
    throw new APIError(err)
  },
  /**
   * Return new validation error
   * if error is a mongoose duplicate key error
   *
   * @param {Error} error
   * @returns {Error|APIError}
   */
  checkDuplicateEmail(error) {
    if (error.name === "MongoError" && error.code === 11000) {
      let message = ""
      let field = ""
      if (error.keyPattern?.username) {
        message = "Username already exists"
        field = "username"
      }
      if (error.keyPattern?.email) {
        message = "Email already exists"
        field = "email"
      }
      return new APIError({
        message: "Validation Error",
        errors: [
          {
            field: field,
            location: "body",
            messages: [message],
          },
        ],
        status: httpStatus.CONFLICT,
        isPublic: true,
        stack: error.stack,
      })
    }
    return error
  },
}

userSchema.pre("save", async function save(next) {
  try {
    if (this.first_name && this.last_name) {
      this.name = this.first_name + " " + this.last_name
    }
    if (!this.isModified("password")) return next()
    if (!this.password) {
      return next()
    }
    const rounds = 10

    const hash = await bcrypt.hash(this.password, rounds)
    this.password = hash

    return next()
  } catch (error) {
    return next(error)
  }
})

/**
 * Methods
 */
userSchema.method({
  token() {
    const payload = {
      exp: moment().add(1, "day").unix(),
      iat: moment().unix(),
      sub: {
        _id: this._id,
        first_name: this.first_name,
        name: this.name,
        last_name: this.last_name,
        email: this.email,
        organization: this.organization,
        org_slug: this.org_slug,
      },
    }
   
    return {token: jwt.encode(payload, jwtSecret), expires: payload.exp}
  },
  shortToken() {
    const payload = {
      exp: moment().add(1440, "minutes").unix(),
      iat: moment().unix(),
      sub: {
        _id: this._id,
      },
    }
    return {token: jwt.encode(payload, jwtSecret), expires: payload.exp}
  },
  refreshToken() {
    const payload = {
      exp: moment().add(1, "month").unix(),
      iat: moment().unix(),
      sub: {
        _id: this._id,
      },
    }
    return {token: jwt.encode(payload, jwtSecret), expires: payload.exp}
  },
  async passwordMatches(password) {
    return bcrypt.compare(password, this.password)
  },
})

/**
 * @typedef User
 */
module.exports = {
  User: mongoose.model("User", userSchema),
  rewardItemSchema: mongoose.model("rewardItem", rewardItem),
  rewardItemTypes: rewardItemTypes,
}
