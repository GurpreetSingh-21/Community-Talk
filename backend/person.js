const mongoose = require('mongoose');
const personSchema = new mongoose.Schema({
    Full_Name: {type: String, required: true, unique: true},
    Email:     {type: String, required: true, unique: true},
    Password:  {type: String, required: true}

});
const Person = mongoose.model('Person', personSchema);
module.exports = Person;              