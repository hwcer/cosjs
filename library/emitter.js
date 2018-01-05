const events = require('events');
const library  = require('../library');
const json = library.require("json");

function RedisEmitter(opts,app) {
    if (!(this instanceof RedisEmitter)) {
        return new RedisEmitter(opts,app)
    }
    this.app = app || null;
    this.loader  = opts.root ? library.require('loader')(opts.root) : null;
    this.prefix  = opts.prefix || '_emit'
    this.pattern = opts.pattern ? true : false;

    Object.defineProperty(this, "redisEmitter",  { get : createRedisClient.bind(this,opts,'pub'), enumerable : true, configurable : false});
    Object.defineProperty(this, "redisReceiver", { get : createRedisClient.bind(this,opts,'sub'), enumerable : true, configurable : false});
    Object.defineProperty(this, "eventEmitter",  { value : new events(), enumerable : true, configurable : false});
    this.eventEmitter.setMaxListeners(0);
    //加入所有事件
    if(this.loader){
        this.loader.handle((api)=>{
            this.on(api, handle.bind(this,api));
        });
    }

    if(this.pattern) {
        this.redisReceiver.on('pmessage', (pattern, name, args)=> {
            pmessage.call(this, pattern, name, args);
        });
    }
    else{
        this.redisReceiver.on('message', (name, args)=>{
            message.call(this, name, args);
        });
    }
}

module.exports = RedisEmitter;


RedisEmitter.prototype.emit = RedisEmitter.prototype.publish = function (name) {
    var arr = Array.from(arguments);
    var name = arr.shift();
    this.redisEmitter.publish(this.prefix + name, JSON.stringify(arr));
}


RedisEmitter.prototype.on = RedisEmitter.prototype.subscribe = function (name, listener) {
    this.eventEmitter.addListener(name, listener);
    var cmd = this.pattern ? 'psubscribe' : 'subscribe';
    this.redisReceiver[cmd](this.prefix + name);
}


//name,
RedisEmitter.prototype.unsubscribe = function(name) {
    this.eventEmitter.removeAllListener(name);
    var cmd = this.pattern ? 'punsubscribe' : 'unsubscribe';
    this.redisReceiver[cmd](this.prefix + name);
}



RedisEmitter.prototype.end = RedisEmitter.prototype.quit = function () {
    if (this.hasOwnProperty('_pub')) this.redisEmitter.end();
    if (this.hasOwnProperty('_sub')) this.redisReceiver.end();
}

RedisEmitter.prototype.route = function(){
    return handle.apply(this,arguments);
}

function createRedisClient(opts,type) {
    var key = ['_',type].join('');
    if(!this[key]){
        var redis = require('./redis');
        var duplicate = type === 'sub' ? true : false;
        this[key] = redis.connect(opts[type],duplicate);
    }
    return this[key];
}


function message(name,args) {
    if(!args){
        return;
    }
    args = json.parse(args)
    if(!args){
        return;
    }
    if (this.prefix.length) {
        name = name.substring(this.prefix.length);
    }
    args.unshift(name);
    //handle.apply(this,args)
    this.redisEmitter.emit.apply(this.redisEmitter, args);
}

function pmessage(pattern,name,args) {
    if(!args){
        return;
    }
    args = json.parse(args)
    if(!args || !Array.isArray(args)){
        return;
    }
    if (this.prefix.length) {
        name = name.substring(this.prefix.length);
        pattern = pattern.substring(this.prefix.length);
    }
    args.unshift(name);
    //handle.apply(this,[].concat(args))
    if(pattern.indexOf('*') >=0){
        args.unshift(pattern);
    }
    this.redisEmitter.emit.apply(this.redisEmitter, args);
}

function handle(name){
    if(!this.loader) {
        return ;
    }
    if(name.indexOf('/')<0){
        name = ['',name,''].join('/');
    }
    var arr = Array.prototype.slice.call(arguments,1);
    var method = this.loader.parse(name);
    if( typeof method != 'function'  ){
        return false;
    }
    method.apply(this, arr);
};