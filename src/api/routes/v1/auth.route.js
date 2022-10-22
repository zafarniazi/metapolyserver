/* eslint-disable max-len */
const express = require("express")
const validate = require("express-validation")
const passport = require("passport")

const UserController = require("../../controllers/user.controller")
const {User} = require("../../models/user.model")
const {moduleTypes} = require("../../../config/constants")

const controller = new UserController(
  User,
  moduleTypes.users,
  "User",
  null,
  null,
  null,
)

const {
  login,
  register,
  socialLoginOrRegister,
  forgot_password,
  forgot_password_code,
  reset_password,
  get_profile,
  refreshToken
} = require("../../validations/user.validation")
const router = express.Router()

// Register as new user
router
  .route("/register")
  .post(validate(register), (...args) => controller.register(...args))

// Login
router
  .route("/login")
  .post(validate(login), (...args) => controller.login(...args))

// refresh auth token
router
  .route("/refreshToken")
  .post(validate(refreshToken), (...args) =>
    controller.refreshToken(...args),
  )

router
  .route("/socialLoginOrRegister")
  .post(validate(socialLoginOrRegister), (...args) =>
    controller.socialLoginOrRegister(...args),
  )

// Forgot password
router
  .route("/forgot-password")
  .post(validate(forgot_password), (...args) =>
    controller.forGotPassword(...args),
  )

// Forgot password code verification
router
  .route("/forgot-password-code-verify")
  .post(validate(forgot_password_code), (...args) =>
    controller.verifyForgotPasswordCode(...args),
  )

// Reset Password
router
  .route("/reset-password")
  .post(validate(reset_password), (...args) =>
    controller.resetPassword(...args),
  )
router
  .route("/getProfileOfUser")
  .post(validate(get_profile), (...args) =>
    controller.getProfileOfUser(...args),
  )

module.exports = router
