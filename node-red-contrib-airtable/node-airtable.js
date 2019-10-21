const helper = require("node-red-viseo-helper");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    let node = this;

    node.status({ fill: "red", shape: "ring", text: "Missing credential" });
    if (config.auth) {
      let auth = RED.nodes.getNode(config.auth);
      if (!auth.app) return;
      config.app = auth.app;
      node.status({});
    }

    node.on("input", data => {
      input(RED, node, data, config);
    });
  };
  RED.nodes.registerType("node-airtable", register, {});
};

async function input(RED, node, data, config) {
  // Log activity
  /*
  try {
    setTimeout(function() {
      helper.trackActivities(node);
    }, 0);
  } catch (err) {
    console.log(err);
  }*/
  let results;

  function resolveParameter(name) {
    return helper.getContextValue(
      RED,
      node,
      data,
      config[name],
      config[name + "Type"]
    );
  }

  try {
    let airtableBase = config.app;
    let action = config.action;
    let table = resolveParameter("table");
    if (!table) throw "Table label missing";

    switch (action) {
      case "list":
        let filter = resolveParameter("filter");
        results = await listRecords(airtableBase, table, filter);
        break;
      case "get":
        let recordId = resolveParameter("record");
        results = await getRecord(airtableBase, table, recordId);
        break;
      case "post":
        let recordData = resolveParameter("record");
        results = await createRecords(airtableBase, table, recordData);
        break;
      case "put":
        let recordsData = resolveParameter("records");
        results = await putRecords(airtableBase, table, recordsData);
        break;
      case "delete":
        let recordsIds = resolveParameter("records");
        if (!recordsIds.length || recordsIds.length < 10) {
          results = await deleteRecords(airtableBase, table, recordsIds);
        }
        else {
          results = await deleteArraysOfRecords(airtableBase, table, recordsIds);
        }
        break;
    }

    helper.setByString(data, config.output || "payload", results);
    return node.send([data, null]);
  } catch (err) {
    node.error(err);
    return node.send([null, data]);
  }
}

async function listRecords(airtable, table, filter) {
  return new Promise((resolve, reject) => {
    let results = [];
    try {
      airtable(table)
        .select({ filterByFormula: filter })
        .eachPage(
          function page(records, fetchNextPage) {
            results = results.concat(records);
            // To fetch the next page of records, call `fetchNextPage`.
            // If there are more records, `page` will get called again.
            // If there are no more records, `done` will get called.
            fetchNextPage();
          },
          function done(err) {
            if (err) reject(err);
            results = cleanRecords(results);
            resolve(results);
          }
        );
    } catch (err) {
      reject(err);
    }
  });
}

async function getRecord(airtable, table, recordId) {
  return new Promise((resolve, reject) => {
    try {
      airtable(table).find(recordId, function(err, record) {
        if (err) reject(err);
        record = cleanRecords(record);
        resolve(record);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function createRecords(airtable, table, recordData) {
  return new Promise((resolve, reject) => {
    try {
      airtable(table).create(recordData, function(err, records) {
        if (err) reject(err);
        records = cleanRecords(records);
        resolve(records);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function putRecords(airtable, table, recordsData) {
  return new Promise((resolve, reject) => {
    try {
      airtable(table).update(recordsData, function(err, records) {
        if (err) reject(err);
        records = cleanRecords(records);
        resolve(records);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function deleteRecords(airtable, table, recordsIds) {
  return new Promise((resolve, reject) => {
    try {
      airtable(table).destroy(recordsIds, function(err, deletedRecords) {
        if (err) reject(err);
        deletedRecords = cleanRecords(deletedRecords);
        resolve(deletedRecords);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function deleteArraysOfRecords(airtable, table, recordsIds) {
    try {
      let results = [];
      let arrayOfRecordsIds = [];
      let tempArrayOfTen = [];
      for (recordId of recordsIds) {
        tempArrayOfTen.push(recordId);
        if (tempArrayOfTen.length >= 10) {
          arrayOfRecordsIds.push(tempArrayOfTen);
          tempArrayOfTen =[];
        }
      }
      for (let array of arrayOfRecordsIds) {
        
        let res = await deleteRecords(airtable, table, array);
        results.push(res);
      }
      return results;
    } catch (err) {
      throw(err)
    }
}

function cleanRecords(records) {
  if (records.length) {
    let results = [];
    records.forEach(function(record) {
      results.push({
        id: record.id,
        fields: record.fields
      });
    });
    return results;
  } else {
    let record = {
      id: records.id,
      fields: records.fields
    };
    return record;
  }
}
