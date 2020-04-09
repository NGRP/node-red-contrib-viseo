const rp = require('request-promise');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this; 

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        node.pageToken = RED.nodes.getCredentials(config.pageToken);
        if (node.pageToken && node.pageToken.token) node.status({});

        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("facebook-settings", register, {});
}


const input = (node, data, config) => { 

    let getstarted = config.getstarted || "getstarted";
    let pageToken = node.pageToken.token;
    let locales = config.menus;
    
    let sendData = {
        "get_started": {
            "payload": getstarted
        },
        "greeting" : [],
        "persistent_menu": []
    }

    for (let locale of locales) {
        sendData.greeting.push({
            "locale": locale.language || "default",
            "text": locale.greetings || ""
        })
        if (!locale.menu || locale.menu.length === 0 || (locale.menu.length === 1 && !locale.menu[0].label)) continue;

        sendData.persistent_menu.push({
            "locale": locale.language || "default",
            "composer_input_disabled": false,
            "call_to_actions": buildObject(locale.menu) 
        })
    }


    node.warn(sendData)

    facebookAPI(pageToken, sendData)
    .then(function (res)  { node.warn(res) })
    .catch(function (err) { node.error(err); });
}

const start = (RED, node, config) => {
    RED.httpAdmin.post("/facebook-settings/:id", function(req,res) {
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

const facebookAPI = (token, json) => { 

    var req = {
        uri: 'https://graph.facebook.com/v6.0/me/messenger_profile?access_token='+token,
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
            "title"   :  buttons[i].label,
            "payload" :  buttons[i].value
        }

        buttons[i].level = Number(buttons[i].level)

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

        if (!cache[buttons[i].level-1] || !cache[buttons[i].level-1].call_to_actions) continue;
        cache[buttons[i].level-1].call_to_actions.push(btn);
        cache[buttons[i].level] = btn;

    }

    return array;
}