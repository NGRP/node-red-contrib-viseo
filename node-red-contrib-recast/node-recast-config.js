module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.lang = config.lang || "fr";
    }
    RED.nodes.registerType("node-recast-config", register, {
    	credentials: {
			token:   { type: "text" },
    	}
    });
}