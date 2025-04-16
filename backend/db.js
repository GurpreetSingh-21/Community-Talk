const mongoose = require('mongoose');
require('dotenv').config();
const mongo_URL = process.env.db_url
const mongoURL_local = process.env.mongoURL_local
//const mongoURL = mongoURL_local;
const mongoURL = mongo_URL
mongoose.connect(mongoURL, {
    useNewUrlParser:true,
    useUnifiedTopology: true
})

const db = mongoose.connection;// these are nothing but objectes of mongodb

// these are all the event listners which moongoDb understands
db.on('connected', ()=>{
    console.log('connected to MongoDB')
});
db.on('error', ()=>{
    console.log('MongoDB connection error')
});
db.on('disconnected', () => {
    console.log('Disconnected to mongoDB');
});
module.exports = db;