// backend/auth.js

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const Person = require("./person");

// ────────────────────────── LocalStrategy ──────────────────────────
// We tell passport-local to expect "email" instead of "username"
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        console.log("🔐 Login attempt:", email);

        // Find user
        const user = await Person.findOne({ email }).exec();
        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }

        // Compare passwords using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Success
        return done(null, user);
      } catch (err) {
        console.error("Passport LocalStrategy error:", err);
        return done(err);
      }
    }
  )
);

// ────────────────────────── Sessions (optional) ──────────────────────────
// Required if you use persistent login sessions with passport
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Person.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;