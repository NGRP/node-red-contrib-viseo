const helper  = require('node-red-viseo-helper');
const request = require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        if (config.process.match(/get-flow|update|restore|auth/ig)) {
            config.creds = RED.nodes.getNode(config.cred);
        }
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("nodes", register, {});
}

async function input(RED, node, data, config) {

    let process = config.process || "get-nodes";
    let property = helper.getContextValue(RED, node, data, config.property, config.propertyType);

    if (process === "get-nodes") {
        let value = helper.getContextValue(RED, node, data, config.value, config.valueType);
        let results = new Array();

        RED.nodes.eachNode(function(node) {
            if (!property || !value) results.push(node);
            else if (node[property] === value) results.push(node);
        })
        helper.setContextValue(RED, node, data, config.output, results, config.outputType);
        return node.send(data);
    }

    else if (process === "get-flow") {
        let results = new Array();
        
        RED.nodes.eachNode(function(node) {
            results.push(node);
        })

        helper.setContextValue(RED, node, data, config.output, results, config.outputType);
        return node.send(data);
    }

    else if (process === "auth") {
        if (!config.creds || !config.creds.credentials) {
            node.warn("Missing credentials");
            helper.setContextValue(RED, node, data, config.output, "400", config.outputType);
        }
        let url = config.creds.credentials.url,
            username = config.creds.credentials.username,
            password = config.creds.credentials.password;

        if (config.creds.usernameType === 'msg') username = helper.getByString(data, username);
        if (config.creds.passwordType === 'msg') password = helper.getByString(data, password);
        if (!url || !username || !password) {
            node.warn("Missing credentials");
            helper.setContextValue(RED, node, data, config.output, "400", config.outputType);
        }
        if (url.match(/\/$/)) url = url.substring(0, url.length -1);

        try {
            let result = await auth(url, username, password);
            let token = JSON.parse(result).access_token;

            helper.setContextValue(RED, node, data, config.creds.credentials.token, token, config.creds.tokenType);
            helper.setContextValue(RED, node, data, config.output, token, config.outputType);

            return node.send(data);
        }
        catch(err) {
            if (err.statusCode) {
                node.warn("Not authorized");
                helper.setContextValue(RED, node, data, config.output, err.statusCode, config.outputType);
                return node.send(data);
            }
            return node.error(err); 
        }
    }

    else if (process === "restore") {

        if (!config.creds || !config.creds.credentials) return node.warn("Missing credentials");
        let url = config.creds.credentials.url,
            flows = config.flows,
            token = config.creds.credentials.token;

        if (!flows) return node.warn("Missing backup file in credentials");
        if (!url)   return node.warn("Missing credentials");
        if (url.match(/\/$/)) url = url.substring(0, url.length -1);

        if (token) {
            token = helper.getContextValue(RED, node, data, token, config.creds.tokenType);

            try {
                var fs = require('fs');
                var json = JSON.parse(fs.readFileSync(flows, 'utf8'));
                let result = await postFlows(token, json, url);

                helper.setContextValue(RED, node, data, config.output, json, config.outputType);
                return node.send(data);
            }
            catch(err) {
                return node.error(err); 
            }
        }

        let username = config.creds.credentials.username,
            password = config.creds.credentials.password;

        if (config.creds.usernameType === 'msg') username = helper.getByString(data, username);
        if (config.creds.passwordType === 'msg') password = helper.getByString(data, password);
        if (!username || !password) return node.warn("Missing credentials");
        

        try {
            let result = await auth(url, username, password);
            let token = JSON.parse(result).access_token;
            
            helper.setContextValue(RED, node, data, config.creds.credentials.token, token, config.creds.tokenType);

            var fs = require('fs');
            var json = JSON.parse(fs.readFileSync(flows, 'utf8'));
    
            result = await postFlows(token, json, url);
            helper.setContextValue(RED, node, data, config.output, json, config.outputType);
            return node.send(data);
        }
        catch(err) {
            return node.error(err); 
        }
    }

    else {

        let input = helper.getContextValue(RED, node, data, config.input, config.inputType);

        if (!config.creds || !config.creds.credentials) return node.warn("Missing credentials");
        if (typeof input !== 'object' || input.length === "undefined") {
            node.warn("Input data should be an array");
            return node.send(data);
        }
    
        let url = config.creds.credentials.url,
            flows = config.flows,
            token = config.creds.credentials.token;

        if (!flows) return node.warn("Missing backup file in credentials");
        if (!url)   return node.warn("Missing credentials");
        if (url.match(/\/$/)) url = url.substring(0, url.length -1);

        // Get nodes from input
        let myNodes = [];
        for (let n of input) if (n.id) myNodes.push(n.id);

        if (token) {
            token = helper.getContextValue(RED, node, data, token, config.creds.tokenType);

            try {
                let result = await getFlows(token, url);
                let oldNodes = JSON.parse(result);
    
                if (flows) {
                    var fs = require('fs');
                    fs.writeFile(flows, JSON.stringify(oldNodes, null, 4), function(err) {
                        if (err) { return node.warn("Error writing backup file"); }
                    });
                }
        
                for (let i=0; i<oldNodes.length; i++) {
                    let index = myNodes.indexOf(oldNodes[i].id)
                    if (index !== -1) oldNodes[i] = input[index];
                }
        
                result = await postFlows(token, oldNodes, url);
                helper.setContextValue(RED, node, data, config.output, {updatedNodes: myNodes }, config.outputType);


                return node.send(data);
            }
            catch(err) {
                return node.error(err); 
            }
        }


        let username = config.creds.credentials.username,
            password = config.creds.credentials.password;

        if (config.creds.usernameType === 'msg') username = helper.getByString(data, username);
        if (config.creds.passwordType === 'msg') password = helper.getByString(data, password);
        if (!username || !password) return node.warn("Missing credentials");
    
        try {
            let result = await auth(url, username, password);
            let token = JSON.parse(result).access_token;

            helper.setContextValue(RED, node, data, config.creds.credentials.token, token, config.creds.tokenType);
            result = await getFlows(token, url);
            let oldNodes = JSON.parse(result);

            if (flows) {
                var fs = require('fs');
                fs.writeFile(flows, JSON.stringify(oldNodes, null, 4), function(err) {
                    if (err) { return node.warn("Error writing backup file"); }
                });
            }
    
            for (let i=0; i<oldNodes.length; i++) {
                let index = myNodes.indexOf(oldNodes[i].id)
                if (index !== -1) oldNodes[i] = input[index];
            }
    
            result = await postFlows(token, oldNodes, url);
            helper.setContextValue(RED, node, data, config.output, {updatedNodes: myNodes }, config.outputType);            
            return node.send(data);
        }
        catch(err) {
            return node.error(err); 
        }

    }
}

async function auth(url, user, pass) {
    let req = {
        method: "POST",
        uri: url + "/auth/token",
        form: {
            client_id: 'node-red-admin',
            grant_type : 'password',
            scope: '*',
            username: user,
            password: pass
        }
    }
    return request(req)
}

async function postFlows(token, myNodes, url) {
    let req = {
        method: "POST",
        uri: url + "/flows",
        headers: {
            "Authorization" : "Bearer " + token,
            "Node-RED-Deployment-Type" : "full"
        },
        body: myNodes,
        json: true
    }
    return request(req);
}

async function getFlows(token, url) {
    let req = {
        method: "GET",
        uri: url + "/flows",
        headers: {
            "Authorization" : "Bearer " + token,
        }
    }
    return request(req);
}