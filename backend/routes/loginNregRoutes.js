const express = require("express");
const router = express.Router();
const Person = require('../person');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const bcrypt = require('bcryptjs'); // Add this at top

router.post("/register", async (req, res) => {
  const { fullName, email, password } = req.body;
  console.log("Login request body:", { email, password });

  try {
    // Hash the password first
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newRegister = new Person({
      fullName: fullName,
      email: email,
      password: hashedPassword, // Save hashed password
    });

    const savedRegister = await newRegister.save();
    console.log("Data Saved");
    res.status(200).json(savedRegister);
  } catch (error) {
    console.log("Error saving person", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Duplicate entry for full name or email." });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
  
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {

      const user = await Person.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
    const isMatch = await bcrypt.compare(password, user.password); // compare properly
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, fullName: user.fullName }, 
      process.env.MY_SECRET_KEY, 
      { expiresIn: '1h' }
    );
      res.status(200).json({ message: "Login successful", token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
  
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.MY_SECRET_KEY);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Token is not valid' });
    }
  };

  router.get("/profile", authenticate, (req, res) => {
    res.status(200).json({ message: "Welcome to your profile!", user: req.user });
  });


  module.exports = router;

