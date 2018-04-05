module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = config.host || "https://westus.api.cognitive.microsoft.com";
        this.way = config.way;
    }
    RED.nodes.registerType("ms-luis-config", register, {
    	credentials: {
			appId:        { type: "text" },
            subKey:       { type: "text" },
            endpoint:     { type: "text" }
    	}
    });
}