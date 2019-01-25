
const helper = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        start(RED, node, config);
        this.on('input', (data) => { input(RED, node, data, config);});
        this.on('close', (done) => { stop(done); });
    }
    RED.nodes.registerType("google-places", register, {});
}


function start(RED, node, config) {
    node.status({
        fill:  "red", 
        shape: "ring",
        text:  'Missing credential'
    })

    var conf   = (config.auth) ? RED.nodes.getNode(config.auth) : {};
    if (conf.credentials) {
        config.key = conf.credentials.key;
        node.status({});
    }
    
}

function input (RED, node, data, config) {

    let action  = config.action  || "search",
        request = config.request || "textsearch",
        output  = config.output  || "payload",
        param   = config.parameters;
        
    let parameters = {},
        keys = Object.keys(param);

    for (let i=0; i<keys.length; i++) {
        var key = keys[i];
        if (!param[key].value) continue;
        let val = param[key].value;
        if (param[key].typedInput === 'msg')      val = helper.getByString(data, param[key].value);
        else if (param[key].typedInput === 'num') val = String(param[key].value);
        else if (param[key].value === "true")     val = true;
        else if (param[key].value === "false")    val = false;

        parameters[key] = val;
    }

    const google = require('@google/maps').createClient({ key: config.key });

    function cb(err, response) {
        if (err) {
            node.warn(err);
            return node.send(data);
        }

        helper.setByString(data, output, response.json);
        return node.send(data);
    }

    if (action === "search") {
        if (request === "textsearch") google.places(parameters, cb);
        else google.placesNearby(parameters, cb);
    }

    if (action === "autocomp") {
        if (request === "autocomplete") google.placesAutoComplete(parameters, cb);
        else  google.placesQueryAutoComplete(parameters, cb);
    }

    if (action === "details")  google.place(parameters, cb);
    if (action === "photos") google.placesPhoto(parameters, cb);

}

const stop = (done) => {
    done();
};