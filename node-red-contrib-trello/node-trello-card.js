const helper = require('node-red-viseo-helper');
const request = require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        node.status({fill:"red", shape:"ring", text: 'Missing credentials'});
        this.creds = RED.nodes.getCredentials(config.key);

        if (this.creds && this.creds.key && this.creds.token) node.status({});
    
        this.on('input', (data)  => { input(RED, node, data, config) });
    }
    RED.nodes.registerType("trello-card", register, {});
}

function renderRoute (pathObj, routeStr) {
    if (!pathObj || typeof pathObj !== "object") return routeStr;

    for (let parameter of Object.keys(pathObj)) {
        let tempStr = routeStr.replace("{" + parameter + "}", function(corres, dec) {
            let value = pathObj[corres.substring(1, corres.length-1)];
            return (value) ? value : corres
        })
        if (routeStr === tempStr) return false;
        else routeStr = tempStr;
    }

    if (routeStr.match(/{.*}/)) return false;
    return routeStr;
}

function renderQuery (queryObj, credentials) {
    let query = "?key=" + credentials.key;
        query += "&token=" + credentials.token;

    if (!queryObj || typeof queryObj !== "object") return query;
    for (let parameter in queryObj) {
        if (!queryObj[parameter]) continue;
        query += '&' + parameter + '=' + queryObj[parameter];
    }

    return query;

}

async function input (RED, node, data, config) { 

    let credentials = node.creds;
    let path = config.path;
    let body = config.body;
    let query = config.query;
    let route = config.route;
    let output = config.output || "payload";
    let sendreq = config.sendreq.split('-');
    let req = { 
        uri: "https://api.trello.com/1",
        method: sendreq[1].toUpperCase()
    };

    if (path)  path  = (config.pathType   === "json") ? JSON.parse(path)  : helper.getByString(data, path);
    if (body)  body  = (config.bodyType   === "json") ? JSON.parse(body)  : helper.getByString(data, body);
    if (query) query = (config.queryType  === "json") ? JSON.parse(query) : helper.getByString(data, query);

    route = renderRoute(path, route);
    if (!route) return node.error("Invalid path parameters");
    req.uri += route;

    if (query && (req.method === "POST" || req.method === "PUT")) {
        req.form = query;
        req.form.key = credentials.key;
        req.form.token = credentials.token;
    }
    else {
        req.uri += renderQuery(query, credentials);
    }

    if (body) {
        req.body = body;
        req.json = true;
    }

    try {
        let result = await request(req);
        helper.setByString(data, output, JSON.parse(result));
        return node.send(data)
    }
    catch(err) {
        node.warn(req);
        return node.error(err)
    }
}