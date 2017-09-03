module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name
    }
    RED.nodes.registerType("google-credential", register, {
        credentials: {    
            projectId:    { type: "text" },
			client_email: { type: "text" },
	        private_key:  { type: "text" }
    	}
    });
}