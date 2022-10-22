/* eslint-disable max-len */
const express = require('express');
const validate = require('express-validation');
const UserController = require('../../controllers/user.controller');
const {User} = require("../../models/user.model")
const { moduleTypes } = require('../../../config/constants');

const controller = new UserController(User, moduleTypes.users, 'User', null, null, null);
const router = express.Router();
const { localUpload } = require('../../services/uploader.service');
const cpMulterUpload = localUpload('/uploads/user-profile').single('image');

const {
  update_password,
  update_profile,
  collect_reward,
} = require("../../validations/user.validation")

/**
 * Load user when API with userId route parameter is hit
 */
router.param('userId', controller.load);

// Get Profile
router
    .route('/')
    .get((...args) => controller.getProfile(...args));

router
    .route('/:userId/update-password')
    .post(validate(update_password), (...args) => controller.updatePassword(...args));

router
  .route("/:userId")
  .post(validate(update_profile), cpMulterUpload, (...args) =>
    controller.update(...args),
  )

router
  .route("/:userId/collectReward")
  .post(validate(collect_reward), (...args) =>
    controller.payRewardToUser(...args),
  )
  
router
  .route("/getUserRanking")
  .get((...args) => controller.getUserRanking(...args))

  router
    .route("/getActivityFeed")
    .get((...args) => controller.getActivityFeed(...args))

    router
      .route("/:userId/addBadgeToUser")
      .post((...args) => controller.addBadgeToUser(...args))
module.exports = router;
