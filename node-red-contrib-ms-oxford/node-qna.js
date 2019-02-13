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

        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("ms-qna", register, { 
        credentials: {
            endpointKey:  { type: "text" }
        }
    });
}

async function input (RED, node, data, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    let host = helper.getContextValue(RED, node, data, config.host, config.hostType);
    let knowledgeBaseId = helper.getContextValue(RED, node, data, config.knowledgeBaseId, config.knowledgeType);
    let question = helper.getContextValue(RED, node, data, config.question, config.questionType);
    let endpointKey = helper.getContextValue(RED, node, data, config.endpointKey, config.endpointKeyType);
    let output = output = config.output;

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
        helper.setByString(data, output, entities.decode(json.answers[0].answer));
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