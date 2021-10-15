const request =    require('request-promise');
const helper     = require('node-red-viseo-helper');

const extractEntities = (prediction) => {
    const entities = [];
    const compositeEntities = [];

    // Merge additional metadata in the $instance object to entities
    if (prediction.entities.$instance) {
        Object.values(prediction.entities.$instance)
        .reduce((result, entity) => result.concat(...entity), []) // flat entity array
        .forEach(entity => {
            if (!entity) return;
            if (entity.modelType === 'Composite Entity Extractor') {
                // Extract composite entities
                entities.push({
                    type: entity.type,
                    entity: entity.text,
                    startIndex: entity.startIndex,
                    endIndex: entity.startIndex + entity.length - 1,
                    score: entity.score,
                });

                // Extract composite entities
                compositeEntities.push({
                    parentType: entity.type,
                    value: entity.text,
                    children: []
                });

                prediction.entities[entity.type].forEach((element) => {
                    Object.values(element.$instance).forEach(children => {
                        children
                        .filter(child => child.startIndex >= entity.startIndex && child.startIndex + child.length <= entity.startIndex + entity.length)
                        .forEach((child, index) => {
                            // Extract composite entities' children
                            compositeEntities[compositeEntities.length - 1].children.push({
                                type: child.type,
                                value: child.text
                            });

                            // Extract entities (builtin entities and list entities)
                            let resolution = {};
                            if (child.type === 'builtin.dimension') {
                                // Builtin entities, like numbers, dimensions, are with resolution. Ex. {"subtype": "integer", "value": "10"}
                                resolution = element[child.type.replace('builtin.', '')].map(e => ({
                                    unit: e.units,
                                    value: e.number
                                }))[0];
                            } else if (child.type === 'builtin.number') {
                                // Builtin entities, like numbers, dimensions, are with resolution. Ex. {"subtype": "integer", "value": "10"}
                                resolution = element[child.type.replace('builtin.', '')].map(e => ({
                                    subtype: 'number',
                                    value: e
                                }))[0];
                            } else {
                                // List entities, are with resolution. Ex. {"values": ["pro", "laserjet pro"]}
                                resolution.values = element[child.type.replace('builtin.', '')][index];
                            }
                            entities.push({
                                type: child.type,
                                entity: child.text,
                                startIndex: child.startIndex,
                                endIndex: child.startIndex + child.length - 1,
                                score: entity.score,
                                resolution
                            });
                        });
                    });
                });

            } else {
                entities.push({
                    type: entity.type,
                    entity: entity.text,
                    startIndex: entity.startIndex,
                    endIndex: entity.startIndex + entity.length - 1, // add end index
                    resolution: { // to store the source words of recognition
                      /* Why replace 'builtin' with ''?
                      ** Because the type of number entities is not consistent: 'builtin.number' in the object $instance, but 'number' in the prediction.entities
                      */
                      values: prediction.entities[entity.type.replace('builtin.', '')].reduce((result, e) => {
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
    }

    return {
        entities,
        compositeEntities
    };
};

const getPrediction = async function(node, text) {
    const headers = {};
    // check if subscription key exists cause in "endpoint" mode, this value is provided in the query params
    if (node.subKey) {
        headers['Ocp-Apim-Subscription-Key'] = node.subKey;
    }
    if (node.spellCheckKey) {
        headers['mkt-bing-spell-check-key'] = node.spellCheckKey;
    }
    const response = await request({
        uri: `${node.endpoint}${encodeURIComponent(text)}`,
        method: 'GET',
        headers,
        json: true
    });

    const entityObject = extractEntities(response.prediction);

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


const input = async function(RED, node, data, config) {
    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // Get parameters
    let output = config.intent || 'payload';
    let text = helper.getContextValue(RED, node, data, config.text || 'payload', config.textType);

    try {
        const prediction = await getPrediction(node, text);
        helper.setByString(data, output, prediction);
        node.send(data);
    } catch (error) {
        console.error(error);
        node.error({ message: error.message, source: 'ms-luis' });
    }
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
        } else {
            this.endpoint = conf.credentials.endpoint;
        }

        // Spell check key
        if (conf.credentials.spellCheckKey && conf.credentials.spellCheckKey !== '') {
            this.spellCheckKey = conf.credentials.spellCheckKey;
        }

        if (this.endpoint) node.status({});
        this.on('input', (data)  => {
            try {
                input(RED, node, data, config);
            } catch (error) {
                console.error(error);
                node.error({ message: error.message, source: 'ms-luis' });
            }
        });
    }
    RED.nodes.registerType('ms-luis', register, {});
}
