const express = require("express");
const cors = require("cors"); // import cors
const app = express();

// Step 2: Create database connection
const db = require("./db");

// Step 3: Create schema

// Use express JSON parser (or body-parser)
app.use(express.json());

require('dotenv').config();
const port = process.env.port || 3000;
// Set CORS to allow requests from http://localhost:5173
app.use(
  cors({
    origin: "http://localhost:5174",
  })
);

//using routers here of login and register pages

const personRoutes = require('./routes/loginNregRoutes')
app.use('/', personRoutes);




app.listen(port, () => {
  console.log("Listening on port 3000");
});
