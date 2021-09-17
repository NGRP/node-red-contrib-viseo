const request =    require('request-promise');
const helper     = require('node-red-viseo-helper');

const extractEntities = (prediction) => {
    const entities = [];
    const compositeEntities = [];

    Object.values(prediction.entities.$instance)
    .reduce((result, entity) => result.concat(...entity), []) // flat entity array
    .forEach(entity => {
        if (!entity) return;
        if (entity.modelType === 'Composite Entity Extractor') {
            compositeEntities.push({
                parentType: entity.type,
                value: entity.text,
                children: []
            });
            Object.values(prediction.entities[entity.type][0].$instance).forEach(child => {
                compositeEntities[compositeEntities.length - 1].children.push({
                  type: child[0].type,
                  value: child[0].text
                });
                entities.push({
                  type: child[0].type,
                  entity: child[0].text,
                  startIndex: child[0].startIndex,
                  endIndex: child[0].startIndex + child[0].length,
                  score: entity.score
                })
              });
        } else {
            entities.push({
                type: entity.type,
                entity: entity.text,
                startIndex: entity.startIndex,
                endIndex: entity.startIndex + entity.length, // add end index
                resolution: {
                  values: response.prediction.entities[entity.type.replace('builtin.', '')].reduce((result, e) => {
                    if (Array.isArray(e)) {
                      return result.concat(...e);
                    }
                    result.push(e);
                    return result;
                  }, [])
                }
            });
        }
    });

    return {
        entities,
        compositeEntities
    };
};

const asyncGetPrediction = async function(node, text) {
    let entityObject = {
        entities: [],
        compositeEntities: []
    };

    const response = await request({
        uri: `${node.endpoint}${encodeURIComponent(text)}`,
        method: 'GET',
        headers: {
            'Ocp-Apim-Subscription-Key': node.subKey,
            ...(node.spellCheckKey && {'mkt-bing-spell-check-key': node.spellCheckKey})
        },
        json: true
    });

    // Merge additional metadate in the $instance object to entities
    if (response.prediction.entities.$instance) {
        entityObject = extractEntities(response.prediction);
    }

    return {
        query: response.query,
        alteredQuery: response.prediction.alteredQuery,
        intents: response.prediction.intents,
        entities: entityObject.entities,
        compositeEntities: entityObject.compositeEntities,
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
