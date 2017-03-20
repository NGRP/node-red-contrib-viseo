'use strict';

const fs     = require('fs')
const xlsx   = require('node-xlsx')
const helper = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("xlsx", register, {});
}

const input = (node, data, config) => {

    let rows = helper.getByString(data, config.rows);
    if (!Array.isArray(rows)){
        node.warn('Rows must be an array of object');
        return node.send(data);
    }

    let columns  = config.columns.split('\n');
    if (columns.length <= 0){
        node.warn('No columns to fill');
        return node.send(data);
    }

    // Build matrix
    let sheet  = [];
    for (let item  of rows){
        let row = [];
        for (let column of columns){
            let obj = helper.getByString(item, column, null);
            if (typeof obj === 'object') { row = row.concat(Object.keys(obj).map(key => obj[key])); } else { row.push(obj) }
        }
        sheet.push(row)
    }
    let buffer = xlsx.build([{name: config.name, data: sheet}]);
    
    // Write to a file
    let path    = helper.resolve(config.path, data);
    fs.writeFileSync(path, buffer);

    node.send(data);
}