/**
 * New node file
 */
var cluster = require('cluster');
var numCPUs = require('os').cpus().length * 2;
numCPUs = 1;

if (cluster.isMaster) { //최초 생성된 프로세스가 아닌 경우면
	for (var i = 0; i < numCPUs; i++) { //CPU 코어 개수만큼 fork()하여 자식 프로세스를 생성합니다.
		cluster.fork();
	}
	
	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' exit');
		cluster.fork();
	});
	
	cluster.on('online', function(worker) {
		console.log("worker %s (%s) online", worker.id, worker.process.pid);
	});
	
	cluster.on('listening', function(worker, address) {
		console.log("worker %s listening %s:%s", worker.id, address.address, address.port);
	});
} else {
	var server = require('./app');
	server.listen(16100);
}
 