const mongoose = require('mongoose');
const mongoURL = 'mongodb://127.0.0.1:27017/hotels';

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