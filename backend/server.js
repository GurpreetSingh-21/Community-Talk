// 🌐 Core Modules
const express = require("express");
const cors = require("cors");
const app = express();
require('dotenv').config();

// 🧠 Middleware and Auth
const passport = require('passport');
const LocalStrategy = require('passport-local');
const authenticate = require('./middleware/authenticate');


// 🔌 Database
const db = require("./db");

// 📁 Route Files
const personRoutes = require('./routes/loginNregRoutes');
const communityRoutes = require('./routes/communityRoutes');
const memberRoutes = require('./routes/memberRoutes');
const messageRoutes = require('./routes/messageRoutes');

// 🔧 Middleware Setup
app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
}));

// 🛡 Passport
app.use(passport.initialize());
const LocalAuthMiddleware = passport.authenticate('local', { session: false });

// 🧾 Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} Request made to : ${req.originalUrl}`);
  next();
});

// 🔐 Protected Routes
app.use('/api/communities', authenticate, communityRoutes);
app.use('/api/members', authenticate, memberRoutes);
app.use('/api/messages', authenticate, messageRoutes);


// 🔓 Public Routes
app.use('/', personRoutes);

// 🏠 Test Route
app.get('/', LocalAuthMiddleware, (req, res) => {
  res.send('hi');
});

// 🚀 Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
