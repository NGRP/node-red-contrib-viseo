const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("loop-management", register, {});
}

let CONF = {};
const input = (RED, node, data, config) => {

    const loopKey = '_loop_' + node.id.replace('.', '_');

    // 1. SCOPE : confObject
    // 1.1. Scope: Flow
    let scope = config.scope || 'msg';
    let confObject = {};

    // 1.2. Scope: User
    if (scope === 'user'){
        data.user = data.user || {};
        confObject = data.user[loopKey] = data.user[loopKey] || {};
    } else {
        confObject = helper.getContextValue(RED, node, data, loopKey, scope);
        if (!confObject) {
            confObject = {};
            helper.setContextValue(RED, node, data, loopKey, confObject, scope);
        }
    }

    // 2. FIRST ITERATION : init object
    if (JSON.stringify(confObject) === '{}') {

        // 2.1. Get input 

        let inputObject = helper.getContextValue(RED, node, data, config.input || 'payload', config.inputType || 'msg');
        if (inputObject === undefined || typeof inputObject !== 'object') return node.error("Main object : incorrect value");

        // 2.2. Init configuration : object or array
        if (inputObject.length !== undefined) confObject = {'array':inputObject, 'count':0};
        else {
            confObject = {'properties':[], 'values':[], 'count':0};
            for (let name in inputObject) {  
                if (inputObject.hasOwnProperty(name)) {
                    confObject.properties.push(name);
                    confObject.values.push(inputObject[name]);
                }
            }
        }
    }
    else confObject.count ++;

    // 3. OUTPUT : outputObject
    let outputType = config.outputType || 'msg',
        outputObject = config.output || 'payload',  
        behavior = config.behavior || 'after';

    // 4. BEHAVIOR
    let len = (confObject.array !== undefined) ? confObject.array.length : confObject.properties.length;
    let returnedValue = [];

    // 4.1. Out of loop
    if (confObject.count === (len-1) && behavior === "before") {
        let outObject = (confObject.array !== undefined) ? confObject.array[confObject.count] : {'property': confObject.properties[confObject.count],'value': confObject.values[confObject.count]};  

        if (scope === "user") delete data.user[loopKey];
        else helper.setContextValue(RED, node, data, loopKey, undefined, scope); 

        // Log activity
        try { setTimeout(function() { helper.trackActivities(node)},0); }
        catch(err) { console.log(err); }
        helper.setContextValue(RED, node, data, outputObject, outObject, outputType);
        returnedValue = [undefined,data];
    }

    else if (confObject.count >= len) {  
        if (scope === "user") delete data.user[loopKey];
        else helper.setContextValue(RED, node, data, loopKey, undefined, scope); 

        // Log activity
        try { setTimeout(function() { helper.trackActivities(node)},0); }
        catch(err) { console.log(err); }
        helper.setContextValue(RED, node, data, outputObject, undefined, outputType);
        returnedValue = [undefined,data];
    }

    else {
        // 4.2. Increment
        if (scope === "user") data.user[loopKey] = confObject;
        else helper.setContextValue(RED, node, data, loopKey, confObject, scope); 

        let outObject = (confObject.array !== undefined) ? confObject.array[confObject.count] : {'property': confObject.properties[confObject.count],'value': confObject.values[confObject.count]};
        helper.setContextValue(RED, node, data, outputObject, outObject, outputType);
        returnedValue = [data, undefined];
    }

    let delay = 0;
    if (config.delay) {
        delay = Number(config.delayType === 'msg' ? helper.getByString(data, config.delay) : config.delay);
        setTimeout(function() { node.send(returnedValue);}, delay);
    }
    else return node.send(returnedValue);
}
