var mysql = require('mysql');
var pool  = mysql.createPool({
  host     : '192.168.0.43',
  user     : 'root',
  password : 'tkfkdgody',
  database : 'dcross_test',
  connectionLimit : 10,
//  waitForConnections : false,
  multipleStatements : true
});

exports.mysql = mysql;
exports.pool = pool;