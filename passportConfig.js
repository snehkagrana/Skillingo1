const User = require("./models/user");
const bcrypt = require("bcryptjs");
const localStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
  	passport.use(
	    new localStrategy((username, password, done) => {
      		User.findOne({ username: username }, (err, user) => {
        		if (err) throw err;
        		if (!user) return done(null, false,{message:'No user with that username'});
        		bcrypt.compare(password, user.password, (err, result) => {
					if (err) throw err;
					if (result === true) {
						return done(null, user);
					} else {
						return done(null, false, {message:'Password Incorrect'});
					}
        		});
      		});
    	})
  	);

  	passport.serializeUser((user, cb) => {  // stores a cookie inside the browser
    	cb(null, user.id);
  	});
  	
  	passport.deserializeUser((id, cb) => {  // takes the cookie and return the user
    	User.findOne({ _id: id }, (err, user) => {
      		const userInformation = {
        		username: user.username,
				score: user.score,
				last_played: user.last_played,
				role: user.role
      		};
      		cb(err, userInformation);
    	});
  	});
};