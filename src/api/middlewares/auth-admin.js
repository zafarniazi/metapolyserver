/* eslint-disable space-before-function-paren */
const httpStatus = require('http-status');
const passport = require('passport');
const APIError = require('../utils/APIError');

const handleJWTForAdmin = (req, res, next) => async (err, user, info) => {
    const error = err || info;
    const logIn = req.logIn;
    const apiError = new APIError({
        message: error ? error.message : 'Unauthorized',
        status: httpStatus.UNAUTHORIZED,
        stack: error ? error.stack : undefined,
    });

    try {
        if (error || !user) throw error;
        await logIn(user, { session: false });
    } catch (e) {
        return next(apiError);
    }

    req.user = user.transform();
    console.log('req.user admin', req.user);


    return next();
};

exports.authorizeAdmin = () => (req, res, next) =>
    passport.authenticate(
        'jwt-admin', { session: false },
        handleJWTForAdmin(req, res, next),
    )(req, res, next);
