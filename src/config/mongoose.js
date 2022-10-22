const mongoose = require('mongoose');
const logger = require('./../config/logger');
const { mongo, env } = require('./constants');


// Exit application on error
mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: `,err);
  process.exit(-1);
});

// print mongoose logs in dev env
// if (env === 'development') {
//   mongoose.set('debug', true);
// }

/**
* Connect to mongo db
*
* @returns {object} Mongoose connection
* @public
*/
exports.connect = () => {
  logger.info('====================================');
  logger.info(mongo.uri);
  logger.info('====================================');
  mongoose.connect(mongo.uri, {
    keepAlive: 1,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
  });
  return mongoose.connection;
};
