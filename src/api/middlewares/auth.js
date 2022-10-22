/* eslint-disable space-before-function-paren */
const httpStatus = require("http-status")
const passport = require("passport")
const APIError = require("../utils/APIError")
const {userTypes} = require("../../config/constants")
const jwt = require("jwt-simple")

const ADMIN = "admin"
const LOGGED_USER = "_loggedUser"

const handleJWT = (req, res, next) => async (err, user, info) => {
  const error = err || info
  const logIn = req.logIn
  const apiError = new APIError({
    message: error ? error.message : "Unauthorized",
    status: httpStatus.UNAUTHORIZED,
    stack: error ? error.stack : undefined,
  })

  try {
    if (error || !user) throw error
    await logIn(user, {session: false})
  } catch (e) {
    return next(apiError)
  }

  req.user = {
    ...user,
    id: user._id,
  }
  // check if user is owner by role. Owner will not have any role specified
  req.user.userType = userTypes.user

  return next()
}

exports.ADMIN = ADMIN
exports.LOGGED_USER = LOGGED_USER

exports.authorize = () => (req, res, next) => {
  return passport.authenticate(
    "jwt-user",
    {session: false},
    handleJWT(req, res, next),
  )(req, res, next)
}
