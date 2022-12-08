const path = require("path");

const express = require("express");
const session = require("express-session"); // require for session authentication purposes.
const mongodbStore = require("connect-mongodb-session"); // require to store the session data.

const db = require("./data/database");
const demoRoutes = require("./routes/demo");

const MongoDBDStore = mongodbStore(session); // we pass the session package, which gives a class constructor used to create an object of certain blueprint.

const app = express();

const sessionStore = new MongoDBDStore({
  uri: "mongodb://127.0.0.1:27017",
  databaseName: "auth-demo", // put name of our database, we can get it from database.js
  collection: "sessions", // we create a session object table in the database to store our session data
});

// this is our request funnel where we parse all incoming request to its routes of request handling functions.
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

// we execute session as a function here, it will create a middleware function which is registered for this overall request funnel.
// session function require an object to configure this session, which we set the settings here..
app.use(
  session({
    secret: "super-secret", // require a session key to make it secure from hijacking. this should not be human readable and also updated with new and previous one will be kept as another key, because as we change this secret key, first secret to be precise, the session will end for all the users. to remain them till they themselves do not log out we need to store the older key as another secret i.e, second secret.
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // we created a database table in sessionStore where it will store our session data.

    // if we want to specify expiration time of a session.
    // by default it is not set. and depend on session ending by the browser or user delete the cookie, will ultimately ends the session.
    // takes an object.. see on mongoShell how session data looks like   in auth-demo   db.sessions.find()
    // cookie: {
    // maxAge: 30 * 24 * 60 * 60 * 1000, // 30 day expiration
    // //day * hour * minute * seconds * milliseconds
    // }
  })
);

app.use(demoRoutes);

app.use(function (error, req, res, next) {
  res.render("500");
});

db.connectToDatabase().then(function () {
  app.listen(3000);
});
