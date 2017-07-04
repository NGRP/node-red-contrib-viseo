module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = config.host || "";
    }
    RED.nodes.registerType("ms-luis-config", register, {
    	credentials: {
			appId:        { type: "text" },
	        subKey:       { type: "text" }
    	}
    });
}