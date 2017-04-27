//群集模块
var util     = require('util');
var library   = require('cosjs.library');
var cluster  = require('cluster');
var workers  = [];

process.setMaxListeners(0);
//添加子进程，handle：function,或者一个脚本路径
exports.fork = function(name,handle){
    var handleArgs = Array.prototype.slice.call(arguments,2);
    var handleConfig = {  "id": 0, "name":name, "handle": handle,"handleArgs": handleArgs };
    workers.push(handleConfig);
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


exports.on = exports.subscribe = function(name,callback){
    if (!cluster.isWorker){
        return false;
    }
    name = 'cosjs' + name;
    var key = cluster.worker.key;
    var arr = ['subscribe',key,name];
    var msg = JSON.stringify(arr);
    process.on(name,callback);
    process.send(msg);
}

exports.emit = exports.publish = function(name,message){
    if (!cluster.isWorker){
        return false;
    }
    var arr = Array.from(arguments);
    arr[0] = 'cosjs' + arr[0];
    arr.unshift('publish');
    var msg = JSON.stringify(arr);
    process.send(msg);
}

//重启当前子进程,在子进程中执行
exports.restart = function(ms) {
    if (!cluster.isWorker){
        return false;
    }
    try {
        var killtimer = setTimeout(function () {
            process.exit();
        }, ms||1000);
        killtimer.unref();
        cluster.worker.disconnect();
    }
    catch(e){
        console.log('cluster.worker.disconnect false');
    }
}



function workerStart(){
    workerMessage();
    var key = process.env["key"] || false;
    if(!workers[key]){
        return false;
    }
    cluster.worker.key = key;
    var config = workers[key];
    var handle = config['handle'];
    var method = null;
    if(typeof handle == 'function' ){
        method = handle;
    }
    else{
        method = require(handle);
    }
    if(typeof method == 'function' ){
        method.apply(null,config['handleArgs']);
    }
}

//master启动时
function masterStart() {
    cluster.on('message',masterMessage);
    cluster.on('exit', function (worker, code, signal) {
        var id = worker['id'];
        var key = worker['key'];
        var config = workers[key];
        delete(cluster.workers.id);
        util.log(util.format('exit:worker[%d], name:%s, pid:%d, code:%s, signal:%s', id, config['name'], worker.process.pid,code||0, signal||0));
        config['id'] = 0;
        forkWorker(key);
    });
    cluster.on('disconnect', function (worker) {
        var id = worker['id'];
        var key = worker['key'];
        var config = workers[key];
        util.log(util.format('disconnect:worker[%d], name:%s, pid:%d', id, config['name'], worker.process.pid));
    });
    cluster.on('listening', function (worker, address) {
        var id = worker['id'];
        var key = worker['key'];
        var config = workers[key];
        util.log(util.format('listening:worker[%d], name:%s, pid:%d, port:%d ', id, config['name'], worker.process.pid, address.port));
    });
    //启动所有进程
    for(var key in workers){
        forkWorker(key);
    }
}

//启动进程
function forkWorker(key){
    var config = workers[key] || null;
    if( !config || config.id >0 ){
        return;
    }
    var worker = cluster.fork({key:key});
    worker.key = key;
    config['id'] = worker.id;
}



function publish(arr){
    process.emit(arr[0],arr);
}

function subscribe(arr){
    var key = arr[0],event = arr[1];
    var config = workers[key];
    if(!config){
        return false;
    }
    process.on(event,handleMessage.bind(null,key) );
}


function handleMessage(key,arr) {
    var config = workers[key];
    if( !config || !config.id){
        return ;
    }
    var worker = cluster.workers[config.id];
    if(worker){
        try {
            worker.send(JSON.stringify(arr));
        }
        catch (e){
            console.log(e);
        }
    }
}

function workerMessage(){
    process.on('message',function(msg){
        var arr = library('json').parse(msg);
        if(!Array.isArray(arr)){
            return;
        }
        process.emit.apply(process,arr);
    })
}

function masterMessage(){
    if(arguments.length > 2){
        var data = arguments[1];
    }
    else{
        var data = arguments[0];
    }
    var arr = library('json').parse(data);
    if( !Array.isArray(arr)){
        return ;
    }
    var type = arr.shift();
    if(type=='publish'){
        publish(arr);
    }
    else if(type=='subscribe'){
        subscribe(arr);
    }
}