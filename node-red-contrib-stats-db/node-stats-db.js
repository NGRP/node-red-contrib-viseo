'use strict';

const sqlite3 = require('sqlite3').verbose();

const inputHandler = (node, data, config) => {
    node.send(data);
};

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        const db = new sqlite3.Database('./dbtest');

        this.on('input', (data) => {
            inputHandler(node, data, config);
        });
    };

    RED.nodes.registerType('stats-db', register, {});
};