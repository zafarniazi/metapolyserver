const Joi = require('joi');

module.exports = {
  create: {
    body: {
      // username: Joi.string().max(30).required(),
      // password: Joi.string().required().min(8).max(128),
    },
  },
  sellBusinessToBank: {
    body: {
      place_id: Joi.string().required(),
    },
  },
  getSingleBusiness: {
    params: {
      place_id: Joi.string().required(),
    },
  },
  getOwnBusinesses: {
    body: {
      timeOffset: Joi.number().required(),
    },
  },
  getValueIncrease: {
    body: {
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    },
  },
  checkIfInterestAvailable: {
    body: {
      timeOffset: Joi.number().required(),
      place_id: Joi.string().required(),
    },
  },
  getInterest: {
    body: {
      timeOffset: Joi.number().required(),
      place_id: Joi.string().required(),
    },
  },
  getBusinessesOnMap: {
    body: {
      polygon: Joi.array().required(),
    },
  },
  getBusinessesOfUser: {
    body: {
      body: {userId: Joi.string().required()},
    },
  },
  visitBusiness: {
    body: {
      place_id: Joi.string().required(),
      local: Joi.boolean().required(),
    },
  },
  getVisitorIncome: {
    body: {
      place_id: Joi.string().required(),
    },
  },
  getBusinessesOnSale: {    
  }
}
