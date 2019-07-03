const helper = require("node-red-viseo-helper");
const mustache = require("mustache");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    
    const register = function(config) {
        
        RED.nodes.createNode(this, config);
        let node = this;


        this.on('input', (data) => { input(RED, node, data, config)  });

    }

    RED.nodes.registerType("node-mustache", register);
}

const input = (RED, node, data, config) => {
	let input = helper.getContextValue(RED, node, data, config.input, config.inputType);

	if(typeof input !== "string") {
		node.error("Expected template type is text.")
		return;
	}

	let result = "";

	switch(config.dataType) {
		case "msg":
			result = mustache.render(input, data);
			break;
		case "global":
			values = {};
			for(let key of node.context().global.keys()) {
				values[key] = node.context().global.get(key);
			}
			result = mustache.render(input, values);
			break;
		default:
			result = input;
			break;
	}

	helper.setContextValue(RED, node, data, config.output, result, config.outputType);

	node.send(data);
}
