// .env config .....
if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
// console.log(process.env);

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const PORT = 8080;
const ExpressError = require("./utils/ExpressError");
const cors = require("cors");

//route imports
const listingRoute = require("./routes/listing");
const reviewRoute = require("./routes/review");
const userRoute = require("./routes/user");
const paymentRoute = require("./routes/payment");

// reuire passport and passport-local library for authentication
const passport = require("passport");
const LocalStrategy = require("passport-local");

// require User model
const User = require("./models/userSchema");

const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");

// Enable CORS for all routes
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dburl = process.env.ATLASDB_URL;

main()
  .then((res) => console.log("connection successful ..."))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(dburl, {
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: true,
    // useNewUrlParser: true,
    // useUnifiedTopology: true
  });
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

//  mongos store ...........
const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 60 * 60, // time in seconds
});

store.on("error", (err) => {
  console.log("session store error", err);
});

// express-session .......
const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // expire in 7 days
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
// connect-flash ........
app.use(flash());

// configure passport ......
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport-Local Strategy
passport.use(new LocalStrategy(User.authenticate()));

// Required for storing user data in the session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// routes .....
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.isLoggedIn = req.user; // current user

  next();
});

//register a user using User.register in the passport.local.mongoose .....

// app.get("/demouser", async (req,res)=>{
//   const fakeuser = new User({
//     email : "xyx@gamil.com",
//     username : "sarthak"
//   });
//   let registerdUser = await User.register(fakeuser, "password")
//   res.send(registerdUser)
// })

app.get("/", (req, res) => {
  res.redirect("/listings");
});

// Routes  .........................
app.use("/listings", listingRoute);
app.use("/listings/:id/reviews", reviewRoute);
app.use("/", userRoute);
app.use("/", paymentRoute); // Mount payment routes

app.use((req, res, next) => {
  next(new ExpressError(404, "page not found !"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "SOMETHING WENT WRONG!" } = err;
  res.status(statusCode).render("listings/error.ejs", { err });
});

app.listen(PORT, () => {
  console.log(`server running at PORT ${PORT}`);
});
