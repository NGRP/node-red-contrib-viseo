const request = require('request-promise');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

let CACHE = [
    { "intent" : "com.viseo.hello", "lexical": "Salut"   },
    { "intent" : "com.viseo.hello", "lexical": "Bonjour" },
    { "intent" : "com.viseo.hello", "lexical": "Yo !"    },
    { "intent" : "com.viseo.hello", "lexical": "Hello"   },
]

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        start(node, config);
        this.on('input', (data)  => { input(node, data, config) });
        this.on('close', (cb)    => { stop(node, cb, config)    });
    }
    RED.nodes.registerType("smalltalk-types", register, {});
}

const stop = (node, cb, config) => {
    cb();
}

const start = (node, config) => {
    if (!config.sheet) return;

    let url = "https://spreadsheets.google.com/feeds/list/"+config.sheet+"/1/public/full?alt=json"
    sheet2json(url, (rows) => {
    	if (rows == undefined) console.log("ERROR!");
    	else CACHE = rows;
    })
}

const input = (node, data, config) => {

    let types = helper.getByString(data, config.types  || 'payload[0].type');
    if (typeof types !== 'object' || types === undefined){
        data.payload = undefined;
        return node.send(data);
    }

    let selectedType = "",
        selectedItem = "",
        selectedEx = "",
        selectedExGen = "",
        level = 0;

    for (let item of types) {
        for (let row of CACHE) {
            if (item === row.type3) {
                selectedType = row.type3;
                selectedItem = row.fr;
                selectedEx = row.frexample;
                selectedExGen = row.frgender;
                level = 3;
            }
            else if (item === row.type2 && row.type3 === "" && level < 3) {
                selectedType = row.type2;
                selectedItem = row.fr;
                selectedEx = row.frexample;
                selectedExGen = row.frgender;
                level = 2;
            }
            else if (item === row.type1 && row.type2 === "" && level < 2) {
                selectedType = row.type1;
                selectedItem = row.fr;
                selectedEx = row.frexample;
                selectedExGen = row.frgender;
                level = 1;
            }
            else if (item === row.type0 && row.type1 === "" && level < 1) {
                selectedType = row.type0;
                selectedItem = row.fr;
                selectedEx = row.frexample;
                selectedExGen = row.frgender;
                level = 0;
            }
        }
    }

    data.payload = {};

    if (selectedType !== "") {
        data.payload.selectedType = selectedType;
        data.payload.frenchType = {};
        data.payload.frenchType.type = selectedItem;

        if (selectedExGen === 'm') {
            if (/[aeiou]/.test(selectedItem.charAt(0))) { data.payload.frenchType.du = "de l'";
                                                          data.payload.frenchType.le = "l'"; 
                                                          data.payload.frenchType.ce = "cet" }
            else { data.payload.frenchType.du = "du";
                   data.payload.frenchType.le = "le"; 
                   data.payload.frenchType.ce = "ce"}
            data.payload.frenchType.un = "un"; 
        }
        else {
            if (/[aeiou]/.test(selectedItem.charAt(0))) { data.payload.frenchType.du = "de l'";
                                                          data.payload.frenchType.le = "l'"; }
            else { data.payload.frenchType.du = "de la";
                   data.payload.frenchType.le = "la"; }
            data.payload.frenchType.un = "une";
            data.payload.frenchType.ce = "cette";
        }

        if (selectedEx !== "") data.payload.example = selectedEx;
    }

    return node.send(data);
    
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




