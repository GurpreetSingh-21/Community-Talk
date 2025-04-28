const express = require("express");
const cors = require("cors"); // import cors
const app = express();
const passport = require('passport');
const LocalStrategy = require('passport-local');
// Step 2: Create database connection
const db = require("./db");

// Step 3: Create schema

// Use express JSON parser (or body-parser)
app.use(express.json());
//middleware


//imlimenting middleware to let us know how many users came
const logRequest = (req, res, next) =>{
    console.log(`${new Date().toLocaleString()} Request made to : ${req.originalUrl}`);
    next();
  }
app.use(logRequest)
require('dotenv').config();
const port = process.env.port || 3000;
// Set CORS to allow requests from http://localhost:5173
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(passport.initialize());
const LocalAuthMiddleware = passport.authenticate('local', {session:false});



app.get('/', LocalAuthMiddleware,function(req, res){
    res.send('hi')
})
//using routers here of login and register pages

const personRoutes = require('./routes/loginNregRoutes')
app.use('/',personRoutes);




app.listen(port, () => {
  console.log("Listening on port 3000");
});
