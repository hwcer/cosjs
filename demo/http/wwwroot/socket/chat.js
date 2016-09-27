function ui_chat($socket){
  var self = this;
  this.input = '';
  this.socket = $socket;
  this.msgnums = 0;

  $socket.msg('连接服务器...');
  var socket = io.connect($socket.host, { 'timeout': 300000, 'reconnection': true, 'reconnectionDelayMax':30000, 'reconnectionDelay':1000  });
  $socket.socket = socket;

  socket.on('connect', function(){
    $socket.msg('身份认证中...');
    self.login();
  });
  socket.on('disconnect', function(){
    this.input = '';
    $('#chat').hide();
    $socket.msg('断开服务器');
  });
  socket.on('reconnecting',function(){
    $socket.msg('重新连接服务器['+$socket.host+']中……');
  })
  socket.on('reconnect', function(transport_type,reconnectionAttempts){
    $socket.msg('重连服务器成功。');
    self.login();
  });

  socket.on('message', function (name,data) {
    if(socketMessage[name]){
      socketMessage[name].call(self,data);
    }
  });



}

ui_chat.prototype.sumMsg = function(){
  this.msgnums ++;
  if(this.msgnums >200){
    this.msgnums =0;
    $('#messages').empty();
  }
}


ui_chat.prototype.submit = function(){
  var data = {};
  data.cid = $('#cid').val();
  data.tar = $('#tar').val();
  data.msg = $('#msg').val();
  $('#msg').val('');
  // if there is a non-empty message and a cosjs.socket connection
  if (this.input) {
    this.socket.socket.send('/chat/', data);
  }
}


ui_chat.prototype.login = function(){
    this.socket.socket.send('login',{name:this.socket.token});
}