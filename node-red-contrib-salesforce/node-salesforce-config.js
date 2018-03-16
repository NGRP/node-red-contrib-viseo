const request = require('request-promise');
const jsonwebtoken = require('jsonwebtoken');

module.exports = function(RED) {
    const register = function (config) {

        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.version = config.version;

        this.refreshToken = async () => {
            if(config.oauthtype === "refresh-token") {
                this.token = await getTokenWithRefreshToken(this)
            } else if(config.oauthtype == "jwt") {
                this.token = await getTokenWithJwt(this)
            }

            return (this.token !== undefined)
            
        }

        start(this, config)
    }

    RED.nodes.registerType("salesforce-config", register, {

    	credentials: {
            id:       { type:"text" },
            secret:   { type:"text" },
            instance: { type:"text" },
            login:    { type:"text" },
            refresh:  { type:"text" },
            iss:      { type:"text" }, 
            subject:  { type:"text" },
            privateKey: { type: "text" }
        }
    });
}


const start = (node, config) => {
        
    if(node.refreshToken()) {
        node.status({})
    } else {
        node.status( {fill: "red", shape: "ring", text: "Could not "} )
    } 

}

const getTokenWithRefreshToken = async (node) => {
    try { 

        let json = await request({
            method: 'POST',
            uri: node.credentials.login,
            formData: {
                grant_type: 'refresh_token',
                client_secret: node.credentials.secret,
                client_id: node.credentials.id,
                refresh_token: node.credentials.refresh
            }
        });

        return JSON.parse(json).access_token;
 
    } catch (err) { 
        node.error(err);      
        return;
    }
}


const getTokenWithJwt = async (node) => {

    try {

        let jwt = jsonwebtoken.sign({}, node.credentials.privateKey, {
            expiresIn: 2 * 60,
            audience: node.credentials.login,
            issuer: node.credentials.iss, 
            subject: node.credentials.subject,
            algorithm: "RS256"
        });

        let json = await request({
            method: 'POST',
            uri : node.credentials.login + '/services/oauth2/token',
            headers: {
                'Content-Type' : 'application/x-www-form-urlencoded'
            },
            formData: {
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: jwt
            }
        })


        let data = JSON.parse(json)
        node.credentials.instance = data.instance_url

        return data.access_token;

    } catch(err) {
        node.error(err)
        return;
    }


   

}