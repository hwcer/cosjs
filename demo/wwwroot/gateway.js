
  var gateway = {};

  gateway.dom = $('#gateway');

  gateway.host = 'ws://127.0.0.1:100';

  gateway.queue = null;

  gateway.submit = function(){}

  gateway.start = function(){
    $currAct = gateway;
    gateway.dom.show();
    gateway.socket = io(gateway.host);
    // Whenever the server emits 'new message', update the chat body
    gateway.socket.on('message', function (data) {
      $('#gatewayMessage').append(JSON.stringify(arguments)+'</br>');
    });

    gateway.socket.on('queue', function (data) {
      if(!gateway.queue){
        gateway.queue = data;
      }
      else{
        Object.assign(gateway.queue,data);
      }
      if(data.sub){
        gateway.queue.index -= data.sub;
      }
      var arr = [];
      arr.push('当前排队人数:'+gateway.queue.total);
      arr.push('平均等待时间:'+ (gateway.queue.wait / 1000 ) + '(S)' );
      arr.push('你的排队位置:'+ gateway.queue.index );
      $('#gatewayMessage').empty().append(arr.join('</br>')+'</br>');
    });

    gateway.socket.on('host', function (data) {
      gateway.dom.hide();
      chat.start(data);
    });

    gateway.socket.on('disconnect', function () {
      $('#gatewayMessage').append('you have been disconnected</br>');
    });

    gateway.socket.on('reconnect', function () {
      $('#gatewayMessage').append('you have been reconnected</br>');
    });

    gateway.socket.on('reconnect_error', function () {
      $('#gatewayMessage').append('attempt to reconnect has failed</br>');
    });
  }