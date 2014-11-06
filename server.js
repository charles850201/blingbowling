var http = require('http');
var port = process.env.port || 1337;

http.createServer(function (req, res) {

res.write('<p>Happy World!</p>');

res.end('<p>'+ process.env.Developer +'</p>');

}).listen(port);