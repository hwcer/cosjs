var net = require('net'),
  route = require('./route'),
  events = require('events'),
  ExBuffer = require('ExBuffer'),
  bufferParse = require('./buffer');

exports = module.exports = function(port,handle){
  var app = net.createServer();
  app.buffer = bufferParse();
  app.emitter = new events.EventEmitter();
  app.emitter.setMaxListeners(0);
  app.settings = Object.isObject(handle) ? handle : {} ;
  app.on('connection',function(socket){
    socketHandle.call(app,socket);
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
    handle.call(app,function(){
      app.listen(port);
    });
  }
  else{
    app.listen(port);
  }

  return app;
}

var socketHandle = function(socket) {
  var server = this;
  socket.server = server;
  socket.exBuffer = new ExBuffer();

  var timeout = server.get('timeout');
  if(timeout){
    socket.setTimeout(timeout);
  }

  var keepAlive = server.get('keepAlive');
  if(keepAlive){
    socket.setKeepAlive(true,keepAlive);
  }

  if(server.buffer.header[0] != 2){
    socket.exBuffer.uint32Head();
  }
  if(server.buffer.header[1] != 'B'){
    socket.exBuffer.littleEndian();
  }
  socket.exBuffer.on('data',function(buffer){
    bufferHandle.call(socket,buffer);
  });
  socket.on('data', function(buffer) {
    socket.exBuffer.put(buffer);
  });
  socket.on('error',function(e){
    socket.destroy();
  });
  //自动加载模块
  socket.error = function(code,message){
    socket.send('error',message);
  }

  socket.send = function(type,data){
    var buffer = server.buffer.packet(type, data);
    socket.write(buffer,server.buffer.charset);
  }
  //加入房间
  socket.join = function(){
    var name = Array.from(arguments).join('');
    server.emitter.on(name,socket.emitterListener);
    socket.on('close', function(){
      server.emitter.removeListener(name,socket.emitterListener);
    });
    return socket;
  }
  //离开房间
  socket.leave = function(){
    var name = Array.from(arguments).join('');
    server.emitter.removeListener(name,socket.emitterListener);
    return socket;
  }
  //向房间中发消息
  socket.to = function(name,type,data){
    server.to.apply(server,arguments);
    return socket;
  }

  socket.emitterListener = function(buffer){
    socket.write(buffer,server.buffer.charset);
  }

}

var bufferHandle = function(buffer){
  var server = this.server;
  var message = server.buffer.parse(buffer);
  if(!message || typeof message != 'object'){
    return;
  }

  var type = message['type']||'';
  if(!type){
    return ;
  }
  else if(type == 'exit'){
    return this.end();
  }
  var root = this.server.get('root');
  if(!root){
    return this.send('error','server.root empty');
  }
  route.loader(this,root,type,message['data']||null)
}