module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);

        this.name = config.name;
        this.way = config.way;
        this.location = config.location;
        this.verbose = config.verbose;
        this.staging = config.staging;
    }
    RED.nodes.registerType("ms-luis-config", register, {
    	credentials: {
            endpoint:     { type: "text" },
            appId:        { type: "text" },
            subKey:       { type: "text" }
    	}
    });
}