const {TwitterApi} = require("twitter-api-v2")

const twitterClient = new TwitterApi({
  appKey: "FewHAdbn9novHsoi55FuNegHX",
  appSecret: "ly9TwfoGrmmEKbWNEzvF7n6A3AUaa8SFloby00eha0fkzk36yN",
  accessToken: "1539981337418932224-gpI6tKn6c8Or4iVLtJxpIoMuCUYUoy",
  accessSecret: "x7nDxyiJZyv18aPVOD8L6LUwha0RLsJflENY1SqXa5lFS",
})

module.exports = twitterClient;