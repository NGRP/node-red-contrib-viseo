const helper  = require('node-red-viseo-helper');
const request = require('request-promise');
const fs      = require('fs');
const path    = require('path');

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
    let process = config.process || "get-nodes",
        property = config.property,
        output = config.output;

    let outloc  = (config.outputType === 'global') ? node.context().global : data;

    if (config.propertyType !== 'str') {
        let loc = (config.propertyType === 'global') ? node.context().global : data;
        property = helper.getByString(loc, property);
    }

    if (process === "get-nodes") {
        let value = config.value;

        if (config.valueType !== 'str') {
            let loc = (config.valueType === 'global') ? node.context().global : data;
            value = helper.getByString(loc, value);
        } 
        else if (config.valueType === 'num')  value = Number(value);
        else if (config.valueType === 'bool') value = (value === "true") ? true : false;

        let results = new Array();

        RED.nodes.eachNode(function(node) {
            if (!property || !value) results.push(node);
            else if (node[property] === value) results.push(node);
        })

        helper.setByString(outloc, output, results);
        return node.send(data);
    }

    else if (process === "get-flow") {
        let results = new Array();
        
        RED.nodes.eachNode(function(node) {
            results.push(node);
        })

        helper.setByString(outloc, output, results);
        return node.send(data);
    }

    else if (process === "auth") {
        if (!config.creds || !config.creds.credentials) {
            node.warn("Missing credentials");
            helper.setByString(outloc, output, "400");
        }
        let url = config.creds.credentials.url,
            username = config.creds.credentials.username,
            password = config.creds.credentials.password;

        if (config.creds.usernameType === 'msg') username = helper.getByString(data, username);
        if (config.creds.passwordType === 'msg') password = helper.getByString(data, password);
        if (!url || !username || !password) {
            node.warn("Missing credentials");
            helper.setByString(outloc, output, "400");
        }
        if (url.match(/\/$/)) url = url.substring(0, url.length -1);

        try {
            let result = await auth(url, username, password);
            let token = JSON.parse(result).access_token;

            if (config.creds.tokenType !== 'str') {
                let loc = (config.creds.tokenType === 'global') ? node.context().global : data;
                helper.setByString(loc, config.creds.credentials.token, token);
            }

            helper.setByString(outloc, output, token);
            return node.send(data);
        }
        catch(err) {
            if (err.statusCode) {
                node.warn("Not authorized");
                helper.setByString(outloc, output, err.statusCode);
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

            if (config.creds.tokenType !== 'str') {
                let loc = (config.creds.tokenType === 'global') ? node.context().global : data;
                token = helper.getByString(loc, token);
            }

            try {
                var fs = require('fs');
                var json = JSON.parse(fs.readFileSync(flows, 'utf8'));
                let result = await postFlows(token, json, url);

                helper.setByString(outloc, output, json);
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

            if (config.creds.tokenType !== 'str') {
                let loc = (config.creds.tokenType === 'global') ? node.context().global : data;
                helper.setByString(loc, config.creds.credentials.token, token);
            }

            var fs = require('fs');
            var json = JSON.parse(fs.readFileSync(flows, 'utf8'));
    
            result = await postFlows(token, json, url);
            helper.setByString(outloc, output, json);
            return node.send(data);
        }
        catch(err) {
            return node.error(err); 
        }
    }

    else {

        let loc = (config.inputType === 'global') ? node.context().global : data;
        let input = helper.getByString(loc, config.input);

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

            if (config.creds.tokenType !== 'str') {
                let loc = (config.creds.tokenType === 'global') ? node.context().global : data;
                token = helper.getByString(loc, token);
            }

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
                helper.setByString(outloc, output, {updatedNodes: myNodes });
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

            if (config.creds.tokenType !== 'str') {
                let loc = (config.creds.tokenType === 'global') ? node.context().global : data;
                helper.setByString(loc, config.creds.credentials.token, token);
            }

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
            helper.setByString(outloc, output, {updatedNodes: myNodes });
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