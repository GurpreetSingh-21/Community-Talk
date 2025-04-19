const mongoose = require('mongoose');
require('dotenv').config();

// Use db_url if available, else fallback to mongoURL_local
const mongoURL = process.env.db_url || process.env.mongoURL_local;

mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('connected', () => {
    console.log('✅ Connected to MongoDB');
});
db.on('error', () => {
    console.log('❌ MongoDB connection error');
});
db.on('disconnected', () => {
    console.log('⚠️ Disconnected from MongoDB');
});

module.exports = db;
