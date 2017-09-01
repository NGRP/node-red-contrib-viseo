module.exports = function(RED) {

    // CREDENTIALS
    RED.nodes.registerType("bear-config", function(config){
        RED.nodes.createNode(this, config);
        this.name  = config.name;
    }, {
        credentials: {
			username:    { type: "text" },
	        password:    { type: "text" }
    	}
    });
}