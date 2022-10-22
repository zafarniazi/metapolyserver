const express = require("express")
const router = express.Router()
const PlayApiController = require("../../controllers/playApi.controller")
const controller = new PlayApiController()
router.route("/purchaseSub").post(args => {
  controller.addSub(...args)
})
router.route("/getSubscriptions").get((...args) => {
  controller.getSubscriptions(...args)
})
router.route("/validatePurchase").post((...args) => {
  controller.validatePurchase(...args)
})
module.exports = router
