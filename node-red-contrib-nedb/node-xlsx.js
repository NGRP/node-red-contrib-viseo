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
    let rows = helper.getByString(data, config.rows || 'payload');
    if (!Array.isArray(rows)){
        node.warn('Rows must be an array of object');
        return node.send(data);
    }

    if (rows.length === 0){
        node.warn('No elements, skip and continue');
        return node.send(data);
    }

    let columns  = config.columns
    if (columns){ columns = columns.split('\n'); }
    else {        columns = Object.keys(rows[0]) }

    // Build matrix
    let sheet  = json2xlsx(columns, rows);
    let buffer = xlsx.build([{name: config.name, data: sheet}]);
    
    // Write to a file
    let path    = helper.resolve(config.path, data);
    fs.writeFileSync(path, buffer);

    node.send(data);
}

// ------------------------------------------
//  JSON TO XLSX
// ------------------------------------------

const json2xlsx = (columns, rows) => {
    let sheet = [];
    sheet.push(columns);
    for (let obj of rows){
        let row = [];
        for (let column of columns){
            let value = helper.getByString(obj, column, '');
            row.push(value);
        }
        sheet.push(row)
    }
    return sheet;
}