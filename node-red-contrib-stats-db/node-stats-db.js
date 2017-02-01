'use strict';

const sqlite3 = require('sqlite3').verbose();

const insertIntentStats = (node, result) => {
    node.statsDb.run('INSERT INTO intents VALUES($intent, $question)', {
        $intent: result.metadata && result.metadata.intentName,
        $question: result.resolvedQuery
    });
};

const insertUserStats = (node, user) => {
    node.statsDb.run('INSERT INTO users VALUES($fbId, $lastSeen)', {
        $fbId: user.id,
        $lastSeen: user.mdate
    });
};

const insertHotelStats = (node, hotel) => {
    node.statsDb.run('INSERT INTO hotels VALUES($rid, $name)', {
        $rid: hotel.code,
        $name: hotel.name
    });
};

const inputHandler = (node, data, config) => {
    if (data.payload && data.payload.result) {
        insertIntentStats(node, data.payload.result);
    }

    if (data.user) {
        insertUserStats(node, data.user);
    }

    if (data.hotel) {
        insertHotelStats(node, data.hotel);
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