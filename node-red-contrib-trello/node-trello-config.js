module.exports = function(RED) {

    // CREDENTIALS
    RED.nodes.registerType("trello-config", function(config){
        RED.nodes.createNode(this, config);
        this.name  = config.name;
    }, {
        credentials: {
			key:        { type: "text" },
	        token:      { type: "text" }
    	}
    });

}