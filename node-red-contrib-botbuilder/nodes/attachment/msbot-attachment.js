const promisify = require("es6-promisify");
const request   = require('request-promise-native').defaults({ encoding: null });
const helper    = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    
    start(RED, node, config);
    this.on('input', (data)  => { input(node, data, config) });
    this.on('close', (done)  => { stop(done) });
  }
  RED.nodes.registerType("attachment", register, {});
}

// Flow Function --------------------------------------

const stop  = (done) => { done(); }
const start = (RED, node, config) => {}
const input = (node, data, config) => {

	let attachments = helper.getByString(data, config.input || "message.attachments");
	if (!attachments) { return node.send(data); }

	// Skype & MSTeams
	let obtainToken = undefined;
	if (config.token || checkRequiresToken(data.message)){
		let connector = data.context.bot.connector();
		obtainToken = promisify(connector.getAccessToken.bind(connector)); 
	}
	
	asyncAttachments(attachments, obtainToken, config.filter).then((files) => {
		helper.setByString(data, config.output || "payload", files);
		node.send(data);
	});
}

// Utility Function --------------------------------------
const asyncAttachments = async function(attachments, obtainToken, filter) {

	let output = [];
	for (let attachment of attachments){

		if (filter && !attachment.contentType.match(filter)){ continue; }

		let req = { 'url' : attachment.contentUrl };
		if (obtainToken){
			let token = await obtainToken();
			req.headers = {
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/octet-stream'
			}
		}
		let buffer = await request(req);
		output.push({ 
			buffer, 
			"contentUrl" : attachment.contentUrl, 
			"contentType" : attachment.contentType,
			"name" : attachment.name, 
		})
		attachment.buffer = buffer;
	}
	return output;
}

const checkRequiresToken = (message) => {
    return message.source === 'skype' || message.source === 'msteams';
};
