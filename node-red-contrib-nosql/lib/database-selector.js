'use strict';
class DatabaseSelector {
	
	constructor(config) {
		this._config = config;
	}

	get config() {
		return this._config["server-"+this._config['server-type']];
	}
}

class DatabaseSelectorFactory {
	
	constructor() {
	}

	create(config, authorizedTypes) {

		if(authorizedTypes.indexOf(config['server-type']) === -1) {
			console.log(config['server-type']+" is not allowed");
			return null;
		}

		if(config["server-"+config['server-type']] === undefined) {
			console.log("no configuration is set for "+config['server-type']);
			return null;
		}

		let selector = new DatabaseSelector(config);
		return selector;
	}
}

module.exports = DatabaseSelectorFactory;