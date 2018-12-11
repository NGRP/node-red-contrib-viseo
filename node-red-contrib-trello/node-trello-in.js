const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        if (!config.key) {node.status({fill:"red", shape:"ring", text: 'Missing credential'}); }
        let key = RED.nodes.getNode(config.key);
        
        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config, key.credentials)  });
        this.on('close', (done)  => { stop(done) });
    }
    RED.nodes.registerType("trello-in", register, {});

    // Register for button callback
    RED.httpAdmin.post("/trello-in/:id", RED.auth.needsPermission("trello-in.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                node.receive();
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error(RED._("inject.failed",{error:err.toString()}));
            }
        } else { res.sendStatus(404); }
    });
}


const stop  = (done) => { done(); }
const start = (RED, node, config) => {
    let uri = '/trello-callback'+config.path+'/';
    RED.httpNode.get  (uri, (req, res, next) => { node.send({'payload' : req.body}); res.sendStatus(200); });
    RED.httpNode.post (uri, (req, res, next) => { node.send({'payload' : req.body}); res.sendStatus(200); });
}

const input = (node, data, config, credentials) => {
    let url  = 'https://api.trello.com/1/tokens/'+credentials.token+'/webhooks/?key='+credentials.key; 
    let json = {
        description: "Trello Webhook " + (config.name || node.id),
        callbackURL: CONFIG.server.host + 'trello-callback'+config.path+'/',
        idModel: config.model,
    }
    let req  = {
        url: url,
        method: 'POST',
        headers: {'ContentType': 'application/json'},
        form: json
    };

    let n = node;
    request(req, (err, response, body) => {
        if (err) { return n.error(err); }
        n.warn(body);
    });
}
