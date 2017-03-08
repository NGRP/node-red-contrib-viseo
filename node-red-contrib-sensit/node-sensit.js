const request = require('request');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("sensit", register, {});
}



const input = (node, data, config) => {

var getURLParameter = function (url, name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url) || [null, ''])[1].replace(/\+/g, '%20')) || null;
} 

var baseUrl = 'https://api.sensit.io/v1/devices/'+config.device+'/sensors/'+config.sensor;


if ( config.startdate !== "" || config.enddate !== "") {

// If date specified - need to iterate in all pages
let d = [];
let gotonext = 1;
if ( config.startdate == "")   {

    config.startdate = "1970-01-01T12:00Z"
}

if ( config.enddate == "")   {

    config.enddate = new Date().getTime();
}

const startdate = new Date(config.startdate);
const enddate = new Date(config.enddate);

let req = {
        url: baseUrl,
        method: 'GET',
        headers: {'Authorization': 'Bearer '+config.token }
    }

// First req to get last data and page then iterate.

    let cb = (err, response, body) => {
        if (err) return node.send({'payload' : err});

       node.log(req.url);
       let firstpage = getURLParameter(JSON.parse(body).links.first, "page");
       let lastpage = getURLParameter(JSON.parse(body).links.last, "page");
       let nextpage = 1;
       let currentpage = 1;
       if (firstpage !== lastpage) {
        if (typeof JSON.parse(body).links.next === 'undefined') {
            currentpage = lastpage;
            nextpage = lastpage;
        
        } else {
            nextpage = getURLParameter(JSON.parse(body).links.next, "page");
            currentpage = (nextpage-1)
            
        }
       }
       
       for(let value of JSON.parse(body).data.history){
            let current = new Date(value.date);
        // if (current > midnight && current < morning) {
            if (current > startdate) {  
            
            if (current < enddate && current > startdate) {
            
                d.push(value);
            }
            } else {

                gotonext = 0;
                break;
            }
        
         }

       if (gotonext == 1 && nextpage > currentpage) {


            req.url = baseUrl+'?page='+nextpage;
            request(req, cb);
       } else {
           data = JSON.parse(body);
           data.data.history = d;
        let json = { payload : data.data};
        extend(true, data, json);
        node.send(data);
       }  


        
    }
    request(req, cb);

} else {

let req = {
        url: baseUrl,
        method: 'GET',
        headers: {'Authorization': 'Bearer '+config.token }
    }

// Else last results (first page)

    let cb = (err, response, body) => {
        if (err) return node.send({'payload' : err});

        let json = { payload : JSON.parse(body).data };
        extend(true, data, json);
        node.send(data);
    }

    request(req, cb);

   } 

}
    