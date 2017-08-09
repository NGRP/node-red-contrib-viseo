const request = require('request');
const helper   = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        if (!config.key) {node.status({fill:"red", shape:"ring", text: 'Missing credential'}); }
        let key = RED.nodes.getNode(config.key);
        
        this.on('input', (data)  => { input(RED, node, data, config, key.credentials) });
    }
    RED.nodes.registerType("trello-card", register, {});
}

const input = (RED, node, data, config, credentials) => { 
    let req    = { headers: {'ContentType': 'application/json'}};

    // Retrieve previous Trello card
    req.form = helper.getByString(data, config.input, {});

    
    if (config.title)       { req.form.name        =    helper.resolve(config.title,       data, undefined); }
    if (config.desc)        { req.form.desc        =    helper.resolve(config.desc,        data, undefined); }
    
    if (config.pos)         { req.form.pos         =    helper.resolve(config.pos,         data, undefined); }
    if (config.due)         { req.form.due         =    helper.resolve(config.due,         data, undefined); }
    if (config.dueComplete) { req.form.dueComplete =  !!helper.resolve(config.dueComplete, data, undefined); }
    if (config.closed)      { req.form.closed      =  !!helper.resolve(config.closed,      data, undefined); }
    
    if (config.idCard) {
        let card = RED.nodes.getNode(config.idCard);
        req.form.id = helper.resolve(card.item, data, undefined); 
    }

    if (config.idList) {
        let list = RED.nodes.getNode(config.idList);
        req.form.idList = helper.resolve(list.item, data, undefined); 
    }

    if (config.idMembers)  { 
        let members = helper.resolve(config.idMembers, data, undefined);
        if (members){
            members = members.split(',');
            req.form.idMembers = req.form.idMembers || [];
            for (let mbr of members){ req.form.idMembers.push(mbr); }
        }
    }
    if (config.idLabels)  { 
        let labels = helper.resolve(config.idLabels, data, undefined);
        if (labels){
            labels = labels.split(',');
            req.form.idLabels = req.form.idLabels || [];
            for (let lbl of labels){ req.form.idLabels.push(lbl); }
        }
    }

    // PUT update a given Card ID
    if (req.form.id && req.form.idList){
        req.method = 'PUT'
        req.url    = 'https://api.trello.com/1/cards/'        + req.form.id + '?key='+credentials.key + '&token='+credentials.token
    }
    
    // GET find the given Card ID
    if (req.form.id && !req.form.idList){
        req.method = 'GET'
        req.url    = 'https://api.trello.com/1/cards/'        + req.form.id + '?key='+credentials.key + '&token='+credentials.token
    }

    // POST create a new given Card
    if (!req.form.id && req.form.idList){
        req.method = 'POST'
        req.url    = 'https://api.trello.com/1/cards?idList=' + req.form.idList + '&key='+credentials.key + '&token='+credentials.token
    }

    let n = node;
    request(req, (err, response, body) => {
        if (err) { return n.error(err); }
        try {
            let json = JSON.parse(body)
            helper.setByString(data, config.output || 'payload', json);
            n.send(data);
        } catch (ex){ n.warn('Error: ' + body); }
    });

}