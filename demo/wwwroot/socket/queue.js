function ui_queue($socket){
    this.input = '';
    this.queue = null;
    this.socket = $socket;
    var gateway = io.connect($socket.gateway, { 'timeout': 300000, 'reconnection': true, 'reconnectionDelayMax':30000, 'reconnectionDelay':1000  });
    $socket.msg('loading...');
    var self = this;
    gateway.on('queue',function(queue){
        if(!self.queue){
            self.queue = queue;
        }
        else{
            self.queue.index -= queue.sub;
            self.queue.total = queue.total;
            self.queue.wait = queue.wait;
        }
        showMsg.call(self);
    });

    gateway.on('host',function(d){
        $socket.host = [d.host,d.port].join(':');
        gateway.disconnect(true);
        $socket.msg('准备进入服务器...');
        setTimeout(function(){
            $socket.setui(ui_chat);
            $('#queue').hide();
        },1000)
    });
}


ui_queue.prototype.submit = function(){}



function showMsg(){
    var html = [];
    html.push('当前人数:'+this.queue.total);
    html.push('列队位置:'+this.queue.index );
    html.push('平均等待:'+this.queue.wait / 1000 + ' (S)');
    this.socket.msg(html.join('</br>'));
}