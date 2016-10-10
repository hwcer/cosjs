/**
 * Created by hwc on 2016-08-30.
 */
var FADE_TIME = 150; // ms
var COLORS = [  '#e21400', '#91580f', '#f8a700', '#f78b00', '#58dc00', '#287b00', '#a8f07a', '#4ae8c4', '#3b88eb', '#3824aa', '#a700ff', '#d300e7'];
var $messages = $('#messages');

var socketMessage = {};

// Log a message
function log (message, options) {
    var data = {};
    data.cid = 0;
    data.uid = '';
    data.name = '系统';
    data.msg = message;
    addChatMessage.call(this,data,options);
}

// Adds the visual chat message to the message list
function addChatMessage (data, options) {
    if(typeof data != 'object'){
        data = {'cid':0,'uid':'','msg':data};
    }

    var title = data['title'] ||'';

    if(data.cid == 9 && this.data.uid == data.uid){
        var tar = $('#tarName').val();
        var tarName = $('#tarName').val();
        var $usernameDiv = createUserNameSpan.call(this,tar,tarName,'你对[',']说：');
    }
    else if(data.cid == 9 && this.data.uid != data.uid){
        var $usernameDiv = createUserNameSpan.call(this,data.uid,data.name,'[',']对你说：');
    }
    else if(data.name){
        var $usernameDiv = createUserNameSpan.call(this,data.uid,data.name,'[',']：');
    }
    else{
        $usernameDiv = $('<span/>');
    }

    var msg = data.msg;
    if(data.time){
        msg += ' ('+ typeof (data.time) +')'+data.time;
    }

    var $messageBodyDiv = $('<span class="messageBody">')
        .append(msg);
    var $messageDiv = $('<li class="message"/>')
        .data('uid', data.uid)
        .append(title,$usernameDiv, $messageBodyDiv);

    var cid = parseInt(data.cid);
    if(COLORS[cid]){
        $messageDiv.css('color', COLORS[cid]);
    }

    addMessageElement($messageDiv, options);
    this.sumMsg();
}

function createUserNameSpan(uid,name,LTxt,RTXT){
    var box = $('<span style="color: #000000" />');
    var span = $('<span style="cursor:pointer;" />') .text(name) .attr('uid',uid) .attr('name',name);
    if(LTxt){
        box.append(LTxt);
    }
    box.append(span);
    if(RTXT){
        box.append(RTXT);
    }
    if(uid && uid != this.data.uid){
        span.on('click',function(){
            $("#tar").val(uid);
            $("#tarName").val(name);
            $('#cid').val(9);
        });
    }
    return box;
}
// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
        options = {};
    }
    if (typeof options.fade === 'undefined') {
        options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
        options.prepend = false;
    }

    // Apply options
    if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
        $messages.prepend($el);
    } else {
        $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;

}


//=========================================================================//

// 用户登陆成功，ret,{uid,name}
socketMessage['login'] =  function (ret) {
    this.data = ret;
    this.input = $('#msg');
    $('#chat').show();
    $(this.input).focus();

    // Display the welcome message
    var message = "Welcome to Chat "+ret['name'];
    log.call(this,message);
    log.call(this,'当前登录服务器：'+ this.socket.host);
    this.socket.msg('');
};
//错误信息，ret:错误码
socketMessage['error'] = function (ret) {
    this.socket.msg('错误:'+ret);
};
// 聊天信息
var room = {1:'[世界]',2:'[公会]',3:'[当前]',4:'[队伍]'};
socketMessage['chat'] = function (data) {
    data['title'] = room[data.cid] || '';
    addChatMessage.call(this,data);
};

// 用户上线，任何用户上线都会收到此消息，ret:{uid,name}
socketMessage['online'] = function (ret) {
    var msg = createUserNameSpan.call(this,ret.uid,ret.name,"天空一声巨响，[","]闪亮登场！");
    log.call(this,msg);
};
// 用户下线，同online
socketMessage['offline'] = function (ret) {
    var msg = '['+ ret.name +'] 依依不舍，一步三回头的离开了游戏……';
    log.call(this,msg);
};
//=========================================================================//

// 聊天信息
socketMessage['scene/move'] = function (ret) {
    var msg = createUserNameSpan.call(this,ret.uid,ret.name,"move[","]>>>>("+ret.position[0]+","+ret.position[1]+")");
    log.call(this,msg);
};
// 聊天信息
socketMessage['scene/leave'] = function (ret) {
    var msg = createUserNameSpan.call(this,ret.uid,ret.name,"","离开场景");
    log.call(this,msg);
};
// 聊天信息
socketMessage['scene/join'] = function (ret) {
    var msg = createUserNameSpan.call(this,ret.uid,ret.name,"","进入场景");
    log.call(this,msg);;
};