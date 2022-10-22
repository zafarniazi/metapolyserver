const {google} = require("googleapis")
const {
  googleAccountName,
  googleCloudKey,
  packageName,
} = require("../../config/constants")
const {BillingTokens} = require("../models/billingTokens.model")
const {User} = require("../models/user.model")
const {ReS, ReE} = require("../services/util.service")

const scopes = ["https://www.googleapis.com/auth/androidpublisher"]
// Initialize the Google API Client from service account credentials
const jwtClient = new google.auth.JWT(
  googleAccountName,
  undefined,
  "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDs0EBk4VRKgRpA\nJfU7lQbt8c6vpDYgXuuHvq9ykun8RmsQ2v4jLMgmfQFy4M+qhFQ+MMT7SJNg/12w\nWQqgtq5EEhWhf+G228Dx8fIntMtmeS6glVDUzoiBi2+t13zQ8J2k4lZwBBPWpgJf\ndfVCB9jvAS+2YpfwekeX1J8MlYShbHTU7vZhjKqWIY1IATGHJe1B00Pu3Y7/0fU/\ne99seRWAq74Lu6TXPKPTVXLYZAVr21caySgunmi2hZP/OIFByI3LLG/fkCjx4Mrp\nde8w1X25CpVyscyqm6mD6+rWen3eUGuYiQETECgiM69VfDzVBqwY+juYf4N5tMMA\npLxN8QjHAgMBAAECggEAV4ML0NvOFOxJoZwFWFvVoDfEG/cwg1zgaB0I4+uzqSTy\nqttqn+AMJOD8GJJIW6ikIwlNudiTkfw8iI8XFNX9Zy1Rrgk+hZ8G2cIBrTesFLXC\ni9gx8zpRiqHXBuSDfQj2ELkNnT58gE1/wfwqwph4y7XiBmG/6T+e1lZd4j4csbPX\nFUKXY07TZyPbeIE5n5yFSn99wbvhR7iePazaRx8ni7Nfs0G9DaIxMr7Gu8SdUMvI\nHn2rzcsItSwkGOqQZLg3+b1/cZVPKEKCkpag5Fs6TXgCoZJNEWP4/PaykhqydqMN\n5bBmcXeMrNatYJSKfvOd36CHVf5IFxYbOsx8+Ox5FQKBgQD+FsXMCWDnLIngdTMq\n7fa9RSAsZbyznmLl9Xa23JD7/cUI3Cv4d4oXIHLvvHrEXfAq/m64eajTdm94ItJy\nXkxBdeuaGKcrfEgIlWmQydtEB4yOuPzgTwSBQLDi5k5kYA0bTnopvXhays9PWuun\nXVySUwgRm58NSMg75tNLXjKXSwKBgQDumDdlnSgX2XTkVItQfiIQttuVpitOQPJZ\npMxLmR08RhMSqf0VqBuMJ7GSPtOvLDvN8PFWM2ePBaz+XRDHJj3uOZMqjQ4zY5Pg\nmIAUBK6GBo9QKvxIZHrRuSGXyF8rfxT7qkWt3Nd7cAR47s5YmQH4H/2/5b3+8+dv\nSr22v/X69QKBgQDLpRjW1VVzMsE2wvhFmf+95p9ItimtlG4TfM6u9MzHCrdWyI/9\nTmHA82LrPhbvN5L8AnxfIjLreOsSUGZ2/5kChi5UjRm+wpdBOe8n+oDgX2SKJz2V\n0f78UQr0cD24OTuH/TfwKElEC3RoV6iztSIyrJW09xNdJE5HpFMI/vBxTQKBgQDa\nIIkMufesjh6inHRdG2NzWmk30BnpSdEGiXZIauvibcIEHyqEgRLmOGfL5upKTKtE\nJNHOV+KGS88TIOw01U5rG3HixeBEtPW9sE3vfzQ6zYZ56UKJwGrUj2cZx5LSRjVd\nuxZG1A6gCBHeqZw2PXQibsTiilv/2OYtxevZRnfQfQKBgBgq0YFbwLGLuIVumQ1N\nL18Yia0oOxseJ7zC0xKpMUI3uMXm7NxmfC4FVt5eJGfHUsSOX7+Ods61YDXyUWFL\nTn+igN7w9BYTJPeNpeX48AiaUe66jrl4sueOG5Jnxq4b3KezC7w+sABIIupGNx1b\nv/mczG4KYWnOIyHJeqvSlDMj\n-----END PRIVATE KEY-----\n",
  scopes,
)

// Connect to the Google Play Developer API with JWT Client
const playApi = google.androidpublisher({
  version: "v3",
  auth: jwtClient,
})

module.exports = class PlayApiController {
  /**
   *  Acknowledge an in-app item purchase with Play Developer API.
   *
   * @param {string} sku is the sku that is attempting to be validated
   * @param {string} purchaseToken is the token that was provided with this sku to be validated.
   * @return {(Promise<boolean>)} whether the acknowledgement of the in-app purchase was successful
   */
  async acknowledgeInAppPurchase(sku, purchaseToken) {
    try {
      const apiResponse = (
        await playApi.purchases.products.acknowledge({
          packageName: packageName,
          productId: sku,
          token: purchaseToken,
        })
      )?.data
      if (JSON.stringify(apiResponse) === `""`) {
        return true
      }
      return false
    } catch (error) {
      console.error(`Error acknowledging in-app purchase : ${error}`)
      return false
    }
  }

  /**
   * Acknowledge a subscription purchase with  Play Developer API.
   * @param {string} sku
   * @param {string} purchaseToken
   * @return {(Promise<boolean>)} whether the acknowledgement of the subscription purchase was successful
   */
  async acknowledgeSubPurchase(sku, purchaseToken) {
    try {
      const apiResponse = (
        await playApi.purchases.subscriptions.acknowledge({
          packageName: packageName,
          subscriptionId: sku,
          token: purchaseToken,
        })
      )?.data
      if (JSON.stringify(apiResponse) === `""`) {
        return true
      }
      return false
    } catch (error) {
      console.error(`Error acknowledging subscription purchase : ${error}`)
      return false
    }
  }

  /**
   *  Fetch a purchase from the Play Developer API and validate that it has not been consumed already.
   *
   * @param {string} sku is the sku that is attempting to be validated
   * @param {string} purchaseToken is the token that was provided with this sku to be validated.
   */
  async fetchPurchase(sku, purchaseToken) {
    try {
      const apiResponse = (
        await playApi.purchases.products.get({
          packageName: packageName,
          productId: sku,
          token: purchaseToken,
        })
      )?.data
      console.log(`PlayAPI Response : ${JSON.stringify(apiResponse)}`)
      return this.fromApiResponse(apiResponse, purchaseToken, sku)
    } catch (error) {
      console.error(`Error fetching purchase info : ${error}`)
      return null
    }
  }

  /**
   * Fetch full subscription purchase details from Play Developer API.
   * @param {string} sku
   * @param {string} purchaseToken
   */
  async fetchSubscriptionPurchase(sku, purchaseToken) {
    try {
      const apiResponse = (
        await playApi.purchases.subscriptions.get({
          packageName: packageName,
          subscriptionId: sku,
          token: purchaseToken,
        })
      )?.data
      console.log(`PlayAPI Response : ${JSON.stringify(apiResponse)}`)
      return this.fromApiResponse(apiResponse, purchaseToken)
    } catch (error) {
      console.error(`Error fetching subscription purchase info : ${error}`)
      return null
    }
  }

  /**
   * Grant/remove entitlement for the Basic or Premium subscription
   *
   * @param {string} userId A valid user id reference
   * @param {billing.SubscriptionPurchase} subPurchase The validated SubscriptionPurchase object
   * @param {string} sku The subscription sku
   */
  async addSub(req, res) {
    try {
      const {userId, subPurchase} = req.body
      // Add the subscription to the token db
      const addedToken = BillingTokens.create({
        userId: userId,
        token: subPurchase.purchaseToken,
      })
      if (addedToken) {
        User.findOneAndUpdate(
          {_id: userId},
          {
            subscription_active: true,
          },
        )
      }
      return Res(res, "addSub succes")
    } catch (error) {
      console.error("create error: " + error)
      return ReE(res, "addSub error, please try again.", 422, error)
    }
  }

  // Convert REST response from Play Developer API
  /**
   * fromApiResponse converts the response from the Google Play Developer API into a human readable class.
   *
   * @static
   * @memberof SubscriptionPurchase
   * @param {*} apiResponse
   * @param {string} purchaseToken
   * @return {SubscriptionPurchase}
   */
  fromApiResponse(apiResponse, purchaseToken) {
    const subPurchase = new SubscriptionPurchase()
    // Field names correspond so can leverage auto-mapping
    Object.assign(subPurchase, apiResponse)
    // For some reason the REST response for subscriptions does not include the purchase token
    subPurchase.purchaseToken = purchaseToken
    // Fix string to number type corrections
    if (subPurchase.purchaseTimeMillis)
      subPurchase.purchaseTimeMillis = Number(subPurchase.purchaseTimeMillis)
    if (subPurchase.startTimeMillis)
      subPurchase.startTimeMillis = Number(subPurchase.startTimeMillis)
    if (subPurchase.expiryTimeMillis)
      subPurchase.expiryTimeMillis = Number(subPurchase.expiryTimeMillis)
    if (subPurchase.autoResumeTimeMillis)
      subPurchase.autoResumeTimeMillis = Number(
        subPurchase.autoResumeTimeMillis,
      )
    if (subPurchase.priceAmountMicros)
      subPurchase.priceAmountMicros = Number(subPurchase.priceAmountMicros)
    if (subPurchase.userCancellationTimeMillis)
      subPurchase.userCancellationTimeMillis = Number(
        subPurchase.userCancellationTimeMillis,
      )
    if (subPurchase.purchaseTimeMillis)
      subPurchase.purchaseTimeMillis = Number(subPurchase.purchaseTimeMillis)
    return subPurchase
  }

  async getSubscriptions(req, res) {
    const apiResponse = await playApi.monetization.subscriptions.get({
      packageName: packageName,
      productId: "basic_sub",
    })
    console.log("apiResponse", JSON.stringify(apiResponse))
    return ReS(res, "getSubscriptions success.", apiResponse)
  }

  async validatePurchase(req, res) {
    const sku = req.body.sku
    const purchaseToken = req.body.token
    const inDB = await BillingTokens.find({token: purchaseToken})
    if (inDB) {
      console.error("Purchase token already exists")
      return ReE(res, "validatePurchase error, token already in use.", 422)
    }
    const apiResponse = (
      await playApi.purchases.subscriptions.get({
        packageName: packageName,
        subscriptionId: sku,
        token: purchaseToken,
      })
    )?.data
    console.log(`PlayAPI Response : ${JSON.stringify(apiResponse)}`)
    return ReS(
      res,
      "getSubscriptions success.",
      this.fromApiResponse(apiResponse),
    )
  }
}
