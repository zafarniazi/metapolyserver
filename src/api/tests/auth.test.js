//test.js

const server = require("../../index.js")
const supertest = require("supertest")
const requestWithSupertest = supertest(server)
const {v4: uuidv4} = require("uuid")

const {User} = require("../models/user.model")

const user = {
  username: "jestTest3",
  password: "realnote",
  email: "jest3@test.com",
}

var accessToken = ""
// const accessToken = (await User.findAndGenerateToken(user)).accessToken
jest.setTimeout(20000)
// describe("Auth Endpoints", () => {
//   it("/auth/register", async () => {
//     const res = await requestWithSupertest
//       .post("/v1/auth/register")
//       .send(newUser)
//     console.log("register res ", JSON.stringify(res))
//     expect(res.status).toEqual(200)
//   })
//   it("/auth/login", async () => {
//     const res = await requestWithSupertest.post("/v1/auth/login").send(user)
//     console.log("login res ", JSON.stringify(res))
//     accessToken = res.body.data.token.accessToken
//     expect(res.status).toEqual(200)
//     expect(res.type).toEqual(expect.stringContaining("json"))
//     expect(res.body).toHaveProperty("data.user")
//   })
// })

describe("POST /v1/auth/register", () => {
  it("should register a new user when request is ok", () => {
    return requestWithSupertest
      .post("/v1/auth/register")
      .send(user)
      .then(res => {
        expect(res.body.data.token).toHaveProperty("accessToken")
        expect(res.body.data.token).toHaveProperty("refreshToken")
        expect(res.body.data.token).toHaveProperty("expiresIn")
        expect(res.body.data.user).toInclude(user)
      })
  })

  it("should report error when email already exists", () => {
    user.email = "test11@testmail.com"
    return requestWithSupertest
      .post("/v1/auth/register")
      .send(user)
      .then(res => {
        console.log("email exists: ", JSON.stringify(res.body.data))
        const {field, location, messages} = res.body.errors[0]
        expect(field).toEqual("email")
        expect(location).toEqual("body")
        expect(messages).toEqual(
          expect.arrayContaining(['"email" already exists']),
        )
      })
  })

  it("should report error when the email provided is not valid", () => {
    user.email = "this_is_not_an_email"
    return requestWithSupertest
      .post("/v1/auth/register")
      .send(user)
      .then(res => {
        const {field, location, messages} = res.body.errors[0]
        expect(field).toEqual(expect.arrayContaining(["email"]))
        expect(location).toEqual("body")
        expect(messages).toEqual(
          expect.arrayContaining(['"email" must be a valid email']),
        )
      })
  })

  it("should report error when empty object is provided", () => {
    return requestWithSupertest
      .post("/v1/auth/register")
      .send({})
      .then(res => {
        const {field, location, messages} = res.body.errors[0]
        expect(field).toEqual(expect.arrayContaining(["username"]))
        expect(location).toEqual("body")
        expect(messages).toEqual(
          expect.arrayContaining(['"username" is required']),
        )
      })
  })
})
