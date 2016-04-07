var project = require('./share/application');
var net = require('net');
var ExBuffer = require('ExBuffer');
var host = '192.168.2.250';
var port = '190';
var packet = function(type,data){
  var msg = JSON.stringify({"type":type,"data":data});
  var msgLen = Buffer.byteLength(msg);
  var bufLen = msgLen + this.header[0];
  var writeHead = 'writeUInt'+ (8*this.header[0]) + this.header[1] + 'E';

  var offset = 0;
  var bodyBuf = new Buffer(bufLen);
  //包头
  bodyBuf[writeHead](msgLen,offset);
  offset += this.header[0];
  //包内容
  bodyBuf.write(msg,offset,msgLen,this.charset);
  return bodyBuf;
}

var packet2 = function(type,message){
  var data = typeof message == 'object' ? JSON.stringify(message) : message.toString();
  var typeLen = 10;
  var dataLen = Buffer.byteLength(data);
  var bodyLen = dataLen + typeLen;

  var writeHead = 'writeUInt'+ (8*this.header[0]) + this.header[1] + 'E';
  var offset = 0;
  var bodyBuf = new Buffer( bodyLen + this.header[0]);
  //包头
  bodyBuf[writeHead](bodyLen,offset);
  offset += this.header[0];
  //包路由
  var ts = type.toString();
  var tl = Buffer.byteLength(ts)
  bodyBuf.write(ts,offset,tl,this.charset);
  offset += tl;
  //补充内容
  if(tl < typeLen){
    var bc = typeLen - tl;
    var bcs = ' '.repeat(bc);
    bodyBuf.write(bcs,offset,bc,this.charset);
    offset += bc;
  }
  //包内容
  bodyBuf.write(data,offset,dataLen,this.charset);
  return bodyBuf;
}

var testClient = {
    header : [4, 'B'],
    charset:'utf8'
};
var buff = packet2.call(testClient,'chat','test');
console.log(buff.readUInt32BE(0));
var type = buff.toString('utf8',4,10).trim();
console.log(type + 'aaaaaaaaa');
console.log(buff.toString('utf8',14));
return ;

var ai = function(client){
  var act = ['test', 'world','club','groupJoin','groupChat'];
  var i = $.roll(0,act.length -1);
  var key = act[i];
  switch (key){
    case 'test':
        var k = client.key;
        clearInterval(client.timer);
        client.timer = 0;
        client.send('exit');
        createClient(key);
        break;
    case 'world':
        client.send('chat',{"cid":1,"tar":0,"msg":'[world]I AM TEST['+client.key+']'} );
        break;
    case 'club':
        client.send('chat',{"cid":3,"tar":0,"msg":'[club]I AM TEST['+client.key+']'} );
        break;
    case 'groupJoin':
      client.send('group',{"id": $.roll(1,100),"stat":1});
      break;
    case 'groupChat':
      client.send('chat',{"cid":4,"tar":0,"msg":'[group]I AM TEST['+client.key+']'} );
      break;
  }
}



var createClient = function(key) {
  var client = net.connect(port, host, function () {
    client.header = [4, 'B'];
    client.charset = 'utf8';
    client.key = key;
    var exBuffer = new ExBuffer().uint32Head();

    client.send = function (type, msg) {
      var buffer = packet.call(client, type, msg);
      client.write(buffer, 'utf8');
    }

    client.on('data', function (buffer) {
      exBuffer.put(buffer);
    });
    client.on('error', function (e) {
      if(client.timer) clearInterval(client.timer);
      console.log('Error',e);
    });
    exBuffer.on('data', function (buffer) {
      var readHead = 'readUInt' + (8 * client.header[0]) + client.header[1] + 'E';
      var type = buffer[readHead](0);
      var data = buffer.toString('utf8', client.header[0]);
      console.log('Data:', type, data);
    });
    client.send('test',key);
    client.timer = setInterval(function(){
      //ai(client);
    },1000);
  });
  return client;
}

//var k = 0;
//var master = createClient('hwc');
//for(var i =k;i<(k+5000);i++){
//  //createClient(i.toString());
//}



process.stdin.setEncoding('utf8');

process.stdin.on('readable', function(){
  process.stdin.setEncoding('utf8');
  var chunk = process.stdin.read();
  if (chunk !== null) {
    var arr = chunk.trim().split(' ');
    var type = arr[0];
    if(type == 'chat'){
      var data =  {"cid":arr[1],"tar":arr[2],"msg":arr[3]}
    }
    else if(type == 'group'){
      var data =  {"id":arr[1],"stat":arr[2]||0}
    }
    else{
      var data = arr[1]||'';
    }
    //master.send(type,data);
  }
});