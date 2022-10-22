const JwtStrategy = require("passport-jwt").Strategy
const {ExtractJwt} = require("passport-jwt")
const {jwtSecret} = require("./constants")
const AdminUser = require("../api/models/admin-user.model")
const {User} = require("../api/models/user.model")

const jwtOptions = {
  secretOrKey: jwtSecret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
}

const jwtAdmin = async (payload, done) => {
  try {
    const user = await AdminUser.findById(payload.sub).exec()
    if (user) return done(null, user)
    return done(null, false)
  } catch (error) {
    return done(error, false)
  }
}
const jwtUser = async (payload, done) => {
  try {
    const user = await User.findOne({_id: payload.sub, deleted: false})
      .lean()
      .exec()
    if (user) {
      return done(null, user)
    }
    return done(null, false)
  } catch (error) {
    return done(error, false)
  }
}

exports.jwtAdmin = new JwtStrategy(jwtOptions, jwtAdmin)
exports.jwtUser = new JwtStrategy(jwtOptions, jwtUser)
