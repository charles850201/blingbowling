/**
 * New node file
 */
require('./cnf/global');
 
var express = require('express')
  , dispatcher = require('./routes/dispatcher')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 16100);
  //app.set('views', __dirname + '/views');
  //app.set('view engine', 'jade');
  //app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  //app.use(express.methodOverride());
  //app.use(app.router);
  //app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

http.globalAgent.maxSockets = 10;

app.post('/protocolx.php?',dispatcher.dispatch);
app.get('/protocolx.php',dispatcher.dispatch);

var server = http.createServer(app);

//module.parent는 현재 실행된 모듈 프로세스의 부모가 있는 지 확인할 수 있는 속성입니다. 이를 이용하여 최초 실행되는 프로세스만 서버를 실행합니다.
if (!module.parent) {
	server.listen(app.get('port'), function(){
	  console.log("Express server %d listening on port %d", process.pid, app.get('port'));
	});
}
else {
	module.exports = server;
	console.log("server id    : " + process.pid);
}

process.on('uncaughtException', function (error) {
   _logger.log({data : "Exception", err : error.stack}, "error");
});