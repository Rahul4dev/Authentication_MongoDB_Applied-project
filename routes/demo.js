const express = require("express");

// step 2, encrypt the password entered by the user so that it can be stored in the database.
const bcrypt = require("bcryptjs"); // to encrypt the password entered by the users.

const db = require("../data/database");

const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  // from step 6: error handling of user
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) {
    // first time signup
    sessionInputData = {
      hasError: false,
      email: "",
      confirmEmail: "",
      password: "",
    };
  }
  // reset the data on session saved when user input wrong data. So for the new signup page, it will be cleared.
  req.session.inputData = null;

  // now we can send this inputData into our template for one time only. data inside sessionInputData is still there. it is stored for one request only.
  // this technique is called Flashing, we flash the data to the signup page for the first time only and then delete it.
  res.render("signup", { inputData: sessionInputData });
});

router.get("/login", function (req, res) {
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) {
    // first time signup
    sessionInputData = {
      hasError: false,
      email: "",
      password: "",
    };
  }

  req.session.inputData = null;
  res.render("login", { inputData: sessionInputData });
});

// Step 1, the signUp process, here we create the user account by getting the  input of email and password. signup template we have build in views folder, where we can see the credentials we get from the POST request, which ultimately we use here to resolve the request.

router.post("/signup", async function (req, res) {
  // from post request we get email, password and confirm_password#
  const userData = req.body; // data fetched from the input field-  email, password and confirm-password
  const enteredEmail = userData.email; // here we can also use as userData['email], but for special character we use [] only to show the usage of the special character.

  const enteredConfirmEmail = userData["confirm-email"]; // due to '-' b/t confirm and email, we can't use dot notation, for that we use [] to access the components of the object.
  const enteredPassword = userData.password;

  // email-validation step:
  // We encounter two major flaw in the system if we just store the user input without validating the correct manner of input.
  // 1. If user enter invalid email which di not contain @, and single digit password,
  // 2. If the email exist in our database is again used for the signup, we can't store same email address multiple times.

  if (
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim() < 6 || // password length
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes("@")
  ) {
    // step 6: Handling errors by users: for more UX/UI
    // 1. If user gave wrong email or password, we redirect to signup, not render the signup page as it again send a signup template as post request which we avoid if user have not yet entered in protective page.
    // But redirect do no carry along any data with the get request, so we can use SESSION here to carry some data of the wrong input in new page to correct it.
    // console.log("Incorrect Date entered");
    req.session.inputData = {
      hasError: true,
      message: "Invalid input - please check your inputs.",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };

    // se we redirect only after we save this data in a session
    req.session.save(function () {
      return res.redirect("/signup");
      // now we have check also that we do save this data, we check it in get route of the signup.
    });
    return; // server crashed due to multiple responses. first from above redirection and second also execute and redirected to same signup.
    // We do not want GEC to execute the lines below if it came from above if check, so we return again.
  }

  // if GEC reached out to here means user have entered correct inputs.
  // checking existing email address
  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  // if we do find one existing email address
  if (existingUser) {
    req.session.inputData = {
      hasError: true,
      message:
        "User exist already, use another email or sign in with existing email address",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };
    // step 8: More UX/UI, same step here to save the wrong input and redirect to signup for correction.
    req.session.save(function () {
      return res.redirect("/signup");
    });
    return;
  }

  // we can't store the password as plain text for potential threats, we have to hash them, i.e, we change them into a non-readable form, which can't be decoded. for that we need bcrypt.js package.    In terminal:  npm install bcryptjs

  const hashedPassword = await bcrypt.hash(enteredPassword, 12);
  // here its attributes are the password string and the salt length i.e, length of hash_code. But the hashedPassword can't be decoded. it will remain hashed when pass through the bcrypt algorithm.

  const user = {
    // we create an object to store these date we get from the post request of the signup page which will be used to store in the database
    email: enteredEmail,
    password: hashedPassword,
  };

  await db.getDb().collection("users").insertOne(user);

  res.redirect("/login");
});

// step 3 & 4, login template, user credentials, session creation and storage
router.post("/login", async function (req, res) {
  // so from login page we get this post req containing user's email and password which we have to validate.
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;

  // here we check the date entered by the user that it matches with our existing user credentials i.e, email and password. we check it from the database which take async ops so we await the promise and when it execute we will get the result i.e, we do find one or not!

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  // since email validation is easy and fast, if the email matched from the database, it will send the data related to that email, which ultimately confirms that the user do exist in the database. here we are not checking any typo made by the user. it will be tackled later in the error handling step.

  if (!existingUser) {
    req.session.inputData = {
      hasError: true,
      message: "Could not logged you in - Please check your credentials!",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      return res.redirect("/login");
    });
    return;
  }
  // when it checks the if statement and passes, then we have to check the enteredPassword also match with that user password. So we have to change the new enteredPassword into hashPassword and then check if it matches or not, as the same algo on the same password will create same hash_code.

  const passwordAreEqual = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  ); // 'compare' method gives a boolean promise, hence we will await for its data.

  // then we check if the boolean we receive is true or false, if not..
  if (!passwordAreEqual) {
    req.session.inputData = {
      hasError: true,
      message: "Could not logged you in - Please check your credentials!",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      return res.redirect("/login");
    });
    return;
  }
  // if GEC makes upto this line it means, both email and password is correct. hence we can grant the user to enter in the protective resources. and we can show personalized content for the user through cookies and sessions. which comes in next step.

  // Step 4. Way towards User Authentication.
  // Authentication steps like Creating user account and login is done on step 1 & 3. So here we will move forward to request funnel work in app.js, where we have require session and its database package ( in terminal:  npm install connect-mongodb-session ) to store the session data which will ultimately be used in authentication.

  // now we use a data of user which we store later in the session, but not the password, as here we still not validating the authentication, just considering to the login user.
  req.session.user = {
    id: existingUser._id,
    email: existingUser.email, //isAdmin: existingUser.isAdmin // step 7. we store this data here and the validate it. or in admin route
  };
  req.session.isAuthenticated = true; // it is not necessary though, as we get the user id and email if the GEC reached here.but we kept it to validate the user later in the step 5.

  // now we require to store the session data in the database. since we are using session package it will automatically do it for us when the user id and email matched with the database.

  // however storing task will be async, hence require some time and if we manually do not save the data, the GEC will reach out to the next code i.e, redirect call which we do not want, as till that time user will be not considered authenticated. so we save manually.. and redirect occur only after we save the session data. we use save() method here.

  req.session.save(function () {
    res.redirect("/profile");
  });

  // so we have redirected the page but still we have to give some protection to the admin page. We have to check for the validation of the session id.
});

// step 5. We now check the session data in the routes that should be protected and check wether the access should be granted or not.
router.get("/admin", async function (req, res) {
  // check the user session 'ticket', for the authentication.

  if (!req.session.isAuthenticated) {
    // or if (!req.session.user)
    return res.status(401).render("401"); // user Not Authenticated
  }

  // step 7: validating the Authorization through isAdmin value
  const user = await db
    .getDb()
    .collection("users")
    .findOne({ _id: req.session.user.id });

  if (!user || !user.isAdmin) {
    return res.status(403).render("403");
  }

  res.render("admin"); // user Authenticated
});

// step 7: Adding Authorization technique
router.get("/profile", function (req, res) {
  // check the user session 'ticket', for the authentication.

  if (!req.session.isAuthenticated) {
    // or if (!req.session.user)
    return res.status(401).render("401"); // user Not Authenticated
  }
  res.render("profile"); // user Authenticated
});

// step 6. Now we can alter the session data in order to logout the session.
router.post("/logout", function (req, res) {
  // here we have to delete the session data created during login which gives the user access to the protected resources.

  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect("/"); // back to starting page. here we do not rely on the data to be saved or parsed, so here we redirect the page hassle_free.

  // now if we check on the browser we can logout from the page and we would require to log in again if we want to access admin page.

  // however we have not deleted the session cookie from the browser which will be useful for us, as we can use it to map the user. we can see it in mongoShell that Session is there but user data changed.
});

module.exports = router;
