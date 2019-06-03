'use strict';

const helper = require('node-red-viseo-helper');
const rp  =    require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;
        let creds = RED.nodes.getNode(config.config);
        config.restApi = {
            endpoint: creds.rest_endpoint,
            token: creds.credentials.rest
        }
        config.graphqlApi = {
            endpoint: creds.graphql_endpoint,
            token: creds.credentials.graphql
        }
        this.on('input', (data)  => { input(node, data, config); });
    }
    RED.nodes.registerType('iadvize-query', register, {});
};

async function input (node, data, config) {


    let params;
    let api = config.api || "rest";
    if (api === "rest") {

        let options = {};

        // Configuration
        let baseUrl = config.restApi.endpoint;
        let token = config.restApi.token;
        if (!baseUrl || !token) {
            return sendError(node, "configuration missing for rest API")
        }

        let action = config.action || "GET";
        let endpoint = (config.endpointType === "msg") ? helper.getByString(data, config.endpoint) : config.endpoint;
        if (baseUrl.slice(-1) === "/") baseUrl = baseUrl.substring(0, baseUrl.length -1)
        if (endpoint[0] !== "/") endpoint = '/' + endpoint;

        options.uri = baseUrl + endpoint;
        options.method = action;
        options.headers = { 'X-API-Key': token }

        // Parameters
        if (action !== "DELETE") params = (config.payloadType === "msg") ? helper.getByString(data, config.payload) : config.payload;

        if (params && typeof params === "string") {
            try {
                params = JSON.parse(options);
            }
            catch(err) {
                return sendError(node, "payload must be an object")
            }
        }

        // Query
        switch(action) {
            case "GET":
                try {
                    options.qs = params || {};
                    options.json = true;
                    let response = await rp(options);
                    data.payload = response.data;
                    return node.send(data);
                }
                catch(err) {
                    return sendError(node, err)
                }
            /* complete here later */
        }
    } else {

        let options = {
            method: "POST"
        };

        // Configuration
        let baseUrl = config.graphqlApi.endpoint;
        let token = config.graphqlApi.token;
        if (!baseUrl || !token) {
            return sendError(node, "configuration missing for graphql API")
        }

        options.uri = baseUrl;
        options.headers = { 'Authorization': "Bearer " + token }
        
        let graphquery = config.graphquery;
        if (graphquery === "custom") { 
            params = (config.payloadType === "msg") ? helper.getByString(data, config.payload) : config.payload;
            if (typeof params === "string") {
                try {
                    params = JSON.parse(params);
                }
                catch(err) {
                    return sendError(node, "payload must be an object")
                }
            }
        }
        else {
            params = { 
                query: {},
                variables : {}
            };

            for (let param of config.graphqlParams) {
                params.variables[param] = (config["graphql-" + param + "Type"] === "msg") ? helper.getByString(data, config["graphql-" +param]) : config["graphql-" +param];
                if (config["graphql-" + param + "Type"] === "json" && typeof(params.variables[param]) === "string") params.variables[param] = JSON.parse(params.variables[param]);
                else if (config["graphql-" + param + "Type"] === "num" && typeof(params.variables[param]) === "string") params.variables[param] =  Number(params.variables[param]);
            }

            let versionParameters = "name, type, isMandatory, type, valueType"
            let connectorVersionParameters = `id, version, status, name, logo, parameters { ${versionParameters} }`
            let connectorParameters = `id, name, isPrivate, clientId, creatorId, currentVersion { ${connectorVersionParameters} }`
            let routingGroupParameters = `id, name, userIds, segments { logicalOperator }, websiteId`
            let routingRuleParameters = `id, name, websiteId, groups { ${routingGroupParameters} }, routingMode`

            switch(config.graphquery) {
                case "connector":
                    params.query = `query GetConnector( $id: UUID!) { connector(id: $id) { ${connectorParameters} } }`;
                    break;
                case "connectors":
                    params.query = `query GetConnectors { connectors{ ${connectorParameters} } }`;
                    break;
                case "connectorConversationClosingFormValues":
                    params.query = `query GetConnectorConversationClosingFormValues( $conversationId: LegacyId!, $connectorVersionId: UUID!) {
                    connectorConversationClosingFormValues(conversationId: $conversationId, connectorVersionId: $connectorVersionId) { 
                    conversationId, fieldId, value, connectorVersion { ${connectorVersionParameters} } } }`;
                    break;
                case "connectorVersion":
                    params.query = `query GetConnectorVersion( $id: UUID!) { connectorVersion (id: $id) { ${connectorVersionParameters} } }`;
                    break;
                case "connectorVersionParameters":
                    params.query = `query GetConnectorVersionParameters( $connectorVersionId: UUID) { connectorVersionParameters(connectorVersionId: $connectorVersionId) { ${versionParameters} } }`;
                    break;
                case "connectorVersions":
                    params.query = `query GetConnectorVersions( $ids: [UUID!]!) { connectorVersions(ids: $ids) { ${connectorVersionParameters} } }`;
                    break;
                case "routingGroup":
                    params.query = `query GetRoutingGroup( $id: UUID!) { routingGroup(id: $id) { ${routingGroupParameters} } }`;
                    break;
                case "routingGroups":
                    params.query = `query GetRoutingGroups( $websiteIds: [LegacyId!]) { routingGroups(websiteIds: $websiteIds) { ${routingGroupParameters} } }`;
                    break;
                case "routingRule":
                    params.query = `query GetRoutingRule( $id: UUID!) { routingRule(id: $id) { ${routingRuleParameters} } }`;
                    break;
                case "routingRules":
                    params.query = `query GetRoutingRules( $websiteIds: [LegacyId!]) { routingRules(websiteIds: $websiteIds) { ${routingRuleParameters} } }`;
                    break;
                case "visitorCustomData":
                    params.query = `query GetVisitorCustomData( $channel: Channel!, $projectId: Int!, $legacyVisitorId: String!) { 
                    visitorCustomData(channel: $channel, projectId: $projectId, legacyVisitorId: $legacyVisitorId) { 
                        ... on VisitorCustomDataBoolean { key, booleanValue }
                        ... on VisitorCustomDataString { key, stringValue }
                        ... on VisitorCustomDataInt { key, intValue }
                        ... on VisitorCustomDataFloat {key, floatValue }
                    } }`;
                    break;
            }
        }
        

        try {
            options.body = params || {};
            options.json = true;
            let response = await rp(options);
            data.payload = response.data;
            return node.send(data);
        }
        catch(err) {
            return sendError(node, err)
        }        

    }
};

function sendError(node, error) {
    node.error(error)
    data.payload = { "error" : error }
    return node.send(data);
}