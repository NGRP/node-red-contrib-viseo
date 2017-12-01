'use strict';

const chatbaseFactory = require('./lib/chatbase-api-factory.js');


module.exports = function(RED) {

    const register = function(config) {
        RED.nodes.createNode(this, config);
		this.config = RED.nodes.getNode(config.config);

		let node = this;

        start(node, config);

        this.on('input', (data)  => { input(node, data, config)  });

        this.on('close', close);
           
    }

    RED.nodes.registerType("node-chatbase", register, {});

}

const start = (node, config) => {

}

const input = (node, data, config) => {

    let chatbaseApi = chatbaseFactory.createApi(node, config, data);
    chatbaseApi.send(function(err, result) {

    	if(err) {
    		node.warn(err);
    	}
    	//whatever happens, keep going with the flow
    	node.send(data);

    })

    
}

const close = (done) => {
	done()
}

