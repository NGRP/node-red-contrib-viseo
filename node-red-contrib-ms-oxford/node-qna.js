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

        config.subKey = this.credentials.subKey;

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-qna", register, { 
        credentials: {
            subKey:  { type: "text" }
        }
    });
}

async function input (node, data, config) {

    let knowledgeBaseId = config.knowledgeBaseId,
        question = config.question,
        output = config.output,
        subKey = config.subKey;

    if (config.knowledgeType !== 'str') {
        let loc = (config.knowledgeType === 'global') ? node.context().global : data;
        knowledgeBaseId = helper.getByString(loc, knowledgeBaseId); }
    if (config.subKeyType !== 'str') {
        let loc = (config.subKeyType === 'global') ? node.context().global : data;
        subKey = helper.getByString(loc, subKey); }
    if (config.questionType !== 'str') {
        let loc = (config.questionType === 'global') ? node.context().global : data;
        question = helper.getByString(loc, question); }

    let questionLoc = (config.outputType === 'global') ? node.context().global : data;

    if (knowledgeBaseId === undefined || subKey === undefined) {
        return node.status({
            fill:"red", 
            shape:"ring", 
            text: 'Missing credential'
        });
    }

    try {
        let json = await processRequest(subKey, question, knowledgeBaseId);
            json = JSON.parse(json);

        const entities = new Entities();
        helper.setByString(questionLoc, output, entities.decode(json.answers[0].answer));
        return node.send(data);
    }
    catch (err) {
        return node.error(err); 
    }

}

async function processRequest (subKey, question, knowledge) {
    let url = 'https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/' + knowledge + '/generateAnswer';

    let req = {
        method: 'POST',
        uri: url,
        headers: {
            'ContentType': 'application/json',
            'Ocp-Apim-Subscription-Key': subKey
        },
        body: JSON.stringify({
            "question" : question
        })
    };

    return request(req);
}