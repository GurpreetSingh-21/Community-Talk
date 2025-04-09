//step 1 to create server
const express = require('express');
const app = express();

//Step 2 to create database connection 
const db = require('./db');

// step 3 to create schema
const Person = require('./person')

// step 4 to convert data into json
const bodyParser = require('body-parser')
app.use(bodyParser.json()); 
app.get('/', function(req,res){
    res.send('hi im running');
})
app.post('/register', async (req, res) => {
    const newRegister = new Person(req.body);
    try {
        const Savedregister = await newRegister.save();
        console.log('Data Saved');
        res.status(200).json(Savedregister);
    } catch (error) {
        console.log('Error saving person', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.listen(3000, ()=>{
    console.log('Listening port 3000')
})