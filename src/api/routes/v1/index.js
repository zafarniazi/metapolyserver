const express = require("express")
const userRoutes = require("./user.route")
const businessRoutes = require("./business.route")
const notificationsRoute = require("./notifications.route")
const playApi = require("./playApi.route")

const router = express.Router()

router.use("/user", userRoutes)
router.use("/business", businessRoutes)
router.use("/notification", notificationsRoute)
router.use("/playApi", playApi)

module.exports = router
