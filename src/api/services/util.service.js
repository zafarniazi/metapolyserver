const logger = require('../../config/logger');

module.exports = {

    ReS: (res, message, data, code = 200) => {

        res.setHeader('Cache-Control', 'no-store');
        const responseJSON = { code: code, message: message, data: data };
        // if (typeof code !== 'undefined') res.statusCode = code;
        return res.json(responseJSON);
    },

    ReE: (res, err, code = 400, data) => {

        res.setHeader('Cache-Control', 'no-store');

        if (typeof err == 'object' && typeof err.message != 'undefined') {
            err = err.message;
        }else{
            logger.error(err, {code});
        }

        // if (typeof code !== 'undefined') res.statusCode = code;
        var responseJSON = { code: code, error: err };

        if (data) { responseJSON.data = data; }
        return res.json(responseJSON);
    },
}