const axios = require("axios")
const clientId = "YnQiyqyEv3"
const clientSecret = "U7KK22B4yVuBat8VKIdY2ULpi4t6IiCG"
const restApi = "https://rest.cleverreach.com/v3/"
class CleverreachClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.accessToken = this.login()
  }

  login = () => {
    const tokenUrl = "https://rest.cleverreach.com/oauth/token.php"
    const params = {grant_type: "client_credentials"}
    const options = {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
    }

    try {
      return axios.post(tokenUrl, params, options).then(res => {
        const accessToken = res.data.access_token
        return accessToken
      })
    } catch (ex) {
      console.error(ex)
      return null
    }
  }

  _sendRequest = async (endpoint, body, method = "POST") => {
    const options = {
      headers: {
        Authorization: "Bearer " + (await this.accessToken),
      },
    }
    let res = null
    switch (method) {
      case "POST":
        res = axios.post(`${restApi}${endpoint}`, body, options)
        break

      default:
        console.error("Unsupported request method")
    }
    try {
      res = await res
      return res
    } catch (ex) {
      if (ex.response.status == 401) {
        console.log("Bad Authentication")
        this.accessToken = this.login()
        return this._sendRequest(endpoint, body, method)
      } else {
        console.error(ex)
        return null
      }
    }
  }

  addUserToMailingList = async (username, email) => {
    const body = {
      email: email,
      global_attributes: {
        username: username,
      },
    }

    this._sendRequest("groups.json/537664/receivers", body)
  }
}

const client = new CleverreachClient(clientId, clientSecret)

module.exports = client.addUserToMailingList
