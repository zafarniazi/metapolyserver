const eventLogger = require("log4js").getLogger("event");
const express = require("express");
const router = express.Router();

router
  .route("/")
  .post((req, res) => {
    try {
      // const ip = req.ip;
      const ip = req.ip
      req.body["ip"] = ip;
      eventLogger.trace(req.body);
      res.status(200).send();
    } catch {
      res.status(500).send();
    }
  });

  module.exports = router;
