const request = require('request');


// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------

let info  = console.log;
let error = console.log;

// --------------------------------------------------------------------------
//  FACEBOOK API
// --------------------------------------------------------------------------

const getPageToken = () => {
    if (!CONFIG || !CONFIG.facebook || CONFIG.facebook.pageToken) return;
    return CONFIG.facebook.pageToken;
}

let GREETING_MSG = {
    "setting_type":"greeting",
    "greeting":{ "text":"Your greeting text here." }
}

const GET_STARTED = {
    "setting_type":"call_to_actions",
    "thread_state":"new_thread",
    "call_to_actions":[{ "payload":"getstarted" }]
}

const PERSISTANT_MENU = {
    "setting_type" : "call_to_actions",
    "thread_state" : "existing_thread",
    "call_to_actions":[]
}

const facebookThreadAPI = (json) => {
    console.log(PERSISTANT_MENU);
    let token = getPageToken();
    if (!token) return;

    request({
        url: 'https://graph.facebook.com/v2.6/me/thread_settings?access_token='+token,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        form: json
    },
    function (err, response, body) { error(err.message, err); });
}

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    info  = RED.log.info;
    error = RED.log.error;

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("fb-greeting", register, {});
}

const input = (node, data, config) => { 
    if (!config.greeting) { return; }
    GREETING_MSG.greeting.text = config.greeting
    facebookThreadAPI(GREETING_MSG);
    facebookThreadAPI(GET_STARTED);
    facebookThreadAPI(PERSISTANT_MENU);
}

const start = (RED, node, config) => {
    console.log(config);
    for (let i = 1; i <= 5; i++) {
        if (config['menu' + i] && config['action' + i] && config['value' + i]) {
            const menu = {
                type: config['action' + i],
                title: config['menu' + i],
                payload: config['value' + i]
            };
            
            PERSISTANT_MENU.call_to_actions.push(menu);
        }
    }
    facebookThreadAPI(PERSISTANT_MENU);
    RED.httpAdmin.post("/fb-greeting/:id", function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node == null) { return res.sendStatus(404); }
        try {
            node.receive();
            res.sendStatus(200);
        } catch(err) { res.sendStatus(500); }
    });
}

