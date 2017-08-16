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


    // ------------------------------------------
    //  PARAMETERS
    // ------------------------------------------

    // Retrieve previous Trello card and merge with configuration
    let form = helper.getByString(data, config.input, {});
        form = buildParameters(RED, config, data, form);

    // Build a GET/PST/PUT Request
    let req  = buildRequest(credentials, form.id, undefined, form.idList ? form : undefined)

    // Inner function to handle attachment
    let setAttachment = (json, callback) => {
        
        // Skip GET
        if (req.method === 'GET'){ return callback(undefined, json); }

        // Check fields
        let attachURL = helper.resolve(config.attachURL,  data, undefined);
        if (!attachURL){ return callback(undefined, json); }

        // Should we check if an attachment with the same name already existss ?
        // If true should we remove it or let it go ?

        // Build POST Request
        let atchReq = buildRequest(credentials, form.id, '/attachments', {
            'url'     : attachURL.indexOf('http') === 0 ? attachURL : (CONFIG.server.host + attachURL),
            'mimeType': helper.resolve(config.attachMIME, data, undefined),
            'name'    : helper.resolve(config.attachName, data, undefined)
        })

        request(atchReq, (err, response, body) => {
            if (err) { return callback(err); }
            let atchBody   = JSON.parse(body)
            let coverReq   = buildRequest(credentials, form.id, undefined, { 'idAttachmentCover':  atchBody.id })
            request(coverReq, (err, response, body) => {
                if (err) { return callback(err); }
                callback(undefined, atchBody);
            });
        });
    }


    let n = node;
    request(req, (err, response, body) => {
        if (err) { return n.error(err); }
        try {
            let json = JSON.parse(body)

            // Handle Attachement
            setAttachment(json, function(err, attach){
                if (err) { return n.warn(err); }
                helper.setByString(data, config.output || 'payload', json);
                n.send(data);
            })

        } catch (ex){ n.warn('Error: ' + body); }
    });
}

const buildRequest = (credentials, cardId, subpath, form) => {

    subpath = subpath || '';
    cardId  = cardId  || '';
    let req     = { headers: {'ContentType': 'application/json'} };

    // POST create a new given Card
    if (!cardId || subpath){ // Kludge
        req.form   = form || {};
        req.method = 'POST'
        req.url    = 'https://api.trello.com/1/cards/' + cardId + subpath +  '?key='+credentials.key + '&token='+credentials.token
        return req;
    }

    // PUT update a given Card ID
    if (form){
        req.form   = form || {};
        req.method = 'PUT'
        req.url    = 'https://api.trello.com/1/cards/' + cardId + subpath + '?key='+credentials.key + '&token='+credentials.token
        return req;
    }
    
    // GET find the given Card ID
    req.qs = form || {};
    req.qs.attachments = true;
    req.qs.pluginData  = true;
    req.method = 'GET'
    req.url    = 'https://api.trello.com/1/cards/' + cardId + subpath + '?key='+credentials.key + '&token='+credentials.token
    return req;
}

const buildParameters = (RED, config, data, form) => {
    form = form || {};

    if (config.title)       { form.name        =    helper.resolve(config.title,       data, undefined); }
    if (config.desc)        { form.desc        =    helper.resolve(config.desc,        data, undefined); }
    
    if (config.pos)         { form.pos         =    helper.resolve(config.pos,         data, undefined); }
    if (config.due)         { form.due         =    helper.resolve(config.due,         data, undefined); }
    if (config.dueComplete) { form.dueComplete =  !!helper.resolve(config.dueComplete, data, undefined); }
    if (config.closed)      { form.closed      =  !!helper.resolve(config.closed,      data, undefined); }
    
    if (config.idCard) {
        form.id = helper.resolve(config.idCard, data, undefined); 
    }

    if (config.idList) {
        let list = RED.nodes.getNode(config.idList);
        form.idList = helper.resolve(list.item, data, undefined); 
    }

    if (config.idMembers)  { 
        let members = helper.resolve(config.idMembers, data, undefined);
        if (members){
            members = members.split(',');
            form.idMembers = form.idMembers || [];
            for (let mbr of members){ form.idMembers.push(mbr); }
        }
    }
    if (config.idLabels)  { 
        let labels = helper.resolve(config.idLabels, data, undefined);
        if (labels){
            labels = labels.split(',');
            form.idLabels = form.idLabels || [];
            for (let lbl of labels){ form.idLabels.push(lbl); }
        }
    }

    return form;
}