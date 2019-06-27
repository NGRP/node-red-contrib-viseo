'use strict';

const DatabaseManager = require('node-red-contrib-viseo-nosql-manager').DbManager;
const Datastore = require('nedb');
const xlsx      = require('node-xlsx')
const path      = require('path');


// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------

let info  = console.log;
let error = console.log;

class NeDBManager extends DatabaseManager {

    constructor(RED, node) {

        super();

        info  = RED.log.info;
        error = RED.log.error;

        this.db = null;
        this._init(node);
    }
    get database() {
    	return _database;
    }

    static get definition() {
        return {
            name : "NeDB",
            qName : "nedb"
        };
    }

    getStatus(config) {
    	let error = '';

        if(!this.file) {
            error = 'Missing file for NeDB source';
        }
        
        return error;
    }

    _init(node) {
         
        // DB Configuration
        this.file   = path.normalize(node.path);

        let dbconf = { 'filename': this.file }
        let callback = undefined;

        if (node.xlsx !== undefined && node.xlsx !== ""){
            dbconf.inMemoryOnly = true;
            //delete dbconf.filename;

            let tab  = parseInt(node.xlsx);
            let rows = this._xlsx2json(this.file, tab);
            callback = (db) => {
                manager.add(rows, {}, {}, function (err, data, newDocs) { 
                    if (err) { error(node.path + ' - ' + err); } 
                    node.log('Inserting ' + newDocs.length + ' documents');
                });
            }
        }

        // Create Database
        this.db = new Datastore(dbconf);
        let manager = this;

        this.db.loadDatabase((err) => {
            if (err) { 
                manager.db = undefined; 
                return node.error(node.path + ' - ' + err); 
            }
            node.log('Loading DataBase:' + manager.file);
            if (callback) {
                callback(manager.db);
            }
        });
    }

    end(callback) {
    	
    	if(this.db !== null) {

	    	this.db = null;
	 
    	}
    	callback();
    }

    find(key, data, config, callback) { 
        let cursor = this.db.find(key);

        if(config.limit) {
            cursor = cursor.skip(config.offset).limit(config.limit)
        }

        cursor.exec(function(err, documents) {
	    	callback(err, data, documents);
	    });
	}

    count(key, data, config, callback) { 
        this.db.count(key, function(err, count) {
            callback(err, data, count);
        });
    }

	update(key, value, data, config, callback) {

	    this.db.update(key, { $set: value }, { upsert: true }, function(err, result) {
	        callback(err, data, result);
	    });
	}

    increment(key, value, data, config, callback) {

        this.db.update(key, { $inc: value }, { upsert: true }, function(err, result) {
            callback(err, data, result);
        });
    }

	add(values, data, config, callback) {

	    this.db.insert(values, function(err, result) {
	    	callback(err, data, result);
	    });

	}

	remove(key, data, config, callback) {
	    this.db.remove(key, {multi: true}, function(err, result) {
	        callback(err, data, result);
	    });    

	}

    _xlsx2json(inputFile, tabIndex) {

        let workbook = xlsx.parse(inputFile);
        let sheet    = workbook[tabIndex].data;

        let first = undefined;
        let cptId = 0;
        let rows  = [];

        for (let row of sheet){ 
            if (first === undefined) { first = row; continue; }
            if (row[0] === undefined) { continue; } // Skip (quick) empty lines

            let obj = { }; // Generate an NeDB id

            for(let i = 0 ; i < first.length ; i++){
                let col  = ((first[i] || '') + '').trim(); // Cleanup
                obj[col] = row[i] || ''; // Cleanup
                if(typeof obj[col] === 'string') {
                    obj[col] = obj[col].trim();
                }
            }
            rows.push(obj)
        }
        return rows
    }
};

module.exports = NeDBManager;
