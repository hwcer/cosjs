//简介高效的群集模块
var util = require('util');
var cluster = require('cluster');
var workers = {};
//添加子进程,time:false || [STime,ETime]
exports.fork = function(key, num, fun){
    workers[key] = { "num":num,"fun":fun};
}
//启动所有进程,调用start之后不要再执行任何代码
exports.start = function () {
    if (cluster.isMaster) {
        onMaster();
    }
    else if (cluster.isWorker) {
        onWorker();
    }
}

//fork子进程
var onFork = function(key,num){
    if(!key || !workers[key]){
        return console.log('error:cluster.master args[key] empty');
    }

    if(!num){
        return ;
    }
    var env = {"key":key};
    for(var i=0;i<num;i++){
        var worker = cluster.fork(env);
        worker['key'] = key;
    }
}

var onWorker = function(){
    var id  = cluster.worker['id'];
    var key = process.env["key"] || false;
    if(!key || !workers[key]){
        return false;
    }
    process.on('message',function(msg){
        if(worker_command[msg]){
            worker_command[msg]();
        }
    })
    var fun = workers[key]['fun'];
    if(typeof fun == 'function' ){
        fun();
    }
}

//master启动时
var onMaster = function() {
    cluster.on('exit', function (worker, code, signal) {
        var id = worker['id'];
        var key = worker['key'] || false;
        delete(cluster.workers.id);
        util.log(util.format('exit:worker[%d], key:%s, pid:%d, code:%s, signal:%s', id, key, worker.process.pid,code||0, signal ||0));
        if(code!=0){
            onFork(key, 1);
        }
    });
    cluster.on('disconnect', function (worker) {
        var id = worker['id'];
        var key = worker['key'] || false;
        util.log(util.format('disconnect:worker[%d], key:%s, pid:%d', id, key, worker.process.pid));
    });
    cluster.on('listening', function (worker, address) {
        var id = worker['id'];
        var key = worker['key'] || false;
        util.log(util.format('listening:worker[%d], key:%s, pid:%d, port:%d ', id, key, worker.process.pid, address.port));
    });

    cluster.on('message',function(msg){
        var arr = msg.split(' ');
        var cmd = arr.shift();
        if(master_command[cmd]){
            master_command[cmd](arr);
        }
    })

    for(var k in workers){
        var worker = workers[k];
        onFork(k,worker['num']);
    }

}


var master_command = {
    stop : function(args){
        var key = args[0];
        for(var k in cluster.workers){
            var worker = cluster.workers[k];
            if(key == worker.key){
                worker.send('exit');
            }
        }
    },

    start :  function(args){
        var key = args[0];
        var num = parseInt(args[1]) || 1;
        if(!workers[key]){
            return false;
        }
        onFork(key,num);
    },

    restart : function(args){
        var key = args[0];
        for(var k in cluster.workers){
            var worker = cluster.workers[k];
            if(key == worker.key){
                worker.send('restart');
            }
        }
    },
}


var worker_command = {
    exit : function(){
        process.exit();
    },
    stop : function(){
        process.exit();
    },
    restart : function(){
        process.exit(9999);
    },
}