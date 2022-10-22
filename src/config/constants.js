/* eslint-disable no-undef */
const path = require('path');
const userTypes = {
	admin: 1,
	user: 2
};

const moduleTypes = {
	users: 1,
	business: 2
}

const operationTypes = {
	get: 'view',
	create: 'create',
	update: 'update',
	delete: 'delete',
};


const modulesList = Object.values(moduleTypes);

const SchemaDefinition = {
	timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// // import .env variables
// require('dotenv-safe').config({
// 	path: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`),
//   sample: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`)
// });

console.log("process.env", process.env.NODE_ENV, process.env.MONGO_URI)

module.exports = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  serverToken: process.env.SERVER_TOKEN,
  stripeSecret: process.env.STRIPE_SECRET_API_KEY,
  googleCloudBucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME,
  mongo: {
    uri: process.env.MONGO_URI,
  },
  web_url: process.env.WEB_URL,
  logs: process.env.NODE_ENV === "production" ? "combined" : "dev",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  googleAccountName: process.env.GOOGLE_CLOUD_EMAIL,
  googleCloudKey: process.env.GOOGLE_CLOUD_KEY,
  packageName: process.env.APP_PACKAGE_NAME,
  googleTopicId: process.env.RTDN_PUBSUB_TOPIC,
  userTypes,
  moduleTypes,
  modulesList,
  operationTypes,
  SchemaDefinition,
}
