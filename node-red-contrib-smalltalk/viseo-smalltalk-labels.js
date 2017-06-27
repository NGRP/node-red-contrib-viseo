const request = require('request-promise');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on('input', (data)  => { input(node, data, config) });
        this.on('close', (cb)    => { stop(node, cb, config)    });
    }
    RED.nodes.registerType("smalltalk-labels", register, {});
}

const stop = (node, cb, config) => {
    cb();
}

const input = (node, data, config) => {

    if (!config.sheet) {
        data.payload = {};
        return node.send(data);
    }

    let text = helper.getByString(data, config.text  || 'payload');
    if (typeof text !== 'string' || text === ""){
        data.payload = {};
        return node.send(data);
    }

    let CACHE = [] ;

    let url = "https://spreadsheets.google.com/feeds/list/"+config.sheet+"/1/public/full?alt=json"
    sheet2json(url, (rows) => {
        if (rows == undefined) { 
            console.log("ERROR!");
            data.payload = {};
            return node.send(data);
        }
        else CACHE = rows;

        data.payload = undefined;

        let roxx = [];
        for (let row of CACHE) {
            let formsLi = row.first.replace(/, /g, ',');
            let forms = formsLi.split(",");

            for (let form of forms) {

                let len = form.length; 
                if ((len > 3 && text.includes(form)) || (len < 4 && text === form)) {
                    data.payload  = row;
                }
            }
        }

        return node.send(data); 

    })
}


// ------------------------------------------
//  PUBLIC JSON SHEET => ONLY FOR TESTING
// ------------------------------------------

var sheet2json = exports.sheet2json = function(url, callback){ 
    request({ 'uri': url, 'json': true }, 
    function (err, response, sheet){
        if (err || response.statusCode != 200 || sheet.feed == undefined) { 
            return callback(); }
        var json = []; 
        sheet.feed.entry.forEach( function(row){
            var q = {};
            for (var prop in row) { 
                if (!row.hasOwnProperty(prop)) { continue; }
                if (prop.indexOf('gsx$') !==0) { continue; }
                
                var name  = prop.substring(4);
                var value = row[prop].$t;
                q[name] = value;
            }
            json.push(q);
        });

        callback(json);
    });
}




