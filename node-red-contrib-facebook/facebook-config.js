module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
    }
    RED.nodes.registerType("facebook-config", register, {
    	credentials: {
    		token:        { type: "text" },
            appId:        { type: "text" },
            pageId:       { type: "text" }
    	}

    });
}