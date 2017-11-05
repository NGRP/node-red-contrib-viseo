const fs = require('fs');
const helper = require('node-red-viseo-helper');
const google = require('googleapis');
const sheets = google.sheets('v4');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'})
        if (config.auth) {
            node.auth = RED.nodes.getNode(config.auth);
            node.status({});
        }

        this.on('input', (data)  => { input(node, data, config,) });
    }
    RED.nodes.registerType("google-spreadsheet", register, {});
}


const input = (node, data, config) => {
    let method = 'get'
    let spreadsheetId = helper.resolve(config.sheet, data, config.sheet)
    let range = helper.resolve(config.range, data, config.range)
    let parameters = { spreadsheetId, range }
    let fields = config.fields ? config.fields.split('\n') : undefined

    if (config.input){ 
        method = config.method
        parameters.valueInputOption= "USER_ENTERED"
        parameters.resource = {}
        let rows = helper.getByString(data, config.input); node.warn(rows);
        if (Array.isArray(rows) && rows.length > 0){ 
            if (Array.isArray(rows[0])){ parameters.resource.values = rows }
            else if (fields) {
                let values = []
                for (obj of rows){
                    let row = []; values.push(row);
                    for (field of fields){
                        row.push(helper.getByString(obj, field));
                    }
                }
                parameters.resource.values = values
                node.warn(values)
            }
        }
    }

    let query = () => {
        sheets.spreadsheets.values[method](parameters, function(err, response) {
            if (err) { return node.warn(err); }
            if (config.output){ 
                     if (response.updates){ helper.setByString(data, config.output, response) }
                else if (response.values){  
                    if (!fields) { helper.setByString(data, config.output, response.values) }
                    else {
                        let rows   = response.values
                        let values = []
                        for (row of rows){
                            let obj = {}; values.push(obj);
                            for (let i = 0 ; i < row.length ; i++){
                                helper.setByString(obj, fields[i], row[i])
                            }
                        }
                        helper.setByString(data, config.output, values)  
                    }
                }
            }
            node.send(data)
        });
    }

    node.auth.authenticate((auth) => {
        parameters.auth = auth
        if (!config.clear){ return query(); }
        
        // Perform clear
        sheets.spreadsheets.values.clear({ spreadsheetId, range, auth }, function(err, response) {
            if (err) { return node.warn(err); }
            query();
        });
    })
}
