const passport = require('passport');
const LocalStrategy = require('passport-local');
const Person = require('./person');

passport.use(new LocalStrategy(async(email, password, done)=>{
    try{
        console.log('Recieved crendentials:', email, password);
        const user = await Person.findOne({email});
        if(!user){
            return done(null, false, {message: 'Incorrent username.'});
        }
        const isPasswordMatch = user.password === password ? true:false
        if(isPasswordMatch){
            return done(null, user);
        }
        else{
            return done(null, false, {message: 'Incorrent password.'})
        }
    }
    catch(err){
        return done(error);
    }
}));
module.exports = passport