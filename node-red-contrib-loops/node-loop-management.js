const request = require('request');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("loop-management", register, {});
}

const input = (node, data, config) => {
    let running = true,
        settings = {nbIterations:0};

    let loopType = config.loopType,
        location = config.location;

    data.conf = config;

    if (location === undefined || location === "" || typeof location !== 'string') return node.error("'location' field is unknown."); 
    if (config.locationT === undefined) config.location = 'msg';
    if (config.locationT === 'global') {
        let context = node.context().global;
        let exists = helper.getByString(context, location);
        if (exists !== undefined) {
            exists = helper.getByString(context,location + ".nbIterations");
            if (exists === undefined) return node.error("'location' is already used.");
            else settings = helper.getByString(context, location);
        }
    } else if (config.locationT === 'msg') {
        let exists = helper.getByString(data, location);
        if (exists !== undefined) {
            exists = helper.getByString(data,location + ".nbIterations");
            if (exists === undefined) return node.error("'location' is already used.");
            else settings = helper.getByString(data, location);
        }
    } else return node.error("Type of 'location' field is unknown.");

    //data.payload = {};
    //data.payload.conf = config;
    //data.payload.glob = node.context().global;

    if (loopType === "for") {
        if (settings.nbIterations === 0) {
            let varInitValue = config.forVarInitValue,
                runCondValue = config.forRunCondValue,
                incExprValue = config.forIncExprValue;

            settings.infos = {};
            settings.infos.loopType = loopType;

            // Verify init value
            if (varInitValue === undefined || varInitValue === "") return node.error("Variable init : incorrect value");
            else if (config.forVarInitValueT === "num") settings.infos.initValue = Number(varInitValue);
            else if (config.forVarInitValueT === "msg") {
                let newVal = helper.getByString(data, varInitValue);
                if (newVal === undefined || typeof newVal !== 'number') return node.error("Variable init : incorrect value");
                else settings.infos.initValue = Number(newVal);
            }
            else if (config.forVarInitValueT === "global") {
                let newVal = helper.getByString(node.context().global, varInitValue);
                if (newVal === undefined || typeof newVal !== 'number') return node.error("Variable init : incorrect value");
                else settings.infos.initValue = Number(newVal);
            }

            // Verify running condition value 
            if (runCondValue === undefined || runCondValue === "") return node.error("Running condition : incorrect value");
            else if (config.forRunCondValueT === "num") settings.infos.conditionValue = Number(runCondValue);
            else if (config.forRunCondValueT === "msg") {
                let newVal = helper.getByString(data, runCondValue);
                if (newVal === undefined || typeof newVal !== 'number') return node.error("Running condition : incorrect value");
                else settings.infos.conditionValue = Number(newVal);
            }
            else if (config.forRunCondValueT === "global") {
                let newVal = helper.getByString(node.context().global, runCondValue);
                if (newVal === undefined || typeof newVal !== 'number') return node.error("Running condition : incorrect value");
                else settings.infos.conditionValue = Number(newVal);
            }

            // Verify increment expression
            if (incExprValue === undefined || incExprValue === "") return node.error("Increment value : incorrect value");
            else if (config.forIncExprValueT === "num") settings.infos.incrementValue = Number(incExprValue);
            else if (config.forIncExprValueT === "msg") {
                let newVal = helper.getByString(data, incExprValue);
                if (newVal === undefined || typeof newVal !== 'number') return node.error("Increment value : incorrect value");
                else settings.infos.incrementValue = Number(newVal);
            }
            else if (config.forIncExprValueT === "global") {
                let newVal = helper.getByString(node.context().global, incExprValue);
                if (newVal === undefined || typeof newVal !== 'number') return node.error("Increment value : incorrect value");
                else settings.infos.incrementValue = Number(newVal);
            }

            // Verify logic
            if (settings.infos.initValue === settings.infos.conditionValue && config.forRunCondSign.indexOf("eq") === -1) return node.error("Initial value is running condition");
            else if (settings.infos.initValue <= settings.infos.conditionValue) {
                if (config.forRunCondSign.indexOf("min") === -1) return node.error("Unlogical running condition");
                else if (config.forRunCondSign === 'min') settings.infos.conditionSign = '<';
                else settings.infos.conditionSign = '<=';
            } 
            else if (settings.infos.initValue >= settings.infos.conditionValue) {
                if (config.forRunCondSign.indexOf("max") === -1) return node.error("Unlogical running condition");
                else if (config.forRunCondSign === 'max') settings.infos.conditionSign = '>';
                else settings.infos.conditionSign = '>=';
            }

            settings.value = settings.infos.initValue;
            settings.nbIterations += 1;
            if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
            else helper.setByString(data, location, settings);
            return node.send([data, undefined]);
        }
        else {
            settings.nbIterations += 1;
            if (settings.infos === undefined) return node.error("Undefined 'info' field in loop location.");
            else if (settings.infos.conditionSign === '<') {
                settings.value += settings.infos.incrementValue;
                if (settings.value >= settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '<=') {
                settings.value += settings.infos.incrementValue;
                if (settings.value > settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '>') {
                settings.value -= settings.infos.incrementValue;
                if (settings.value <= settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '>=') {
                settings.value -= settings.infos.incrementValue;
                if (settings.value < settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }                
            }
            else return node.error("Undefined condition sign in loop location.");
        }
    }
    
    else if (loopType === "forof") {
        if (settings.nbIterations === 0) {
            let mainObject = config.forofObject,
                myObj = [];

            settings.infos = {};
            settings.infos.loopType = loopType;

            // Verify object : on enregistre le chemin de l'objet.
            if (mainObject === undefined || typeof mainObject !== "string") return node.error("Main object : unknown");
            else if (config.forofObjectT === "msg") {
                let newVal = helper.getByString(data, mainObject);
                if (newVal === undefined || typeof newVal !== 'object' || newVal.length === undefined) return node.error("Main object : not an object");
                else myObj = newVal;
            }
            else if (config.forofObjectT === "global") {
                let newVal = helper.getByString(node.context().global, mainObject);
                if (newVal === undefined || typeof newVal !== 'object' || newVal.length === undefined) return node.error("Main object : not an object");
                else myObj = newVal;
            }

            settings.infos.values = myObj;
            settings.value = myObj[0];

            settings.nbIterations += 1;

            if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
            else helper.setByString(data, location, settings);

            return node.send([data, undefined]);
        }
        else {
            if (settings.infos === undefined) return node.error("Undefined 'info' field in loop location.");
            else 
            {
                if (settings.nbIterations >= settings.infos.values.length) {
                    settings.infos.values[settings.nbIterations-1] = settings.value;
                    let mainObject = config.forofObject;
                    if (config.forofObjectT === "msg") helper.setByString(data, mainObject, settings.infos.values);
                    else newVal = helper.setByString(node.context().global, mainObject, settings.infos.values);

                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);

                    return node.send([undefined,data]);
                }
                else {
                    settings.infos.values[settings.nbIterations-1] = settings.value;
                    settings.value = settings.infos.values[settings.nbIterations];
                    settings.nbIterations += 1;

                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
        }
    }

    else if (loopType === "forin") {
        if (settings.nbIterations === 0) {
            let mainObject = config.forinObject,
                myObj = {};

            settings.infos = {};
            settings.infos.loopType = loopType;

            // Verify object : on enregistre le chemin de l'objet.
            if (mainObject === undefined || typeof mainObject !== "string") return node.error("Main object : unknown");
            else if (config.forinObjectT === "msg") {
                let newVal = helper.getByString(data, mainObject);
                if (newVal === undefined || typeof newVal !== 'object' || newVal.length !== undefined) return node.error("Main object : not an object");
                else myObj = newVal;
            }
            else if (config.forinObjectT === "global") {
                let newVal = helper.getByString(node.context().global, mainObject);
                if (newVal === undefined || typeof newVal !== 'object' || newVal.length !== undefined) return node.error("Main object : not an object");
                else myObj = newVal;
            }
            let properties = [],
                values = [];

            for (let name in myObj) {
                properties.push(name);
                values.push(myObj[name]);
            }

            settings.infos.properties = properties;
            settings.infos.values = values;

            settings.property = properties[0];
            settings.value = values[0];

            settings.nbIterations += 1;

            if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
            else helper.setByString(data, location, settings);

            return node.send([data, undefined]);
        }
        else {
            if (settings.infos === undefined) return node.error("Undefined 'info' field in loop location.");
            else 
            {
                settings.value += 1;

                if (settings.nbIterations >= settings.infos.properties.length) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                }
                else {
                    let mainObject = config.forinObject;
                    if (config.forinObjectT === "msg") helper.setByString(data, mainObject + '.' + settings.property, settings.value);
                    else newVal = helper.setByString(node.context().global, mainObject + '.' + settings.property, settings.value);

                    settings.property = settings.infos.properties[settings.nbIterations];
                    settings.value = settings.infos.values[settings.nbIterations];
                    settings.nbIterations += 1;

                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
        }
    }

    else if (loopType === "while") {
        if (settings.nbIterations === 0) {

            let varInitValue = config.whileVarInitValue,
                runCondValue = config.whileRunCondValue,
                newValInit = "",
                newValRun = "";
            settings.infos = {};
            settings.infos.loopType = loopType;

            // Verify init value
            if (varInitValue === undefined || varInitValue === "") return node.error("Variable init : incorrect value");
            else {
                if (config.whileVarInitValueT === "msg") newValInit = helper.getByString(data, varInitValue);
                else newValInit = helper.getByString(node.context().global, varInitValue);

                if (newValInit === undefined) return node.error("Variable init : incorrect value");

                if (typeof newValInit === 'number') settings.infos.varInitValue = Number(newValInit);
                else if (typeof newValInit === 'boolean' || typeof newValInit === 'string') settings.infos.varInitValue = newValInit;
                else return node.error("Variable init : incorrect value");
            }

            // Verify running condition value 
            if (runCondValue === undefined || runCondValue === "") return node.error("Running condition : incorrect value");
            else if (config.whileRunCondSign === "istrue") settings.infos.conditionValue = true;
            else if (config.whileRunCondSign === "isfalse") settings.infos.conditionValue = false;
            else {
                if (config.whileRunCondValueT === "msg") newValRun = helper.getByString(data, runCondValue);
                else if (config.whileRunCondValueT === "global") newValRun = helper.getByString(node.context().global, runCondValue);
                else if (config.whileRunCondValueT === "num") newValRun = Number(runCondValue);
                else newValRun = runCondValue;

                if (newValRun === undefined) return node.error("Running condition : incorrect value");
                if (typeof newValRun === 'number') settings.infos.conditionValue = Number(newValRun);
                else if (typeof newValRun === 'boolean') settings.infos.conditionValue = newVal;
                else return node.error("Running condition : incorrect value");
            }

            // Verify logic
            if (config.whileRunCondSign === 'eq') settings.infos.conditionSign = '==';
            else if (config.whileRunCondSign === 'neq') settings.infos.conditionSign = '!=';
            else {
                if (typeof newValRun === 'boolean') return node.error("Running condition : incorrect sign");
                else if (config.whileRunCondSign === 'min') settings.infos.conditionSign = '<';
                else if (config.whileRunCondSign === 'eqmin') settings.infos.conditionSign = '<=';
                else if (config.whileRunCondSign === 'max') settings.infos.conditionSign = '>';
                else if (config.whileRunCondSign === 'eqmax') settings.infos.conditionSign = '>=';
            }
            
            settings.value = settings.infos.varInitValue;
        }
        else {
            let varInitValue = config.whileVarInitValue;
            if (config.whileVarInitValueT === "msg") settings.value = helper.getByString(data, varInitValue);
            else settings.value = helper.getByString(node.context().global, varInitValue);
        }

        settings.nbIterations += 1;

        if (settings.infos === undefined) return node.error("Undefined 'info' field in loop location.");
        else if (settings.infos.conditionValue === true || settings.infos.conditionValue === false) {
            if (settings.value !== settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }
        }
        else if (settings.infos.conditionSign === '<') {
            if (settings.value >= settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }
        }
        else if (settings.infos.conditionSign === '<=') {
            if (settings.value > settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }
        }
        else if (settings.infos.conditionSign === '>') {
            if (settings.value <= settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }
        }
        else if (settings.infos.conditionSign === '>=') {
            if (settings.value < settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }                
        }
        else if (settings.infos.conditionSign === '==') {
            if (settings.value !== settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }                
        }
        else if (settings.infos.conditionSign === '!=') {
            if (settings.value === settings.infos.conditionValue) {
                if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                else helper.setByString(data, location, undefined);
                return node.send([undefined,data]);
            } else {
                if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                else helper.setByString(data, location, settings);
                return node.send([data, undefined]);
            }                
        }
        else return node.error("Undefined condition sign in loop location.");
    }

    else if (loopType === "dwhile") {
        if (settings.nbIterations === 0) {

            let varInitValue = config.dwhileVarInitValue,
                runCondValue = config.dwhileRunCondValue,
                newValInit = "",
                newValRun = "";

            settings.infos = {};
            settings.infos.loopType = loopType;

            // Verify init value
            if (varInitValue === undefined || varInitValue === "") return node.error("Variable init : incorrect value");
            else {
                if (config.dwhileVarInitValueT === "msg") newValInit = helper.getByString(data, varInitValue);
                else newValInit = helper.getByString(node.context().global, varInitValue);

                if (newValInit === undefined) return node.error("Variable init : incorrect value");

                if (typeof newValInit === 'number') settings.infos.varInitValue = Number(newValInit);
                else if (typeof newValInit === 'boolean' || typeof newValInit === 'string') settings.infos.varInitValue = newValInit;
                else return node.error("Variable init : incorrect value");
            }

            // Verify running condition value 
            if (runCondValue === undefined || runCondValue === "") return node.error("Running condition : incorrect value");
            else if (config.dwhileRunCondSign === "istrue") settings.infos.conditionValue = true;
            else if (config.dwhileRunCondSign === "isfalse") settings.infos.conditionValue = false;
            else {
                if (config.dwhileRunCondValueT === "msg") newValRun = helper.getByString(data, runCondValue);
                else if (config.dwhileRunCondValueT === "global") newValRun = helper.getByString(node.context().global, runCondValue);
                else if (config.dwhileRunCondValueT === "num") newValRun = Number(runCondValue);
                else newValRun = runCondValue;

                if (newValRun === undefined) return node.error("Running condition : incorrect value");
                if (typeof newValRun === 'number') settings.infos.conditionValue = Number(newValRun);
                else if (typeof newValRun === 'boolean') settings.infos.conditionValue = newVal;
                else return node.error("Running condition : incorrect value");
            }

            // Verify logic
            if (config.dwhileRunCondSign === 'eq') settings.infos.conditionSign = '==';
            else if (config.dwhileRunCondSign === 'neq') settings.infos.conditionSign = '!=';
            else {
                if (typeof newValRun === 'boolean') return node.error("Running condition : incorrect sign");
                else if (config.dwhileRunCondSign === 'min') settings.infos.conditionSign = '<';
                else if (config.dwhileRunCondSign === 'eqmin') settings.infos.conditionSign = '<=';
                else if (config.dwhileRunCondSign === 'max') settings.infos.conditionSign = '>';
                else if (config.dwhileRunCondSign === 'eqmax') settings.infos.conditionSign = '>=';
            }
            
            settings.value = settings.infos.varInitValue;
            settings.nbIterations += 1;
            if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
            else helper.setByString(data, location, settings);
            return node.send([data, undefined]);
        }
        else {
            settings.nbIterations += 1;
            let varInitValue = config.dwhileVarInitValue;
            if (config.dwhileVarInitValueT === "msg") settings.value = helper.getByString(data, varInitValue);
            else settings.value = helper.getByString(node.context().global, varInitValue); 

            if (settings.infos === undefined) return node.error("Undefined 'info' field in loop location.");
            else if (settings.infos.conditionValue === true || settings.infos.conditionValue === false) {
                if (settings.value !== settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '<') {
                if (settings.value >= settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '<=') {
                if (settings.value > settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '>') {
                if (settings.value <= settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }
            }
            else if (settings.infos.conditionSign === '>=') {
                if (settings.value < settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }                
            }
            else if (settings.infos.conditionSign === '==') {
                if (settings.value !== settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }                
            }
            else if (settings.infos.conditionSign === '!=') {
                if (settings.value === settings.infos.conditionValue) {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, undefined);
                    else helper.setByString(data, location, undefined);
                    return node.send([undefined,data]);
                } else {
                    if (config.locationT === "global") helper.setByString(node.context().global, location, settings);
                    else helper.setByString(data, location, settings);
                    return node.send([data, undefined]);
                }                
            }
            else return node.error("Undefined condition sign in loop location.");
        }
    }
    else return node.error("Type of loop is unknown.");
}