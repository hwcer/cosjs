var cluster = require('cluster');
var workers = [];


//添加
exports.set = function(fun,num){
    if(!num){
        num = 1;
    }
    workers.push([fun,num]);
}

exports.start = function () {
    if (cluster.isMaster) {
        for(var k in workers){
            master(k,workers[k][1]);
        }
    }
    else if (cluster.isWorker) {
        worker();
    }
}




var master = function(key,num){
    var env = {"key":key};
    for(var i=0;i<num;i++){
        var worker = cluster.fork(env);
        worker['$key'] = key;
    }
}

var worker = function(){
    var id  = cluster.worker['id'];
    var key = process.env["key"] || false;
    console.log('worker[' + id + '] start');
    if(!key || !workers[key]){
        return false;
    }
    var fun = workers[key][0];
    if(typeof fun != 'function' ){
        return false;
    }
    fun();
}

//////////////////////////以下master中执行/////////////////////////////
var onExit = function(worker, code, signal) {
    var id = worker['id'];
    var key = worker['$key'] || false;
    delete(cluster.workers.id);
    console.log('worker[%d] Pid:%d exit (%s),task:%d', id, worker.process.pid, signal || code,key);
    master(key,1);
}

var onFork =function(worker) { }


cluster.on('exit', onExit);
cluster.on('fork', onFork);