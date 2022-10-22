/* eslint-disable max-len */
const express = require('express');
const validate = require('express-validation');
const BusinessController = require('../../controllers/business.controller');
const {Business} = require('../../models/business.model');
const { moduleTypes } = require('../../../config/constants');

const controller = new BusinessController(Business, moduleTypes.business, 'Business');
const router = express.Router();
// const { localUpload } = require('../../services/uploader.service');
// const cpMulterUpload = localUpload('/uploads/user-profile').single('image');

const {
  create,
  getSingleBusiness,
  getOwnBusinesses,
  getValueIncrease,
  getBusinessesOfUser,
  sellBusinessToBank,
  checkIfInterestAvailable,
  getInterest,
  getBusinessesOnMap,
  visitBusiness,
  getVisitorIncome,
  getBusinessesOnSale
} = require("../../validations/business.validation")

router
  .route("/buy")
  .post(validate(create), (...args) => controller.create(...args))

router
  .route("/sellBusinessToBank")
  .post(validate(sellBusinessToBank), (...args) =>
    controller.sellBusinessToBank(...args),
  )

router
  .route("/getOwnBusinesses")
  .post(validate(getOwnBusinesses), (...args) =>
    controller.getOwnBusinesses(...args),
  )

router
  .route("/getValueIncrease")
  .post(validate(getValueIncrease), (...args) =>
    controller.getValueIncrease(...args),
  )

router
  .route("/:place_id")
  .get(validate(getSingleBusiness), (...args) =>
    controller.getSingleBusiness(...args),
  )

  router
  .route("/getBusinessesOnSale")
  .post(validate(getBusinessesOnSale), (...args) =>
    controller.getBusinessesOnSale(...args),
  )

router
  .route("/checkIfInterestAvailable")
  .post(validate(checkIfInterestAvailable), (...args) =>
    controller.checkIfInterestAvailable(...args),
  )

router
  .route("/getInterest")
  .post(validate(getInterest), (...args) => controller.getInterest(...args))

router
  .route("/getBusinessesOnMap")
  .post(validate(getBusinessesOnMap), (...args) =>
    controller.getBusinessesOnMap(...args),
  )
//niazi
router
  .route("/getBusinessesOnMapNiazi")
  .post((...args) =>
    controller.getBusinessesOnMapNiazi(...args),
  )

router
  .route("/getBusinessesOfUser")
  .post(validate(getBusinessesOfUser), (...args) =>
    controller.getBusinessesOfUser(...args),
)
router
.route("/visitBusiness")
.post(validate(visitBusiness), (...args) =>
  controller.visitBusiness(...args),
)
router
  .route("/offerBusinessForSale")
  .post(validate(getVisitorIncome), (...args) =>
    controller.getVisitorIncome(...args),
  )
  
router
  .route("/offerBusinessForSale")
  .post(validate(sellBusinessToBank), (...args) =>
    controller.offerBusinessForSale(...args),
  )
router
  .route("/stopSaleOfBusiness")
  .post(validate(sellBusinessToBank), (...args) =>
    controller.stopSaleOfBusiness(...args),
  )
module.exports = router;
