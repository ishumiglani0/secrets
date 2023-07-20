//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose')
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const findOrCreate = require("mongoose-findorcreate");
const favicon = require('serve-favicon');

const app = express();
app.use(favicon(__dirname + '/favicon.ico'));
app.use(express.static(__dirname+"/public/"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1800000, // 1/2 hour in milliseconds
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect(`mongodb+srv://${process.env.ADMIN}:${process.env.PASSWORD}@cluster0.abvqgur.mongodb.net/userDB`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to the database Successfully!!!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database: " + err);
  });

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secrets: Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate({ googleId: profile.id }, (err, user) => {
        if (err) {
          return cb(err);
        }
        return cb(null, user);
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id).then((user) =>{
      done(null, user);
    }).catch((err)=>{
        done(err)
    });
  });

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

app.get("/secrets",(req, res)=>{
    User.find({"secrets": {$ne: null}}).then((foundUsers)=>{
        if (foundUsers) {
          console.log(foundUsers)  
          foundUsers.map((user)=>{
            user._id = user._id.toString()
          })
          console.log(foundUsers)  

            res.render("secrets", {usersWithSecrets: foundUsers});
          }
    }).catch((err)=>{
        if (err){
            console.log(err);
          } 
    })
});
app.get("/secrets/:id/:no",(req, res)=>{
    User.findById(req.params.id).then((foundUser)=>{
        if (foundUser) {
          console.log(foundUser)
            res.render("post", {secret: foundUser.secrets[req.params.no]});
          }
    }).catch((err)=>{
        if (err){
            console.log(err);
          } 
    })
});

  
  app.get("/submit", (req, res)=>{
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });
  
  app.post("/submit", function(req, res){
    console.log('entered')
    const submittedSecret = req.body.secret;
    console.log(submittedSecret)
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    // console.log(req.user.id);
  
    User.findById(req.user.id).then((foundUser)=>{
        if (foundUser) {
            console.log(foundUser)
            foundUser.secrets.push(submittedSecret);
            foundUser.save().then(()=>{
              res.redirect("/secrets");
            });
          }
    }).catch((err)=>{
        if (err) {
            console.log(err);
          }
    });
});


app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post(
    passport.authenticate("local", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/secrets");
    }
  );

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
          });
        }
      }
    );
  });

  app.get("/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});