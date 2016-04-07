var net = require('net'),
  domain = require('domain'),
  events = require('events'),
  cosBuffer = require('cosBuffer');

exports = module.exports = function(port,handle){
  var app = net.createServer();
  app.buffer = new cosBuffer();
  app.loader = module_loader;
  app.channel = new socket_channel(app)
  app.settings = Object.isObject(handle) ? handle : {} ;
  app.on('connection',function(socket){
    socket_handle(app,socket);
  });
  app.on('error',function(e){
    console.log(new Date().toLocaleString(), JSON.stringify(e));
  })
  //name channel type data
  app.to = function(name,type,data){
    if(arguments.length==4){
      var key = [arguments[0],arguments[1]].join('');
      var buffer = app.buffer.packet(arguments[2], arguments[3]);
    }
    else{
      var key = arguments[0];
      var buffer = app.buffer.packet(arguments[1], arguments[2]);
    }
    app.emitter.emit(key, buffer);
  }

  app.set = function(k,v){
    app.settings[k] = v;
  }

  app.get = function(k){
    return app.settings[k]||null;
  }

  if( typeof handle == 'function' ){
    handle(app,function(){  app.listen(port);  });
  }
  else{
    app.listen(port);
  }

  return app;
}

var socket_handle = function(app,socket) {
  socket.app = app;
  socket.exBuffer = app.buffer.ExBuffer();

  var timeout = app.get('timeout');
  if(timeout){
    socket.setTimeout(timeout);
  }

  var keepAlive = app.get('keepAlive');
  if(keepAlive){
    socket.setKeepAlive(true,keepAlive);
  }

  socket.exBuffer.on('data',function(buffer){
    socket_route(socket,buffer);
  });
  socket.on('data', function(buffer) {
    socket.exBuffer.put(buffer);
  });
  socket.on('error',function(e){
    socket.destroy();
  });

  socket.room = function(name){
    return app.channel.room(socket,name);
  }

  socket.send = function(type,data){
    var buffer = app.buffer.packet(type, data);
    socket.write(buffer,app.buffer.charset);
  }

  socket.emitterListener = function(buffer){
    socket.write(buffer,app.buffer.charset);
  }

}

var socket_route = function(socket,buffer){
  var app = socket.app;
  var message = app.buffer.parse(buffer);
  if(!message || typeof message != 'object'){
    return;
  }

  var type = message['type']||'';
  if(!type){
    return ;
  }
  else if(type == 'exit'){
    return socket.end();
  }
  var root = app.get('root');
  if(!root){
    return socket.send('error','server.root empty');
  }
  module_loader(socket,root,type,message['data']||null)
}
//房间管理
var socket_room = function(emitter,socket,channel){
  var app = socket.app;
  var self = this;

  this.id = null;          //当前房间ID

  this.emit = function(type,data){
    if(this.id===null){
      return this;
    }
    var name = [channel,this.id].join('');
    var buffer = app.buffer.packet(type,data);
    emitter.emit(name, buffer);
    return this;
  }
  //加入房间
  this.join = function(key){
    if(this.id!==null){
      this.leave();
    }
    var room = key || 0;
    var name = [channel,room].join('');
    emitter.on(name,socket.emitterListener);
    this.id = room;
    return this;
  }
//离开房间
  this.leave = function(){
    if(this.id===null){
      return this;
    }
    var name = [channel,this.id].join('');
    this.id = null;
    emitter.removeListener(name,socket.emitterListener);
    return this;
  }

  socket.on('close', function(){
    self.leave();
  });

}
//频道管理,一个频道中可开多个房间
var socket_channel = function(app){
  var channel = {};

  this.create = function(name,maxListeners){
    if(channel[name]){
      return channel[name];
    }
    var emitter = new events.EventEmitter();
    emitter.setMaxListeners(maxListeners||0);
    channel[name] = emitter;
  }

  this.room = function(socket,name){
    if(!channel[name]){
      return null;
    }
    var key = ['channel',name].join('-');
    if(!socket[key]){
      socket[key] = new socket_room(channel[name],socket,name);
    }
    return socket[key];
  }
  //广播
  this.emit = function(channelID,roomID,type,data){
    if(!channel[channelID]){
      return this;
    }
    var name = [channelID,roomID||0].join('');
    var buffer = app.buffer.packet(type,data);
    channel[channelID].emit(name, buffer);
    return this;
  }

}
//模块加载器
var module_loader = function(socket,root,name,data){
  if(name.substr(-1,1)=='/'){
    name = name.substr(0,name.length - 1);
  }
  var arr = name.split('/');
  if(arr.length>1){
    var fun = arr.pop();
    var file = [root].concat(arr).join('/');
  }
  else{
    var fun = null;
    var file = [root  , name].join('/');
  }

  try{
    var mod = require(file);
  }
  catch(e){
    return socket.send('error','module not exist');
  }

  if( !fun ){
    var method = mod;
  }
  else{
    var method = mod[fun] || false;
  }
  if( typeof method != 'function'  ){
    return socket.send('error','module function not exist');
  }
  var d = domain.create();
  d.on('error', function (err) {
    var msg = err.stack || err;
    console.log(msg);
    socket.send('error','500');
  });
  d.run(function () {
    method.call(socket,data);
  });
}
