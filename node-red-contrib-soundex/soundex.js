

const helper    = require('node-red-viseo-helper');
const clj_fuzzy = require('clj-fuzzy');
const soundex   = require('./lib/sarah.soundex.js').soundex;

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
    RED.nodes.registerType("soundex", register, {});
}

const stop = (node, cb, config) => {
    cb();
}

const start = (node, config) => {
    if (!config.sheet) return;

    let url = "https://spreadsheets.google.com/feeds/list/"+config.sheet+"/1/public/full?alt=json"

    sheet2json(url, (rows) => {
    	if (rows == undefined) console.log("ERROR with spreadsheet "+url);
    	else {
	        CACHE = rows
	        for (let cache of CACHE){
	            cache.soundex = soundex(cache.lexical);
	        }
    	}
    })
}

const input = (node, data, config) => { 
    let confidence = parseFloat(config.confidence)
    find(confidence, data.payload, (err, score, match, sdx) => {
        if (err) return node.warn(err);
        data.payload = {"match" : match, "score": score, "sdx" : sdx};
        node.send(data);
    })
    
}

const find = (confidence, lexical, callback) => {
  var sdx   = soundex(lexical);
  var match = undefined;
  var score = 0;
  for (var cache of CACHE){
    var levens  = clj_fuzzy.metrics.levenshtein(sdx, cache.soundex);
        levens  = 1 - (levens / cache.soundex.length); 
    //console.log(lexical, sdx, ' vs ', cache.soundex, cache.lexical, ' = ', levens);    
    if (levens > score && levens > confidence){
      score = levens;
      match = cache;
    }
  }
  callback(undefined, score, match, sdx);
}

// ------------------------------------------
//  PUBLIC JSON SHEET => ONLY FOR TESTING
// ------------------------------------------



var request = require('request');
var sheet2json = exports.sheet2json = function(url, callback){ console.log(url)
    request({ 'uri': url, 'json': true }, 
    function (err, response, sheet){ 
        if (err || response.statusCode != 200 || sheet.feed == undefined) { 
            return callback(); 
        }
        var json = []; 
        sheet.feed.entry.forEach( function(row){
            var q = {};
            for (var prop in row) { 
                if (!row.hasOwnProperty(prop)) { continue; }
                if (prop.indexOf('gsx$') !==0)  { continue; }
                
                var name  = prop.substring(4);
                var value = row[prop].$t;
                q[name] = value;
            }
            json.push(q);
        });

        callback(json);
    });
}




