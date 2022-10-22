//test.js

const server = require("../../index.js")
const supertest = require("supertest")
const requestWithSupertest = supertest(server)

const {User} = require("../models/user.model")

const user = {
  username: "test1",
  password: "realnote",
}

const newUser = {
  username: "jestTest",
  password: "realnote",
  email: "jest@test.com",
}

var accessToken = ""
// const accessToken = (await User.findAndGenerateToken(user)).accessToken
jest.setTimeout(20000)
describe("User Endpoints", () => {
  it("/auth/login", async () => {
    const res = await requestWithSupertest.post("/v1/auth/login").send(user)
    console.log("login res ", JSON.stringify(res))

    accessToken = res.body.data.token.accessToken
    expect(res.status).toEqual(200)
    expect(res.type).toEqual(expect.stringContaining("json"))
    expect(res.body).toHaveProperty("data.user")
  })

  it("user/getActivityFeed", async () => {
    const res = await requestWithSupertest
      .get("/v1/user/getActivityFeed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toEqual(200)
  })
})
