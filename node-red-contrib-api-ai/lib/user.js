'use strict';
const GoogleStrategy 	= require('passport-google-oauth20').Strategy;
const passport 			= require('passport');
const helper 			= require('node-red-viseo-helper');

var Authentication = function(app, uri, projectId, clientId, secretKey, callback) {

	const OAUTH_HOST = 'https://oauth-redirect.googleusercontent.com/r/';
	const callbackURL = uri + 'authCallback';

	var self = this;

	app.use(passport.initialize());
	app.use(passport.session());

	// used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        done(err, {
        	id: id
        });
    });

    passport.use(new GoogleStrategy(
		{
			clientID: clientId,
			clientSecret: secretKey,
			callbackURL: helper.CONFIG.server.host + callbackURL
		},

		function(accessToken, refreshToken, params, profile, done) {

			let user = {
				id: profile.id,
				profile: profile,
				token: accessToken,
				refreshToken: refreshToken
			};

			delete user.profile._raw;
			delete user.profile._json;

			return done(null, user);
			
		}
	));


    //Initial request
	app.get(uri + 'auth', function(req, res, next) {

		const checkClientId = function(client_id) {
			return (clientId === client_id);
		}

		const checkRedirectUri = function(redirect_uri) { return true;
			if(redirect_uri.indexOf(OAUTH_HOST) === -1) {
				return false;
			}
			return (redirect_uri.substring(OAUTH_HOST.length) === projectId);
		}

		const checkResponseType = function(response_type) {
			return (response_type === 'token');
		}

		self.state = req.query.state;
		self.redirect_uri = req.query.redirect_uri;

		if(!checkClientId(req.query.client_id) || !checkRedirectUri(self.redirect_uri) || !checkResponseType(req.query.response_type)) {
			res.status(400);
			return res.send("Invalid parameters");
		}

		//ask google sign in for auth code
		passport.authenticate('google', { 
			scope : [
				'profile', 'email', 
				'https://www.googleapis.com/auth/calendar', 
				'https://www.googleapis.com/auth/user.phonenumbers.read'
			],
			accessType: 'offline',
			prompt:'consent'
		})(req, res, next);

	});
		
	//receive code from google sign in
	app.get(callbackURL, function(req, res, next) {

		passport.authenticate('google', 
			function(err, user, info) {

				if(err) {
					console.log(err);
					return;
				}

	        	callback(user);
	        	
	        	res.redirect(self.redirect_uri+'#access_token='+user.token+'&token_type=bearer&state='+self.state);
			}
		)(req, res, next);
	});
	

	this.checkAuthentication = function(headers, secretKey) {
		if (req.headers && req.headers.authorization) {

	        var authorization = headers.authorization;
	        /*,
	            decoded;

	        try {
	            decoded = jwt.verify(authorization, secretKey);
	        } catch (e) {
	            return;
	        }

	        return decoded;*/
/*
	        console.log(data.user.accessToken);
    if(data.user.accessToken === "ya29.GlvgBM-3qW9FstwW-HC3KrjzIyNS7f2FrCBmQbCweWcgP7DG9vPrp-SyM5WCfSpmGXM2ZichkzchyyN09XL_34tYMpGonu2RPo5VZqUMMwFur-whkxgabiMCowI2") {
        console.log('return error');
        res.setHeader('WWW-Authenticate', 'Bearer');
        return res.sendStatus(401);
    }*/

	        return true;
	    }

	}

};

module.exports.Authentication = Authentication;

