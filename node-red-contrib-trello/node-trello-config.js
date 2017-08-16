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

    // TRELLO-ID
    RED.nodes.registerType("trello-list-id", function(config){
        RED.nodes.createNode(this, config);
        this.name  = config.name;
        this.item  = config.item;
    }, {});

}