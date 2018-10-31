const rp = require('request-promise');

// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------

let info  = console.log;
let error = console.log;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this; 
        start(RED, node, config);

        node.status({fill:"red", shape:"ring", text: 'Deprecated'});
        node.error("This node is old, please install and use node-red-contrib-viseo-facebook instead.")
        this.config = RED.nodes.getNode(config.config);
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("fb-greeting", register, {});
}


const input = (node, data, config) => { 

    if (!config.greeting) return;
    
    let sendData = {
        "greeting" : [{
            "locale":"default",
            "text": config.greeting
        }],
        "get_started": {
            "payload":"getstarted"
        }
    }


    // Set Persistant menu
    if (config.buttons) sendData.persistent_menu = [{
        "locale":"default",
        "composer_input_disabled": false,
        "call_to_actions": buildObject(config.buttons) 
    }];

    facebookAPI(node, config, sendData)
    .then(function (res)  { node.warn(res) })
    .catch(function (err) { node.error(err); });
}

const start = (RED, node, config) => {
    RED.httpAdmin.post("/fb-greeting/:id", function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node == null) { return res.sendStatus(404); }
        try {
            node.receive();
            res.sendStatus(200);
        } catch(err) { res.sendStatus(500); }
    });
}

// --------------------------------------------------------------------------
//  FACEBOOK API
// --------------------------------------------------------------------------

const getPageToken = (node) => {

    if (CONFIG && CONFIG.facebook && CONFIG.facebook.pageToken) return CONFIG.facebook.pageToken;
    return node.config.credentials.token;
}

const facebookAPI = (node, config, json) => { 
    let token = getPageToken(node);
    if (!token) return;

    var req = {
        uri: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+token,
        method: 'POST',
        body: json,
        json: true
    }
    return rp(req);
}

const buildObject = (buttons) => {
    if (buttons.length < 1) return [];

    var array = [];
    var tmp = [];
    var cache = {0:[]}

    for (let i=0; i<buttons.length; i++) {
        let btn = {
            "type"    :  buttons[i].action,
            "title"   :  buttons[i].title,
            "payload" :  buttons[i].value
        }

        switch(buttons[i].action) {
            case "nested":
                delete btn.payload;
                btn.call_to_actions = [];
                break;
            case "web_url":
                delete btn.payload;
                btn.url = btn.payload
                break;
            case "web_url_compact":
                btn.type = 'web_url';
                btn.webview_height_ratio = "full";
                btn.messenger_extensions = true;
                break;
        }

        if (buttons[i].level === 0) {
            array.push(btn);
            cache[0] = btn;
            continue;
        }

        if (!cache[buttons[i].level-1].call_to_actions) continue;
        cache[buttons[i].level-1].call_to_actions.push(btn);
        cache[buttons[i].level] = btn;

    }
    console.log(array)
    return array;
}