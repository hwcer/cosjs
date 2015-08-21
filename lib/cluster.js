var cluster = require('cluster');
var start = false;
var workers = {};
//添加子进程
exports.fork = function(key,task,num){
    workers[key] = {"task":task,"num":num ||1 }
}
//启动所有进程
exports.start = function () {
    if(start){
        throw new Error('fork already start');
    }
    start = true;
    if (cluster.isMaster) {
        for(var k in workers){
            master(k,workers[k]['num']);
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
        worker['cosjs'] = {"key":key};
        console.log(worker);
    }
}

var worker = function(){
    var id  = cluster.worker['id'];
    var key = process.env["key"] || false;
    console.log('worker[' + id + '] start');
    if(!key || !workers[key]){
        return false;
    }
    var task = workers[key]['task'];
    if(typeof task == 'function' ){
        task();
    }
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