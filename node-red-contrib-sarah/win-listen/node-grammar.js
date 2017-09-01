const fs = require('fs');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        start(node, config, RED);
        this.on('close', (cb)    => { stop(node, cb, config)  });
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("win-grammar", register, {});
}

const start = (node, config, RED) => {
    if (!config.rule){ return; }
    setTimeout(() => { buildRule(node, config, RED) }, 1)
}


const stop = (node, callback, config) => {
    callback();
}

const input = (node, data, config) => {
    node.send(data);
}


// ------------------------------------------
//  WIRED
// ------------------------------------------

const buildRule = (node, config, RED) => {
    let rule = getRule(config);
    rule += getRules(node.wires[0], RED)
    //console.log(rule)
}

const getRules = (nodeIds, RED) => {

    if (!nodeIds) return '';

    // Build Nodes XML
    let xml = []; let subIds = []; let optional = true; 
    for (let nodeId of nodeIds){

        // Retrieve node
        let cfg = RED.nodes.getNode(nodeId);
        if ('win-grammar' !== cfg.type) continue;

        // Retrieve configuration
        let next = undefined;
        RED.nodes.eachNode((it) => { if (it.id == nodeId){ next = it; return; }})
        if (next.rule)  continue;
        if (!next.text) continue;

        // Build XML
        let rule = getRule(next);
        if (rule) xml.push(rule);

        // Push children
        subIds.push.apply(subIds, next.wires[0]);
        optional &= next.optional;
    }
    if (xml.length <= 0 ) return ''; 


    // Build Rule XML
    let items    = '<item'+ (optional ? ' repeat="0-1"' : '') +'>\n'
    if (nodeIds.length > 1){ items += '<one-of>\n' }
    
    items += xml.join('\n')
    
    if (nodeIds.length > 1){ items += '</one-of>\n' }
    items += '</item>\n'

    // Remove doublon (assume sub level for all nodeIds)
    if (subIds.length > 0){
        subIds = subIds.filter(function(item, pos) { return subIds.indexOf(item) == pos; })
        items += getRules(subIds, RED)
    }

    return items;
}

const getRule = (node) => { // handle optional if not done above
    if (!node.text){ return ''; }
    let items  = '<item>\n'

    let multiline = node.text.split('\n');
    if (multiline.length > 1){
        items += '<one-of>\n'
        for (let txt of multiline){ items += '<item>' + txt + '</item>\n' }
        items += '</one-of>\n'
    } else {
        items += node.text
    }
    items += '<tag>out.action["'+node.id+'"] = "' + node.value + '"</tag>'

    items += '</item>\n'
    return items;
}

// ------------------------------------------
//  GRAMMAR
// ------------------------------------------
/*
const grammar = (node, data, config) => {
    
    data.parent = config.rule ? config.rule 
                              : data.parent + "." + GrammarManager.getId(node);

    let item = { "xml": getXML(node, data, config) }
        item.value = config.value;
        item.and   = config.and;

    GrammarManager.addItem(data.parent, item);
}

const getXML = (node, data, config) => {
    
    if (!config.text) return undefined;

    // Compute value
    let value = '';
    if (config.value) value = '<tag>out.action.node="' + GrammarManager.getId(node) + '"</tag>';

    // For 1 item
    let sentences = config.text.split('\n');
    if (sentences.length === 1){
        return "  <item>" + sentences[0] + value + "</item>\n";
    }

    // For N items
    let xml = "";
    for (let txt of sentences){
         xml += "<item>" + txt + value + "</item>\n";
    }
    xml = "<item>\n  <one-of>\n"+xml+"  </one-of>\n</item>\n\n";
    return xml;
}*/