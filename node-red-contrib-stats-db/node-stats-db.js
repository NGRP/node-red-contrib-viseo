'use strict';

const sqlite3 = require('sqlite3').verbose();

const insertIntentStats = (node, result) => {
    const intent = (result.metadata && result.metadata.intentName) || result.action

    node.statsDb.run('INSERT INTO intents(intents, question) VALUES($intent, $question)', {
        $intent: intent,
        $question: result.resolvedQuery
    });
};

const insertUserStats = (node, user) => {
    const params = {
        $fbId: user.id,
        $lastSeen: user.mdate
    };

    node.statsDb.run('UPDATE OR IGNORE users SET last_seen = $lastSeen WHERE facebook_id = $fbId', params);
    node.statsDb.run('INSERT OR IGNORE INTO users(facebook_id, last_seen) VALUES($fbId, $lastSeen)', params);
};

const insertHotelStats = (node, hotel) => {
    node.statsDb.run('INSERT INTO hotels(rid, hotel_name) VALUES($rid, $name)', {
        $rid: hotel.code,
        $name: hotel.name || null
    });
};

const inputHandler = (node, data, config) => {
    // if (data.payload && data.payload.result) {
    //     insertIntentStats(node, data.payload.result);
    // }

    if (data.user) {
        insertUserStats(node, data.user);
    }

    if (data.log && data.log.hotel) {
        insertHotelStats(node, data.log.hotel);
        delete data.log.hotel;
    }

    node.send(data);
};

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        const db = new sqlite3.Database('./dbstats');
        this.statsDb = db;

        let node = this;

        this.on('input', (data) => {
            inputHandler(node, data, config);
        });
    };

    RED.nodes.registerType('stats-db', register, {});
};
