module.exports = function(RED) {

    // CREDENTIALS
    RED.nodes.registerType("ethjs-wallet", function(config){
        RED.nodes.createNode(this, config);
        this.name      = config.name
        this.keyPublic = config.keyPublic
    }, {
        credentials: {
			keyPrivate: { type: "text" },
    	}
    });
}