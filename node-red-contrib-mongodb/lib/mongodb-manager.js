'use strict';
const DatabaseManager = require('node-red-contrib-viseo-nosql-manager').DbManager;
const MongoClient   = require('mongodb').MongoClient;


class MongoDBManager extends DatabaseManager {

    constructor(node) {
        super();
        this.db = null;
        this._init(node);
    }

    get database() {
    	return _database;
    }

    static get definition() {
        return {
            name : "MongoDB",
            qName : "mongodb"
        };
    }

    getStatus(config) {
    	let error = '';
        if(!this.hosts) {
            error = 'Missing host for MongoDB server';
        } else if(!this._database) {
            error = 'Missing database name for Mongo connection';
        } else if(config && !config.collection) {
            error = 'Missing collection name for Mongo request';
        } else if(!this.user) {
            error = 'Missing user name for Mongo connection';
        } else if(!this.password) {
            error = 'Missing password for Mongo connection';
        }

        return error;
    }

    _init(node) {

        this._database = node.credentials.database;
        this.user = node.credentials.user;
        this.password = node.credentials.password;
        this._initHosts(JSON.parse(node.credentials.hosts));

        if(node.credentials.ssl === "on") {
            this.ssl = true;
        } else {
            this.ssl = false;
        }
        this.replicaSet = node.credentials.replicaSet;

       
		if(this.db === null && this.getStatus() === '') {

            this.url =  'mongodb://'+node.credentials.user+':'+encodeURIComponent(node.credentials.password)
                    +'@'+this._hosts()+'/'+node.credentials.database+this._options();


            let manager = this;

                //CONNECT DATABASE
            MongoClient.connect(this.url, function(err, db) {

                if(err === null) {
                    manager.db = db;
                    info("Connected to database "+manager.url);
                } else {
                    error("Could not connect to database "+manager.url+' : '+err);
                }
            });
        }
    }
    _initHosts(hosts) {

        let string = '';
        this.hosts = [];

        let regex = /([a-z]+)\[([0-9]+)\]/

        for(let object of hosts) {
            let parseResult = object.name.match(regex)
            if(parseResult.length === 0) {
                continue;
            }

            if(this.hosts[parseResult[2]] === undefined) {
                this.hosts[parseResult[2]] = {}
            }
            this.hosts[parseResult[2]][parseResult[1]] = object.value
        }
        
    }

    _options() {

        let options = {}
        let string = ''

        if(this.ssl) {
            options.ssl = 'true';
        }

        if(this.replicaSet) {
            options.replicaSet = this.replicaSet;
        }

        if(Object.keys(options).length > 0) {
            string += '?';
            for (let option in options) {
                string += option + '='+options[option] + '&';
            }
            string = string.substring(0, string.length -1)
        }

        return string
    }


    _hosts() {
        
        let string = ''

        for(let host of this.hosts) {
            string += host.host + ':' + host.port + ',';
        }

        string = string.substring(0, string.length -1);

        return string;
    }

    end(callback) {
    	
    	if(this.db !== null) {

	        this.db.close();
	    	this.db = null;
	        info('mongoDB connection to '+this.url+' stopped.');
	 
    	}
    	callback();
    }

    count(key, data, config, callback) {

        const collection = this.db.collection(config.collection);
        collection.count(key, function(err, count) {
            callback(err, data, count)
        });

    }

    async find(key, data, config, callback) { 

        const collection = this.db.collection(config.collection);

        let err = null;
        let documents = [];

        try {

            let cursor = collection.find(key);
            if(config.limit) {
                cursor = cursor.skip(config.offset).limit(config.limit);
            } 
            while(await cursor.hasNext()) {
              documents.push(await cursor.next());
            }
        } catch(e) {
            err = e
        }

        callback(err, data, documents);
    }

	update(key, value, data, config, callback) {

		let collection = this.db.collection(config.collection);
	    collection.updateOne(key, { $set: value }, { upsert: true }, function(err, result) {
	        callback(err, data, result);
	    });
	}

	add(values, data, config, callback) {

	    let collection = this.db.collection(config.collection);
	    collection.insert(values, function(err, result) {
	    	callback(err, data, result);
	    });

	}

	remove(key, data, config, callback) {

	    let collection = this.db.collection(config.collection);
	    collection.remove(key, function(err, result) {
	        callback(err, data, result);
	    });    

	}
};

module.exports = MongoDBManager;
