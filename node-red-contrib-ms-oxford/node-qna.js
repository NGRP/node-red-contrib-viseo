const request = require('request-promise');
const helper  = require('node-red-viseo-helper');
const Entities = require('html-entities').XmlEntities;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        config.endpointKey = this.credentials.endpointKey;

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-qna", register, { 
        credentials: {
            endpointKey:  { type: "text" }
        }
    });
}

async function input (node, data, config) {

    let host = config.host,
        knowledgeBaseId = config.knowledgeBaseId,
        question = config.question,
        output = config.output,
        endpointKey = config.endpointKey;

    if (config.hostType !== 'str') {
        let loc = (config.hostType === 'global') ? node.context().global : data;
        host = helper.getByString(loc, host); }
    if (config.knowledgeType !== 'str') {
        let loc = (config.knowledgeType === 'global') ? node.context().global : data;
        knowledgeBaseId = helper.getByString(loc, knowledgeBaseId); }
    if (config.endpointKeyType !== 'str') {
        let loc = (config.endpointKeyType === 'global') ? node.context().global : data;
        endpointKey = helper.getByString(loc, endpointKey); }
    if (config.questionType !== 'str') {
        let loc = (config.questionType === 'global') ? node.context().global : data;
        question = helper.getByString(loc, question); }

    let questionLoc = (config.outputType === 'global') ? node.context().global : data;

    if (host === undefined || knowledgeBaseId === undefined ||endpointKey === undefined) {
        return node.status({
            fill:"red", 
            shape:"ring", 
            text: 'Missing value'
        });
    }

    try {
        let json = await processRequest(host, endpointKey, question, knowledgeBaseId);
            json = JSON.parse(json);

        const entities = new Entities();
        helper.setByString(questionLoc, output, entities.decode(json.answers[0].answer));
        return node.send(data);
    }
    catch (err) {
        return node.error(err); 
    }

}

async function processRequest (host, endpointKey, question, knowledge) {
    let url = `${host}/qnamaker/knowledgebases/${knowledge}/generateAnswer`;

    let req = {
        method: 'POST',
        uri: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `EndpointKey ${endpointKey}`
        },
        body: JSON.stringify({
            "question" : question
        })
    };

    return request(req);
}
