const express = require("express");
const cors = require("cors"); // import cors
const app = express();

// Step 2: Create database connection
const db = require("./db");

// Step 3: Create schema
const Person = require("./person"); // import person schema

// Use express JSON parser (or body-parser)
app.use(express.json());

require('dotenv').config();
const port = process.env.PORT || 3000; 

// Set CORS to allow requests from http://localhost:5173
app.use(
  cors({
    origin: "http://localhost:5173", // update if using different frontend port
  })
);

// Registration endpoint
app.post("/register", async (req, res) => {
  const { fullName, email, password } = req.body;
  const newRegister = new Person({
    fullName: fullName,
    email: email,
    password: password,
  });

  try {
    const savedRegister = await newRegister.save();
    console.log("Data Saved");
    res.status(200).json(savedRegister);
  } catch (error) {
    console.log("Error saving person", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "Duplicate entry for full name or email." });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Person.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.status(200).json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});


// forget password 
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // 🔍 find email
    const user = await Person.findOne({ email });

    if (!user) {
      // no user, still say ok
      return res.status(200).json({ message: "If this email exists, a reset link has been sent." });
    }

    // 🪪 user found, just show log
    console.log(`Password reset requested for: ${email}`);

    // 📩 later send email link
    res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (error) {
    //  server error
    console.error("Error in forgot-password:", error);
    res.status(500).json({ message: "Server error. Try again later." });
  }
});
