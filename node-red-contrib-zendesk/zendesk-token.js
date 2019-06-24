module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.infos = { 
            redirect_uri: config.redirect_uri,
            client_id: config.client_id,
            scope: config.scope,
            subdomain: config.subdomain
        }
    }
    RED.nodes.registerType("zendesk-token", register, {
    	credentials: {
            token:        { type: "text" }
    	}
    });
}