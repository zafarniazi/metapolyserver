//test.js

const server = require("../../index.js")
const supertest = require("supertest")
const requestWithSupertest = supertest(server)

const {User} = require("../models/user.model")

const user = {
  username: "test1",
  password: "realnote",
}

var accessToken = ""
jest.setTimeout(20000)
describe("Business Endpoints", () => {
  it("/auth/login", async () => {
    const res = await requestWithSupertest.post("/v1/auth/login").send(user)
    accessToken = res.body.data.token.accessToken
    expect(res.status).toEqual(200)
    expect(res.type).toEqual(expect.stringContaining("json"))
    expect(res.body).toHaveProperty("data.user")
  })
  it("getOwnBusinesses", async () => {
    const res = await requestWithSupertest
      .post("/v1/business/getOwnBusinesses")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({timeOffset: 0})
    expect(res.status).toEqual(200)
    expect(res.body).toHaveProperty("data")
  })

  it("getValueIncrease", async () => {
    const res = await requestWithSupertest
      .post("/v1/business/getValueIncrease")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({lat: 50.71730969999999, lng: 7.1555875})
    expect(res.status).toEqual(200)
    debugger
    expect(res.body).toHaveProperty("data")
  })
    
})
