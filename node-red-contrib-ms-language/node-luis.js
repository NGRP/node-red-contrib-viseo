const request =    require('request-promise');
const helper     = require('node-red-viseo-helper');

const asyncGetPrediction = async function(node, text) {
    const response = await request({
        uri: `${node.endpoint}${encodeURIComponent(text)}`,
        method: 'GET',
        headers: {
            'Ocp-Apim-Subscription-Key': node.subKey,
            ...(node.spellCheckKey && {'mkt-bing-spell-check-key': node.spellCheckKey})
        },
        json: true
    });

    const entities = Object.values(response.prediction.entities.$instance)
        .reduce((result, entity) => result.concat(...entity), []) // flat entity array
        .map(entity => {
            return {
                ...entity,
                resolutionValues: response.prediction.entities[entity.type].reduce((result, entity) => result.concat(...entity), []) // add resolution values
            }
        })

    return {
        query: response.query,
        alteredQuery: response.prediction.alteredQuery,
        intents: response.prediction.intents,
        entities,
        topScoringIntent: {
            intent: response.prediction.topIntent,
            score: response.prediction.intents[response.prediction.topIntent].score
        },
        source: 'luis'
    };
}


const input = function(RED, node, data, config) {
    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // Get parameters
    let output = config.intent || 'payload';
    let text = helper.getContextValue(RED, node, data, config.text || 'payload', config.textType);

    asyncGetPrediction(node, text).then(response => {
        helper.setByString(data, output, response);
        node.send(data);
    }).catch(error => {
        console.error(error);
        node.error({ message: error.message, source: 'ms-luis' });
		node.send(data);
    });
}

// https://github.com/Microsoft/Cognitive-LUIS-Node.js
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        let conf = RED.nodes.getNode(config.config);
        node.status({fill:'red', shape:'ring', text: 'Missing credentials'});

        if (!conf || !conf.credentials) return;
        if (conf.way === 'key') {
            // Endpoint URL changes for V3
            this.endpoint = `https://${conf.location}.api.cognitive.microsoft.com/luis/prediction/v3.0/apps/${conf.credentials.appId}/slots/${conf.staging ? 'staging' : 'production'}/predict?verbose=${conf.verbose ? 'true' : 'false'}&log=true&show-all-intents=true&query=`;
            this.subKey = conf.credentials.subKey;
            if (conf.credentials.spellCheckKey && conf.credentials.spellCheckKey !== '') {
                this.spellCheckKey = conf.credentials.spellCheckKey;
            }
        }
        else this.endpoint = conf.credentials.endpoint;

        if (this.endpoint) node.status({});
        this.on('input', (data)  => { input(RED, node, data, config) });
    }
    RED.nodes.registerType('ms-luis', register, {});
}
