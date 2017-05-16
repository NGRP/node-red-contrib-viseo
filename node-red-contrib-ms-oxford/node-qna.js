const request = require('request');
const helper  = require('node-red-viseo-helper');
const Entities = require('html-entities').XmlEntities;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-qna", register, {});
}

const input = (node, data, config) => {

    const   baseUrl = 'https://westus.api.cognitive.microsoft.com/qnamaker/v2.0',
            baseId = config.knowledgeBaseId,
            subKey = config.subKey
            query = {
                "question" : helper.getByString(data, config.question || 'payload')
            };

    if (baseId === undefined || subKey === undefined){

        return node.status({
            fill:"red", 
            shape:"ring", 
            text: 'Missing credential'
        });
    }

    // Send request
   let requestObject = {
        url: baseUrl + '/knowledgebases/' + baseId + '/generateAnswer',
        method: 'POST',
        headers: {
            'ContentType': 'application/json',
            'Ocp-Apim-Subscription-Key': subKey
        },
        rejectUnauthorized: false,
        body: JSON.stringify(query)
    };
    request(requestObject, (err, response, body) => {

        if (err) {
            return node.error(err);
        }

        let json = JSON.parse(body);

        if(json.Error) {
            return node.error(json.Error.Code + ' : ' + json.Error.Message);
        }
        data.qna  = json;

        const entities = new Entities();
        data.payload = entities.decode(json.answers[0].answer);
        node.send(data);
    });

}
