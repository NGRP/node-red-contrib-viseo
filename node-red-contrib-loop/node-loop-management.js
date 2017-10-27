const request = require('request');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("loop-management", register, {});
}

let CONF = {};
const input = (node, data, config) => {

    const loopKey = 'loop' + node.id.replace('.', '_');

    // 1. SCOPE : confObject
    // 1.1. Scope: Flow
    let scope = config.scope || 'msg',
        _tmp = data._tmp = data._tmp || {};

    // 1.2. Scope: User
    if (scope === 'user'){
        data.user = data.user || {};
        _tmp = data.user._tmp = data.user._tmp || {};
    } 

    // 1.3. Scope: Global
    let confObject = CONF;
    if (scope !== 'global') confObject = _tmp[loopKey] || {};

    // 2. PREMIER PASSAGE : init object
    if (JSON.stringify(confObject) === '{}') {

        // 2.1. INFOS
        let inputType = config.inputType || 'msg',
            inputObject = config.input || 'payload';

        // 2.2. INPUT : inputObject
        let loc = (inputType === 'global') ? node.context().global : data;
        inputObject = helper.getByString(loc, inputObject);

        if (inputObject === undefined || typeof inputObject !== 'object') return node.error("Main object : incorrect value");

        // 2.3. Init configuration : object or array
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
        loc = (outputType === 'global') ? node.context().global : data;

    // 4. BEHAVIOR
    let len = (confObject.array !== undefined) ? confObject.array.length : confObject.properties.length;

    // 4.1. Out of loop
    if (confObject.count >= len) {  (scope === 'global') ? CONF = {} : _tmp[loopKey] = undefined;
                                    helper.setByString(loc, outputObject, undefined);
                                    return node.send([undefined,data]); }

    // 4.2. Increment
    (scope === 'global') ? CONF = confObject : _tmp[loopKey] = confObject;
    let outObject = (confObject.array !== undefined) ? confObject.array[confObject.count] : {'property': confObject.properties[confObject.count],'value': confObject.values[confObject.count]};

    helper.setByString(loc, outputObject, outObject);
    node.send([data, undefined]);


    
}