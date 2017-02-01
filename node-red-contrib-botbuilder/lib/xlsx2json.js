const fs   = require('fs')
const xlsx = require('node-xlsx')

let input  = process.argv[2]
let output = process.argv[3]
let json   = {}

const workbook = xlsx.parse(input);
for (let row of workbook[0].data){
    let key   = row[0]
    let value = row[1]
    json[key] = value
}

let str = JSON.stringify(json,undefined,2)
fs.writeFileSync(output, str, 'utf8');