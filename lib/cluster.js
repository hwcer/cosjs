//简介高效的群集模块 
var util = require('util'),
    cluster = require('cluster'),
    workers = {};

//添加子进程
exports.fork = function(key, num, fun){
    workers[key] = { "num":num, "fun":fun, "env":{}};
}
//启动所有进程,调用start之后不要再执行任何代码
exports.start = function () {
    if (cluster.isMaster) {
        masterStart();
    }
    else if (cluster.isWorker) {
        workerStart();
    }
}
//子进程间发送消息,key:进程标识
exports.send = function(key, cmd, msg){
    var data = JSON.stringify(Array.from(arguments));
    process.send(data);
}
//注册子进程消息处理入口
exports.message = function(cmd, fun){
    worker_command[cmd] = fun;
}
//退出/重启当前(子)进程,code>0 重启
exports.exit = function(code) {
    if (cluster.isMaster){
        return false;
    }
    try {
        var code = parseInt(code)||0;
        // make sure we close down within 30 seconds
        var killtimer = setTimeout(function () {
            process.exit(code);
        }, 2000);
        // But don't keep the process open just for that!
        killtimer.unref();
        // stop taking new requests.
        //serv.close();
        // Let the master know we're dead.  This will trigger a
        // 'disconnect' in the cluster master, and then it will fork
        // a new worker.
        cluster.worker.disconnect();
    }
    catch(e){
        console.log('cluster.worker.disconnect false');
    }
}


var workerStart = function(){
    var id  = cluster.worker['id'];
    var key = process.env["_key"] || false;
    if(!key || !workers[key]){
        return false;
    }
    process.on('message',function(data){
        var arr = JSON.parse(data);
        var key = arr.shift();
        var cmd = arr.shift();
        if(worker_command[cmd]){
            worker_command[cmd].apply(this,arr);
        }
    })

    var fun = workers[key]['fun'];
    if(typeof fun == 'function' ){
        fun();
    }
    else if(fun){
        var mod = require(fun);
        if(typeof mod == 'function' ){
            mod();
        }
    }
}

//master启动时
var masterStart = function() {
    cluster.on('exit', function (worker, code, signal) {
        var id = worker['id'];
        var key = worker['_key'] || false;
        delete(cluster.workers.id);
        util.log(util.format('exit:worker[%d], key:%s, pid:%d, code:%s, signal:%s', id, key, worker.process.pid,code||0, signal ||0));
        if(code > 0){
            forkSingleWorker(key, 1);
        }
    });
    cluster.on('disconnect', function (worker) {
        var id = worker['id'];
        var key = worker['_key'] || false;
        util.log(util.format('disconnect:worker[%d], key:%s, pid:%d', id, key, worker.process.pid));
    });
    cluster.on('listening', function (worker, address) {
        var id = worker['id'];
        var key = worker['_key'] || false;
        util.log(util.format('listening:worker[%d], key:%s, pid:%d, port:%d ', id, key, worker.process.pid, address.port));
    });

    cluster.on('message',function(data){
        var arr = JSON.tryParse(data);
        if(!arr){
            return console.log('cluster message error:',data);
        }
        var key = arr.shift();
        var cmd = arr.shift();

        if(cmd == 'start'){
            forkSingleWorker(key,parseInt(arr[2]||1) );
        }
        else{
            sendWorkerMessage(key,data);
        }
    })

    forkEveryWorker();
}


var forkEveryWorker = function(){
    for(var k in workers){
        var worker = workers[k];
        if(worker['num']){
            forkSingleWorker(k,worker['num']);
        }
    }
}
//fork子进程
var forkSingleWorker = function(key,num){
    if(!key || !workers[key]){
        return console.log('error:cluster.master args[key] empty');
    }
    var env = Object.clone(workers[key]['env']);
    env['_key'] = key;
    for(var i=0;i<num;i++){
        var worker = cluster.fork(env);
        worker['_key'] = key;
    }
}
//向子进程发送消息
var sendWorkerMessage = function(key,data){
    for(var k in cluster.workers){
        var worker = cluster.workers[k];
        if(key == worker['_key']){
            worker.send(data);
        }
    }
}


var worker_command = {
    exit : function(){
        exports.exit();
    },
    stop : function(){
        exports.exit();
    },
    restart : function(){
        exports.exit(1);
    },
}