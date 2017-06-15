const request = require('request');


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

        this.config = RED.nodes.getNode(config.config);

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("fb-greeting", register, {});
}

const input = (node, data, config) => { 
    if (!config.greeting) { return; }
    facebookThreadAPI(node, config, GET_STARTED);

    // Set greeting message
    GREETING_MSG.greeting.text = config.greeting
    facebookThreadAPI(node, config, GREETING_MSG);

    if (!config.buttons) { return; }

    // Set Persistant
    // https://developers.facebook.com/docs/messenger-platform/thread-settings/domain-whitelisting
    PERSISTANT_MENU.call_to_actions = []
    for (let button of config.buttons){
        let btn = {
            "type"   : button.action,
            "title"  : button.title,
            "payload": button.value
        }
        if (btn.type == 'web_url_compact'){
            btn.type = 'web_url';
            btn.webview_height_ratio = "full";
            btn.messenger_extensions = true;
        }
        if (btn.type == 'web_url'){
            btn.url = btn.payload
            delete btn.payload;
        }
        PERSISTANT_MENU.call_to_actions.push(btn)
    }
    facebookThreadAPI(node, config, PERSISTANT_MENU);
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

    if (CONFIG && CONFIG.facebook && CONFIG.facebook.pageToken)
        return CONFIG.facebook.pageToken;

    return node.config.credentials.token;
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
    "call_to_actions":[{
        "type":"postback",
        "title":"Admin Reset",
        "payload":"getstarted"
    }]
}

const facebookThreadAPI = (node, config, json) => { 
    let token = getPageToken(node);
    if (!token) return;

    request({
        url: 'https://graph.facebook.com/v2.6/me/thread_settings?access_token='+token,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        form: json
    },
    function (err, response, body) { 
       if (err) node.error(err); else node.warn(body);
    });
}