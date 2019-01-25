const helper = require('node-red-viseo-helper');
const request = require('request-promise');
const XLSX = require('xlsx');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
  const register = function (config) {
    RED.nodes.createNode(this, config);
    let node = this;
  
    this.on('input', (data) => { input(RED, node, data, config) });
  }
  RED.nodes.registerType("file-xlsx", register, {});
}

async function input(RED, node, data, config) {
   
  let action = config.action || 'set';
  let res = "";

  let workbook = helper.getContextValue(RED, node, data, config.workbook, config.workbookType);
  let worksheet = helper.getContextValue(RED, node, data, config.worksheet, config.worksheetType);
  let range = helper.getContextValue(RED, node, data, config.range, config.rangeType);

  let parameters = {
    workbook: workbook,
    worksheet: worksheet,
    data: {},
    range: range,
    usedRange: "",
    cells: []
  }

  try  {

    // Get data
    if (config.save) {
      let saved = helper.getContextValue(RED, node, data, config.saveloc || '_sheet', config.savelocType);
      if (saved) {
        parameters.data = saved.data;
        parameters.cells = saved.cells;
        parameters.usedRange = saved.usedRange;
      }
    }
    if (!parameters.cells || typeof parameters.cells !== "object" || parameters.cells.length <= 0) {
      
      let sheets = XLSX.readFile(workbook);
      if (!sheets.Sheets || !sheets.Sheets[worksheet]) throw ({error: "Worksheet's name or ressource was not found"});
      else parameters.data = sheets;
      
      sheets = JSON.parse(JSON.stringify((sheets.Sheets[worksheet])));
      parameters.usedRange = sheets["!ref"];
      delete sheets["!ref"];

      
      let res = (parameters.usedRange) ?  getValues(parameters.usedRange, sheets) : [];
      if (config.save) {
        helper.setContextValue(RED, node, data, config.saveloc || '_sheet', {usedRange : parameters.usedRange, cells: res, data: parameters.data}, config.savelocType);
      }
      parameters.cells = [];
      for (let ob of res) parameters.cells.push(Array.from(ob));
      
    }

    if (action === "get" || action === "cell") {

      res = (action === "cell") ? getCell(RED, node, data, parameters.cells, config) : getData(node, parameters.cells, config);
      if (res.error) throw (res.error);
    }
    else {

      let wb = parameters.data;
      wb.Sheets[parameters.worksheet] = {};
      res = 200;

      if (action === "set") {
        let sheet = getInput(RED, node, data, config, parameters);
        
        if (sheet.error) throw (res.error);
        wb.Sheets[parameters.worksheet] = sheet
        XLSX.writeFile(wb, workbook);        
      }
    }

  }
  catch(ex) {
    node.warn(ex);
    helper.setContextValue(RED, node, data, config.output || "payload" , { "error": ex}, config.outputType);
    return node.send(data);
  }

  helper.setContextValue(RED, node, data, config.output || "payload" , res, config.outputType);
  return node.send(data);

}


function getCell(RED, node, data, ol_cells, config) {
  let cells = new Array();
  for (let e of ol_cells) cells.push(e);

  let cell_l =helper.getContextValue(RED, node, data, config.cell_l, config.cell_lType);
  let cell_c =helper.getContextValue(RED, node, data, config.cell_c, config.cell_cType);

  if (!cell_l || !cell_c) {
    return {"error": "Cannot find line and column labels"};
  }

  let indexCol = cells[0].indexOf(cell_c);
  if (indexCol === -1) return {"error": "Not found"}
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

function getInput(RED, node, data, config, parameters) {
 // Get input fields
 let rows = helper.getContextValue(RED, node, data, config.input || "payload", config.inputType);

 let values = [];
 let result = [];

 if (!rows || rows.length < 1) {
     return { error : "Input object is empty" };
 } 

 // Set basic parameters

 let fields = (config.selfields[0]) ? Array.from(config.selfields) : undefined;
     
 // If the input is an array
 if (Array.isArray(rows) && rows.length > 0){ 
     if (Array.isArray(rows[0])) {
       result = rows;
     }
     else if (config.fields === "all") {
        for (obj of rows) values.push(returnValue(obj, '').values);
        if (config.line) values.unshift(returnValue(rows[0], '').keys);
        if (config.column) for (let i=0; i<values; i++) elt.unshift(i);
         
         result = values;
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

      if (config.line) values.unshift(fields);
      if (config.column) {
          if (config.line) values[0].unshift("Elements")
          for (let i=1; i<values; i++) values[i].unshift(i-1);
      }
         
      result = values;
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

        if (config.line) values.unshift(returnValue(rows[labels[0]], '').keys);
        if (config.column) {
            if (config.line) {
                values[0].unshift("Elements")
                for (let i=0; i<labels.length; i++) values[i+1].unshift(labels[i]);
            }
            else for (let i=0; i<labels.length; i++) values[i].unshift(labels[i]);
        }
         
         result = values;
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


      if (config.line) values.unshift(fields);
      if (config.column) {
          if (config.line) {
              values[0].unshift("Elements");
              for (let i=0; i<labels.length; i++) values[i+1].unshift(labels[i]);
          }
          else for (let i=0; i<labels.length; i++) values[i].unshift(labels[i]);
      }
        
        result = values;
    }
 }

 if (result.length === 0 || result[0].length === 0) {
   return {error : "No data found"};
 }

  let range = (parameters.range) ? parameters.range.split(':')[0] + ':' : "A1:";
  let letter = range.match(/[A-B]+/)[0];
  let indexL = (letter.length === 1) ? letter.charCodeAt(0) : letter.charCodeAt(1);
  let offset = 'A'.charCodeAt(0);

  let letters = [];
  let sheet = {};

  for (let l of result[0]) {
    letters.push(letter);
    indexL ++;
    if (indexL <= (offset + 25)) {
      letter = (letter.length === 1) ? "" : letter[0];
      letter += String.fromCharCode(indexL);
    }
    else {
      letter = (letter.length === 1) ? 'A' : String.fromCharCode(letter[0].charCodeAt(0) + 1);
      letter += 'A';
      indexL = offset;
    }
  }
  letters.push(letter);

  let nbMin = Number(range.match(/[0-9]+/)[0]);

  for (let i=0; i < result.length; i++) {
    for (let j=0; j < letters.length; j++) {
      sheet[letters[j]+String(i+nbMin)] = {
        v: result[i][j],
        t: (typeof result[i][j] === "string") ? 's' : 'n'
      }
    }
  }

  sheet["!ref"] = range + letters[letters.length-1] + String(nbMin + result.length);
 return sheet;
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

function getValues(range, data) {
  range = range.split(':')

  let end = range[1].match(/[A-Z]+/)[0];
  let letter  = range[0].match(/[A-Z]+/)[0];
  let letters = [letter];

  do {
    let len = letter.length;
    if (letter[len - 1] === 'Z') {
      let newWord = ""
      for (let l=(letter.length-1); l>=0; l--) {
        if (letter[l] === 'Z') newWord += (l===0) ? 'AA' : 'A';
        else {
          newWord = String.fromCharCode(1 + letter[l].charCodeAt()) + newWord;
          break;
        }
      }
      letter = newWord;
    }
    else {
      letter = letter.substring(0, len - 1) + String.fromCharCode(letter[len - 1].charCodeAt() + 1);
    }
    letters.push(letter);
  } while (letter !== end);

  let nb_s = Number(range[0].match(/[0-9]+/)[0]);
  let nb_e = Number(range[1].match(/[0-9]+/)[0]);
  let res = [];

  for (let i=nb_s; i<nb_e+1; i++) {
    let row = [];
    for (let l of letters) {
      if (data[l + String(i)]) row.push(data[l + String(i)].v)
    };
    res.push(row);
  }

  return res;
}