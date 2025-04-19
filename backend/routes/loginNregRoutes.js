const express = require("express");
const router = express();
const Person = require('../person');

// Registration endpoint
router.post("/register", async (req, res) => {
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
  
  router.post("/login", async (req, res) => {
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
module.exports = router;