

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    
    const register = function(config) {
        
        RED.nodes.createNode(this, config);
        let node = this;

        start(RED, node, config);

    }

    RED.nodes.registerType("node-omniture-config", register, {credentials: {
        applicationId: { value: ""},
        applicationSecret: { value: ""},
        reportID: {value: ""}
    }});
}

const start = (RED, node, config) => {

	node.url = config.url;
	
}
