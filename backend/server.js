const express = require('express');
const cors = require('cors');  // import cors
const app = express();

// Step 2: Create database connection 
const db = require('./db');

// Step 3: Create schema
const Person = require('./person');

// Use express JSON parser (or body-parser)
app.use(express.json());

// Set CORS to allow requests from http://localhost:5173
app.use(cors({
  origin: 'http://localhost:5173'
}));

app.get('/', (req, res) => {
  res.send('hi im running');
});

// Registration endpoint
app.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  const newRegister = new Person({
    fullName: fullName,
    email: email,
    password: password
  });
  
  try {
    const savedRegister = await newRegister.save();
    console.log('Data Saved');
    res.status(200).json(savedRegister);
  } catch (error) {
    console.log('Error saving person', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate entry for full name or email.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/signIn', async (req, res) => {
  try {
    const data = await Person.find();
    console.log('Data fetch');
    res.status(200).json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});