const express = require("express")
const morgan = require("morgan")
const bodyParser = require("body-parser")
const compress = require("compression")
const cors = require("cors")
const helmet = require("helmet")
const passport = require("passport")
const sharp = require("sharp")

const webAPIRoutes = require("../api/routes/v1/index")
const authRoutes = require("../api/routes/v1/auth.route")
const logRoute = require("../api/routes/v1/log.route")
const {logs} = require("./constants")
const strategies = require("./passport")
const error = require("../api/middlewares/error")
const {
  createDirectory,
  createEventsFile,
  setDefaultSettings,
  setDefaultChannelLayouts,
  registerAdminUser,
  createTrialPackage,
} = require("./../config/util")
const path = require("path")
const contentDisposition = require("content-disposition")
const {authorize} = require("../api/middlewares/auth")
const {authorizeAdmin} = require("../api/middlewares/auth-admin")

/**
 * Express instance
 * @public
 */
const app = express()

app.set("trust proxy", "loopback")

// request logging. dev: console | production: file
app.use(morgan(logs))

// parse body params and attache them to req.body
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// gzip compression
app.use(compress())

// secure apps by setting various HTTP headers
app.use(helmet())

// enable CORS - Cross Origin Resource Sharing
app.use(cors())

// set the view engine to ejs
app.set("view engine", "ejs")

// enable authentication
app.use(passport.initialize())
passport.use("jwt-admin", strategies.jwtAdmin)
passport.use("jwt-user", strategies.jwtUser)

// mount api v1 routes
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1', authorize(), webAPIRoutes);

app.use("/v1/log", logRoute)
app.use("/v1/auth", authRoutes)
app.use("/v1", authorize(), webAPIRoutes)

// if error is not an instanceOf APIError, convert it.
app.use(error.converter)

app.use("/uploads", (req, res, next) => {
  if (req.url.includes("user-profile")) {
    return next()
  } else {
    return express.static(path.join(__dirname, "./../../uploads"), {
      fallthrough: true,
      setHeaders: (res, path) =>
        res.setHeader("Content-Disposition", contentDisposition(path)),
    })(req, res, next)
  }
})

app.use("/uploads/user-profile", (req, res, next) => {
  return express.static(
    path.join(__dirname, "./../../uploads/user-profile-minified"),
    {
      fallthrough: true,
      setHeaders: (res, path) =>
        res.setHeader("Content-Disposition", contentDisposition(path)),
    },
  )(req, res, next)
})

app.use("/uploads/user-profile", (req, res, next) => {
  let getProfilePicture = false
  let getMarker = false
  let sourceImg = decodeURI(req.url)
  if (sourceImg.endsWith(".marker")) {
    getMarker = true
    sourceImg = sourceImg.slice(0, -7)
  } else {
    getProfilePicture = true
  }

  const roundedCorners = Buffer.from(
    '<svg><rect x="0" y="0" width="128" height="128" rx="128" ry="128"/></svg>',
  )

  const roundedCornersSmall = Buffer.from(
    '<svg><rect x="0" y="0" width="69" height="69" rx="69" ry="69"/></svg>',
  )

  const marker = Buffer.from(
    `<svg width="74" height="99" viewBox="0 0 74 99" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <path d="M37.25 98.7638C40.4837 95.6877 74 63.1734 74 37C74 37 74 0.166855 37.25 0.000564761C0.5 0.166855 0.5 37 0.5 37C0.5 63.1734 34.0163 95.6877 37.25 98.7638Z" fill="#FF0000"/>
      <circle cx="37" cy="36.5" r="34.5" fill="green"/>
    </svg>`,
  )

  const imgMarker = sharp(
    path.join(__dirname, "./../../uploads/user-profile", sourceImg),
  )
    .timeout({seconds: 1})
    .toFormat("png")
    .resize(69, 69)
    .composite([
      {
        input: roundedCornersSmall,
        blend: "dest-in",
      },
    ])
    .toBuffer()
    .then(b => {
      return sharp(marker)
        .composite([
          {
            input: b,
            blend: "over",
            top: 2,
            left: 2,
          },
        ])
        .toFile(
          path.join(
            __dirname,
            "./../../uploads/user-profile-minified",
            sourceImg + ".marker",
          ),
        )
        .finally(() => {
          
          if (getMarker) {
            return express.static(
              path.join(__dirname, "./../../uploads/user-profile-minified"),
              {
                fallthrough: true,
                setHeaders: (res, path) =>
                  res.setHeader(
                    "Content-Disposition",
                    contentDisposition(path),
                  ),
              },
            )(req, res, next)
          }
        })
    })

  const imgProfilePicture = sharp(
    path.join(__dirname, "./../../uploads/user-profile", sourceImg),
  )
    .timeout({seconds: 1})
    .toFormat("png")
    .resize(128, 128)
    .composite([
      {
        input: roundedCorners,
        blend: "dest-in",
      },
    ])
    .toFile(
      path.join(__dirname, "./../../uploads/user-profile-minified", sourceImg),
    )
    .finally(() => {
      if (getProfilePicture) {
  
        return express.static(
          path.join(__dirname, "./../../uploads/user-profile-minified"),
          {
            fallthrough: true,
            setHeaders: (res, path) =>
              res.setHeader("Content-Disposition", contentDisposition(path)),
          },
        )(req, res, next)
      }
    })

  if (getProfilePicture) {
    return imgProfilePicture
  } else if (getMarker) {
    return imgMarker
  }
})

app.use(
  "/eventsForRealnoteAnalyticsXX.csv",
  express.static(path.join(__dirname, "./../../events/events.csv")),
)
// catch 404 and forward to error handler
// app.use(error.notFound);

// app.set('views', path.join(__dirname, '../../emailtemplates'));

// app.get('/', function (req, res) {
// 	res.render('forgot_password', { forgotpwd_code: '123' ,name: 'vijay'});
// });

// error handler, send stacktrace only during development
app.use(error.handler)

// create useful dir if not exists
createDirectory("uploads")
createDirectory("uploads/user-profile")
createDirectory("uploads/user-profile-minified")

createEventsFile()

// create admin user
registerAdminUser()

module.exports = app
