exports = module.exports = function(){
  return new exports.buffer();
};

exports.buffer = function(){
  this.header   = [2,'B'];
  this.charset = 'utf8';
}
//buffer解析
exports.buffer.prototype.parse = function(buffer){
  var data = buffer.toString(this.charset);
  return JSON.tryParse(data)||data;
}
//buffer打包
exports.buffer.prototype.packet = function(type,data){
  var headLen = this.header[0]>2?4:2;
  var headEnd = this.header[1]=='B'?'B':'L';
  var msg = JSON.stringify({"type":type,"data":data});
  var msgLen = Buffer.byteLength(msg);
  var bufLen = msgLen + headLen;
  var writeHead = 'writeUInt'+ (8*headLen) + headEnd + 'E';

  var offset = 0;
  var bodyBuf = new Buffer(bufLen);
  //包头
  bodyBuf[writeHead](msgLen,offset);
  offset += this.header[0];
  //包内容
  bodyBuf.write(msg,offset,msgLen,this.charset);
  return bodyBuf;
}
