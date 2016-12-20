//agent启动脚本
const ioClient    = require('socket.io-client');
const maxClient = 1;
const gateway = 'ws://117.74.140.198:190';
var clients = [];
const msgs = [
    '不要和我比懒，我懒得和你比',
    '鄙视我的人这么多，你算老几？ ',
    '有钱人终成眷属。 ',
    '大部分人一辈子只做三件事：自欺、欺人、被人欺。 ',
    '不怕被人利用，就怕你没用。',
    '别人的钱财乃我的身外之物。 ',
    '女为悦己者容，男为悦己者穷！ ',
    '留了青山在，还是没柴烧…… ',
    '强烈抗议广告时间插播电视剧！ ',
    '天没降大任于我，照样苦我心智，劳我筋骨... ',
    '没钱的时候，在家里吃野菜；有钱的时候，在酒店吃野菜…… ',
    '我的原则是：人不犯我，我不犯人；人若犯我，我就生气！ ',
    '人总要犯错误的，否则正确之路人满为患。 ',
    '偶尔幽生活一默你会觉得很爽，但生活幽你一默就惨了…… ',
    '代沟就是--我问老爸：“你觉得《菊花台》怎么样？”老爸想想说：“没喝过！” ',
    '猛的一看你不怎么样，仔细一看还不如猛的一看。 ',
    '一口不能吃个胖子，但胖子却是一口一口吃出来的！ ',
    '对男人一知半解的女人最后成了男人的妻子，对男人什么都了解的女人最后成了老女人。 ',
    '上天在赐予我们青春的同时也赐予了我们青春痘。 ',
    '出问题先从自己身上找原因，别一便秘就怪地球没引力。 ',
    '我当年也是个痴情的种子，结果下了场雨……淹死了。 ',
    '钞票不是万能的，有时还需要信...'
];

function start(){
    setInterval(function(){
        client_ai();
    },1000);

    var i=0;
    var timer = setInterval(function(){
        gateway_start(i);
        i++;
        if(i>=maxClient){
            clearInterval(timer)
        }
    },10);
}
function gateway_start(i){
    var opts = { 'timeout': 300000, 'reconnection': true, 'reconnectionDelayMax':30000, 'reconnectionDelay':1000  }
    var socket = ioClient(gateway,opts);
    socket.on('queue',function(queue){
        //console.log(queue);
    })
    socket.on('host',function(d){
        var host = [d.host,d.port].join(':');
        client_start(host,i);
        socket.disconnect(true);
    });

    socket.on('error', function(){
        console.log('gateway error',arguments);
    });
    socket.on('connect', function(){
        //console.log('gateway connect',arguments);
    });
    socket.on('connection', function(){
        //console.log('gateway connection:',arguments);
    });
    socket.on('disconnect', function(){
        //console.log('gateway disconnect');
    });

    socket.on('reconnect', function(transport_type,reconnectionAttempts){
        //console.log('gateway reconnect');
    });
};



function client_start(host,i) {
    console.log(i.toString(),host);
    host = 'ws://' + host;
    var opts = { 'timeout': 300000, 'reconnection': true, 'reconnectionDelayMax':30000, 'reconnectionDelay':1000  }
    var socket = ioClient(host,opts);
    clients.push(socket);

    socket.send('login',{name:'test-'+i});

    socket.on('message', function(name,message){
        //console.log('client message',arguments);
    });

    socket.on('error', function(){
        console.log('client error',arguments);
    });
    socket.on('connection', function(){
        //console.log('client connection:',host,arguments);
    });
    socket.on('disconnect', function(){
        // var index = clients.indexOf(socket);
        // if(index>=0){
        //     clients.splice(index,1);
        // }
        // gateway_start(i);
        console.log('client disconnect',host);
    });

    socket.on('reconnect', function(transport_type,reconnectionAttempts){
        //console.log('client reconnect',host);
    });
}

function client_ai(){
    if(clients.length < 100 ){
        return;
    }
    var max = Math.min(10,clients.length);
    var index = clients.length - 1;
    for(var i=0;i<max;i++){
        var k = random(0,index);
        client_act(k);
    }

}

function client_act(k){
    if(!clients[k]){
        return;
    }
    var cids = [1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4];
    var socket = clients[k];
    var n = random(1,1000);
    if(n>900){
        var k = random(0,cids.length - 1);
        var cid = cids[k];
        var i = random(0,msgs.length-1);
        var msg = {cid:cid,tar:'',msg:msgs[i]};
        socket.send('chat',msg);
    }
    else if(n>800){
        socket.send('/scene/join',random(1,30));
    }
    else if(n>500){
        socket.send('/scene/move',random(1,1000),random(1,1000));
    }

    if(n<2 ){
        //this.disconnect(true);
    }
};


function random(min,max){
    var key = max - min + 1;
    var val = min + Math.floor(Math.random()*key);
    return val;
}




start();