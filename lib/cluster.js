"use strict";
//群集模块
const util              = require('util');
const cluster           = require('cluster');
const workers           = [];

//process.setMaxListeners(0);
//添加子进程，handle：function,或者一个脚本路径
exports.fork = function(name,handle,...handleArgs){
    let handleConfig = {  "id": 0, "name":name, "handle": handle,"handleArgs": handleArgs,"subscribe":new Set() };
    workers.push(handleConfig);
}

//启动所有进程,调用start之后不要再执行任何代码
exports.start = function () {
    return Promise.resolve().then(()=>{
        if (cluster.isMaster) {
            return masterStart();
        }
        else if(cluster.isWorker && typeof arguments[0] === "function"){
            let name = process.env["cosjsHandleName"] || '';
            return arguments[0](name);
        }
    }).then(()=>{
        if(cluster.isWorker){
            return workerStart();
        }
    }).catch(err=>{
        console.log("cluster start:",err);
    })
}

exports.on = exports.subscribe = function(name,callback){
    if (!cluster.isWorker){
        return false;
    }
    name = 'cosjs' + name;
    let key = process.env["cosjsHandleKey"];
    let arr = ['subscribe',key,name];
    let msg = JSON.stringify(arr);
    process.on(name,callback);
    process.send(msg);
}

exports.emit = exports.publish = function(name,message){
    if (!cluster.isWorker){
        return false;
    }
    let arr = Array.from(arguments);
    arr[0] = 'cosjs' + arr[0];
    arr.unshift('publish');
    let msg = JSON.stringify(arr);
    process.send(msg);
}

//临时启动工作进程，name,shell,args...
exports.worker = function(){
    if (!cluster.isWorker){
        return false;
    }
    let arr = Array.from(arguments);
    arr.unshift("fork");
    let msg = JSON.stringify(arr);
    process.send(msg);
}
//重启当前子进程,在子进程中执行
exports.restart = function(ms) {
    if (!cluster.isWorker){
        return false;
    }
    try {
        let killtimer = setTimeout(function () { process.exit(); }, ms||5000);
        killtimer.unref();
        cluster.worker.disconnect();
    }
    catch(e){
        console.log('cluster.worker.disconnect false');
    }
}

function workerStart(){
    workerMessage();
    let key = process.env["cosjsHandleKey"];
    let method,handle,handleArgs;
    if( workers[key] ){
        handle = workers[key]['handle'];
        handleArgs = workers[key]['handleArgs'];
    }
    else{
        handle = process.env["cosjsHandleShell"];
        handleArgs = String(process.env["cosjsHandleArgs"]).split(",");
    }
    //events
    exports.on('restart',exports.restart)
    //cluster.worker.key = key;
    if(typeof handle == 'function' ){
        method = handle;
    }
    else if(handle){
        try {
            method = require(handle);
        }
        catch (e){
            let err = process.env.NODE_ENV === "production" ? e.message : e.stack
            console.log("cluster",process.env["cosjsHandleName"],err)
        }
    }
    if(typeof method === 'function' ){
        return method.apply(null,handleArgs);
    }
}

//master启动时
function masterStart() {
    cluster.on('message',masterMessage);
    cluster.on('fork', function (worker) {
        let name = worker['cosjsHandleName'];
        util.log(util.format('fork:worker[%s],pid:%d', name, worker.process.pid));
    });
    // cluster.on('online', function (worker) {
    //     let name = worker['cosjsHandleName'];
    //     util.log(util.format('online:worker[%s],pid:%d',name, worker.process.pid));
    // });
    cluster.on('exit', function (worker, code, signal) {
        let key = worker['cosjsHandleKey'], name = worker['cosjsHandleName'];
        delete(cluster.workers.id);
        util.log(util.format('exit:worker[%s],pid:%d, code:%s, signal:%s',name, worker.process.pid,code||0, signal||0));
        if(workers[key]){
            workers[key]['id'] = 0; forkWorker(key);
        }
    });
    cluster.on('disconnect', function (worker) {
        let name = worker['cosjsHandleName'];
        util.log(util.format('disconnect:worker[%s],pid:%d', name, worker.process.pid));
    });
    cluster.on('listening', function (worker, address) {
        let name = worker['cosjsHandleName'];
        util.log(util.format('listening:worker[%s],pid:%d, port:%d ',name, worker.process.pid, address.port));
    });
    //启动所有进程
    for(let key in workers){
        forkWorker(key);
    }
}

//启动进程
function forkWorker(key){
    let config = workers[key] || null;
    if( !config || config.id >0 ){
        return;
    }
    let worker = cluster.fork({"cosjsHandleKey":key,"cosjsHandleName":config['name']});
    worker["cosjsHandleKey"] = key;
    worker["cosjsHandleName"] = config['name'];
    config['id'] = worker.id;
}



function publish(arr){
    if(arr[0] === 'cosjsstop'){
        setTimeout(function () { process.exit(); }, parseInt(arr[1])||5000);
    }
    for(let key in workers){
        let val = workers[key];
        if( val.subscribe.has(arr[0]) ){
            handleMessage(key,arr);
        }
    }
}

function subscribe(arr){
    let key = arr[0],event = arr[1];
    let config = workers[key];
    if(!config){
        return false;
    }
    config.subscribe.add(event);
}


function handleMessage(key,arr) {
    let config = workers[key];
    if( !config || !config.id){
        return ;
    }
    let worker = cluster.workers[config.id];
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
        let arr = JSON.tryParse(msg);
        if(!Array.isArray(arr)){
            return;
        }
        process.emit.apply(process,arr);
    })
}

function masterMessage(){
    let data;
    if(arguments.length > 2){
        data = arguments[1];
    }
    else{
        data = arguments[0];
    }
    let arr = JSON.tryParse(data);
    if( !Array.isArray(arr)){
        return ;
    }
    let type = arr.shift();
    if(type==='publish'){
        publish(arr);
    }
    else if(type==='subscribe'){
        subscribe(arr);
    }else if(type === 'fork'){
        let name = arr.shift(),shell = arr.shift();
        let env = {"cosjsHandleKey":-1, "cosjsHandleName":name,"cosjsHandleShell":shell,"cosjsHandleArgs":arr};
        let worker = cluster.fork(env);
        worker["cosjsHandleKey"] = -1;
        worker["cosjsHandleName"] = name;
    }
}
