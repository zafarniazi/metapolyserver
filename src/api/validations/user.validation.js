const Joi = require("joi")

module.exports = {
  login: {
    body: {
      username: Joi.string().max(30).required(),
      password: Joi.string().required().min(8).max(128),
    },
  },

  refreshToken: {
    body: {
      refreshToken: Joi.string().required(),
    },
  },

  register: {
    body: {
      username: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().required().min(8).max(128),
    },
  },

  socialLoginOrRegister: {
    body: Joi.object()
      .keys({
        facebook_id: Joi.string().optional(),
        google_id: Joi.string().optional(),
        discord_id: Joi.string().optional(),
        username: Joi.string().max(30).required(),
        email: Joi.string().email().required(),
      })
      .or("facebook_id", "google_id", "discord_id") // At least one of these keys must be in the object to be valid.
      .required(),
  },

  forgot_password: {
    body: {
      email: Joi.string().email().required(),
    },
  },

  forgot_password_code: {
    body: {
      email: Joi.string().email().required(),
      code: Joi.string().min(6).max(6).required(),
    },
  },

  reset_password: {
    body: {
      token: Joi.string().required(),
      password: Joi.string().required().min(8).max(128),
    },
  },

  update_password: {
    body: {
      current_password: Joi.string().min(8).max(128).required(),
      password: Joi.string().min(8).max(128).required(),
    },
    params: {
      userId: Joi.string().required(),
    },
  },
  update_profile: {
    body: {
      username: Joi.string().max(30).optional(),
      email: Joi.string().email().optional(),
    },
    params: {
      userId: Joi.string().required(),
    },
  },
  collect_reward: {
    body: {},
    params: {
      // userId: Joi.string().required,
    },
  },
  get_profile: {
    body: {userId: Joi.string().required()},
  },
}
