const helper = require('node-red-viseo-helper');
const request = require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
  const register = function (config) {
    RED.nodes.createNode(this, config);
    let node = this;

    node.status({fill:"red", shape:"ring", text: 'Missing credential'});
    if (config.token) node.status({});
  
    this.on('input', (data) => { input(node, data, config) });
  }
  RED.nodes.registerType("ms-graph-excel", register, {});
}

async function input(node, data, config) {
  
  let token = config.token;
  if (config.tokenType !== 'str') {
    let loc = (config.tokenType === 'global') ? node.context().global : data;
    token = helper.getByString(loc, token);
  }
  if (!token) return node.error("Missing token");
  
  let action = config.action || 'set';
  let method = config.method || 'append';
  let outLoc =  (config.outputType === 'global') ? node.context().global : data;

  let saveLoc = "";
  let cells = [];

  let workbook = config.workbook;
  let worksheet = config.worksheet;
  let session = config.session;
  let range = config.range;

  if (config.sessionType !== 'str') {
    let loc = (config.sessionType === 'global') ? node.context().global : data;
    session = helper.getByString(loc, session);
  }
  if (config.workbookType !== 'str') {
    let loc = (config.workbookType === 'global') ? node.context().global : data;
    workbook = helper.getByString(loc, workbook);
  }
  if (config.worksheetType !== 'str') {
    let loc = (config.worksheetType === 'global') ? node.context().global : data;
    worksheet = helper.getByString(loc, worksheet);
  }
  if (range && config.rangeType !== 'str') {
      let loc = (config.rangeType === 'global') ? node.context().global : data;
      range = helper.getByString(loc, range);
  }

  let parameters = {
    workbook:  'https://graph.microsoft.com/v1.0/me/drive/root:/' + workbook + ':/workbook',
    worksheet: 'https://graph.microsoft.com/v1.0/me/drive/root:/' + workbook + ':/workbook/worksheets/' + worksheet,
    range: range,
    token: token,
    session: session
  }

  try  {
    if (action === "get" || action === "cell") {

      // Get all data
      if (config.save) {
        saveLoc = (config.savelocType === 'global') ? node.context().global : data;
        cells = helper.getByString(saveLoc, config.saveloc || '_sheet');
      }
      if (!cells || typeof cells !== "object" || cells.length <= 0) {

        if (!parameters.session) {
          let session = await openSession(parameters);
              parameters.session = session.id;
        }
        
        let res = await getRange(parameters);
            res = JSON.parse(res).values;
        if (config.save) helper.setByString(saveLoc, config.saveloc || '_sheet', res);
        cells = [];
        for (let ob of res) cells.push(Array.from(ob));
      }

      // Get final data
      let res = (action === "cell") ? getCell(node, cells, config) : getData(node, cells, config);
      
      if (res.error) throw (res.error);
      helper.setByString(outLoc, config.output || "payload", { "result": res, "session": parameters.session});
      return node.send(data);
    }

    if (!parameters.session) {
      let session = await openSession(parameters);
          parameters.session = session.id;
    }

    if (action === "clear" || (action === "set" && config.method === "new")) {

      let res = await clearRange(parameters);

      if (action === "clear") {
        helper.setByString(outLoc, config.output || "payload", { "result": 200, "session": parameters.session});
        return node.send(data);
      }
    }
    if (action === "set") {
      parameters.method = method;

      let res = getInput(node, data, config, parameters);
      if (res.error) throw (res.error);

      parameters.values = res.values;
      parameters.range = res.range;
      
      res = await setData(parameters);
      helper.setByString(outLoc, config.output || "payload", { "result": 200, "session": parameters.session});
      return node.send(data);
    }

  }
  catch(ex) {
    node.warn(ex);
    helper.setByString(outLoc, config.output || "payload", { "error": ex, "session": parameters.session});
    return node.send(data);
  }

}

function openSession(parameters) {
  let req = {
    method: "POST",
    uri:  parameters.workbook + '/createSession',
    headers: {
      'Authorization': 'Bearer ' + parameters.token
    },
    body: { 
      "persistChanges": true
    },
    json: true
  };

  return request(req);
}

function getRange(parameters) {

  let url = (parameters.range) ? "/range(address='" + parameters.range + "')" : '/UsedRange(valuesOnly=true)';

  let req = {
    method: "GET",
    uri:  parameters.worksheet + url,
    headers: {
      'Authorization': 'Bearer ' + parameters.token,
      'workbook-session-id': parameters.session
    }
  };

  return request(req);
}



function getCell(node, cells, config) {
    let cell_l = config.cell_l,
    cell_c = config.cell_c;

  if (config.cell_lType !== 'str') {
    let loc = (config.cell_lType === 'global') ? node.context().global : data;
    cell_l = helper.getByString(loc, cell_l);
  }
  if (config.cell_cType !== 'str') {
    let loc = (config.cell_cType === 'global') ? node.context().global : data;
    cell_c = helper.getByString(loc, cell_c);
  }

  if (!cell_l || !cell_c) {
    return {"error": "Cannot find line and column labels"};
  }

  let indexCol = cells[0].indexOf(cell_c);
  cells.shift();
  for (let l of cells) {
    if (l[0] === cell_l) {
      return l[indexCol];
    }
  }

  return {"error": "Not found"}
}

function getData(node, cells, config) {

  let lLabels = [];
  let cLabels = [];
  let result = {};

  if (config.line) {
    lLabels = cells.shift();
  }
  if (config.column) {
    if (config.line) lLabels.shift();
    for (let l of cells) {
      cLabels.push(l.shift());
    }
  }

  //return cells;
  if (!config.line && !config.column) return cells;
  if (config.line) {
    let cLen = (cLabels.length === 0) ? cells.length : cLabels.length;
    for (let i=0; i<lLabels.length; i++) {
      result[lLabels[i]] = {};
      let cArr = [];

      for (let j=0; j<cLen; j++) {
        if (config.column) result[lLabels[i]][cLabels[j]] = cells[j][i];
        else cArr.push(cells[j][i])
      }

      if (!config.column) result[lLabels[i]] = cArr;
    }
    return result;
  }

  for (let i=0; i<cLabels.length; i++) {
    result[cLabels[i]] = cells[i]; 
  }
  return result;
}

function clearRange(parameters) {

  let url = (parameters.range) ? "/range(address='" + parameters.range + "')" : '/UsedRange(valuesOnly=true)';
  
    let req = {
      method: "POST",
      uri:  parameters.worksheet + url + '/clear',
      headers: {
        'Authorization': 'Bearer ' + parameters.token,
        'workbook-session-id': parameters.session
      }
    };
  
    return request(req);

}

function setData(parameters) {

  let url = "/range(address='" + parameters.range + "')";

  let req = {
    method: "PATCH",
    uri:  parameters.worksheet + url,
    headers: {
      'Authorization': 'Bearer ' + parameters.token,
      'workbook-session-id': parameters.session
    },
    body: {
      values: parameters.values
    },
    json:true
  };

  return request(req);

}

function getInput(node, data, config, parameters) {
 // Get input fields
 let loc =  (config.inputType === 'global') ? node.context().global : data;
 let rows = helper.getByString(loc, config.input || "payload");
 let method = parameters.method;
 let result = {values: [], range: parameters.range}

 if (!rows || rows.length < 1) {
     result.error = "Input object is empty";
     return result;
 } 

 // Set basic parameters
 let values = [];
 let fields = (config.selfields[0]) ? Array.from(config.selfields) : undefined;
     
 // If the input is an array
 if (Array.isArray(rows) && rows.length > 0){ 
     if (Array.isArray(rows[0])) {
       result.values = rows;
     }
     else if (config.fields === "all") {
         for (obj of rows) values.push(returnValue(obj, '').values);
         if (method === "new") {
             if (config.line) values.unshift(returnValue(rows[0], '').keys);
             if (config.column) for (let i=0; i<values; i++) elt.unshift(i);
         }
         result.values = values;
     }
     else if (fields) {
         for (obj of rows){
             let res = returnValue(obj, '');
             let row = []; 
             for (field of fields) {
                 let i = res.keys.indexOf(field);
                 if (i > -1) row.push(res.values[i]);
             }
             values.push(row);
         }
         if (method === "new") {
             if (config.line) values.unshift(fields);
             if (config.column) {
                 if (config.line) values[0].unshift("Elements")
                 for (let i=1; i<values; i++) values[i].unshift(i-1);
             }
         }
         result.values = values;
     }
 }
 else if (typeof rows === 'object' && rows.length === undefined) {
     if (config.fields === "all") {
         let labels = [];

         for (obj in rows){
             let res = returnValue(rows[obj], '');
             values.push(res.values);
             labels.push(obj)
         }

         if (config.method === "new") {
             if (config.line) values.unshift(returnValue(rows[labels[0]], '').keys);
             if (config.column) {
                 if (config.line) {
                     values[0].unshift("Elements")
                     for (let i=0; i<labels.length; i++) values[i+1].unshift(labels[i]);
                 }
                 else for (let i=0; i<labels.length; i++) values[i].unshift(labels[i]);
             }
         }
         result.values = values;
     }
     else if (fields) {
         let labels = [];
         for (obj in rows){
             let res = returnValue(rows[obj], '');
             let row = []; 
             for (field of fields) {
                 let i = res.keys.indexOf(field);
                 if (i > -1) row.push(res.values[i]);
             }
             values.push(row);
             labels.push(obj);
         }

         if (method === "new") {
             if (config.line) values.unshift(fields);
             if (config.column) {
                 if (config.line) {
                     values[0].unshift("Elements");
                     for (let i=0; i<labels.length; i++) values[i+1].unshift(labels[i]);
                 }
                 else for (let i=0; i<labels.length; i++) values[i].unshift(labels[i]);
             }
         }
         result.values = values;
     }
 }

 if (result.values.length === 0 || result.values[0].length === 0) {
   result.error = "No data found";
   return result;
 }

 if (!parameters.range) {
   result.range = "A1:";
   let offset = 'A'.charCodeAt(0);
   let letter = result.values[0].length -1;

   if (letter <= 25) result.range += String.fromCharCode(offset + letter) ;
   else {
     let pos = parseInt(letter / 26) -1;
     let mod = letter % 26;
     result.range += String.fromCharCode(offset + pos) + String.fromCharCode(offset + mod);
   }

   result.range += result.values.length;
 }

 return result;
}

function returnValue(obj, chaine) {
  let keys = [], values = [];
  for (let i in obj) {
      if (typeof obj[i] === "object" && obj[i].length === undefined) {
          let res = returnValue(obj[i], chaine + '.' + i);
          keys = keys.concat(res.keys);
          values = values.concat(res.values);
      }
      else {
          keys.push((chaine + '.' + i).substring(1));
          values.push(obj[i]);
      }
  }
  return { keys: keys, values: values} ;
}