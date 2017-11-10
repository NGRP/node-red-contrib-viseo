const GoogleAuth = require("google-auth-library");

module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node   = this
        node.authenticate = (callback) => { auth(node, RED, config, callback) }
        node.name  = config.name
        node.scope = config.scope ? config.scope.split('\n') : []
        node.cred  = { 
            'projectId': node.credentials.projectId,
            'credentials': { client_email: node.credentials.client_email }
        }
        if (node.credentials.private_key){ node.cred.credentials.private_key = node.credentials.private_key.replace(/\\n/g,'\n') }
    }
    RED.nodes.registerType("google-service-account", register, {
        credentials: {    
            projectId:    { type: "text" },
			client_email: { type: "text" },
	        private_key:  { type: "text" }
    	}
    });
}

const auth = (node, RED, config, callback) => {
    authenticate(node.cred, node.scope, (err, client, token) => {
        if (err) return node.warn(err);
        node.client = client
        node.token  = token
        callback(client, token);
    })
}

const authenticate = (json, scope, callback) => {
    let client = new GoogleAuth();
    let jwt    = new client.JWT(json.credentials.client_email, null, json.credentials.private_key, scope, null);
    renewJWTAuth(jwt , callback);
}

const renewJWTAuth = (jwt, callback) => {
    jwt.authorize(function(err, token){
      if (err) return callback(err);
      let auth = { type: token.token_type, value: token.access_token, expires: token.expiry_date }
      callback(undefined, jwt, auth)
    });
}