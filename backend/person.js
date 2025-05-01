const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  fullName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  request: {type: String, unique:true}
});

const Person = mongoose.model('Person', personSchema);
module.exports = Person;