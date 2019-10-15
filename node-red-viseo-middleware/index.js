'use strict'

const fs = require('fs')
const path = require('path')
const request = require('request-promise')
const mustache = require('mustache')
const uuidv4 = require('uuid/v4');
const authPath = '/restricted/authenticate';

var AUTHORIZED_TOKENS = {};

module.exports = function() {

    return function(req, res, next) {

        let scopeTest = /^\/restricted\/([a-z]+\.[a-z]+)\//
        let requestedRoute = req.url;
        let port = req.socket.localPort;
        let host = 'https://' + req.headers.host;

    	if (!scopeTest.test(requestedRoute)) {
    		next();
            return;
    	}

    	req.app.post(authPath, async (req, res) => {
            //wrong scope
            let requestedUrl = req.body['requested-url'];
            let scope = requestedUrl.match(scopeTest)[1];

            //get access_token
            try {

                let result = JSON.parse(await request({
                    uri: "http://localhost:"+ port + '/auth/token',
                    method: 'POST',
                    form: {
                        client_id: 'node-red-admin',
                        grant_type: 'password',
                        scope: scope,
                        username: req.body.login,
                        password: req.body.password
                    }
                }))

                let ssid = uuidv4();

                AUTHORIZED_TOKENS[ssid] = {
                    expires: Date.now() + result.expires_in,
                    access_token : result.access_token
                };

                //redirect
                res.cookie(scope, ssid, 30 * 60);
                res.send({ redirection: host + requestedUrl });


            } catch(e) {
                if(e.statusCode) {
                    res.status(e.statusCode);
                    return res.send(e.message);
                } else {
                    console.log('Error : ', e);
                    return res.sendStatus(400);
                }
            }

           

        });

        //get access token
        let scope = requestedRoute.match(scopeTest)[1];
        let ssid  = req.cookies[scope];

        if(ssid) {
            if(AUTHORIZED_TOKENS[ssid] && AUTHORIZED_TOKENS[ssid].expires > Date.now()) {
                return next();
            } else {
                delete AUTHORIZED_TOKENS[ssid];
                if(req.headers["x-requested-with"] === "XMLHttpRequest") {
                    res.sendStatus(401);
                }
            }
        }

        //check access token
    	var template = fs.readFileSync(path.join(__dirname, "template","login.html"),"utf8");
    	var data = {
    		login : fs.readFileSync(path.join(__dirname, "template","login.js"),"utf8"),
    		url: host + authPath,
            requested_url: requestedRoute
        }
    	res.send(mustache.render(template, data));
    }
}

