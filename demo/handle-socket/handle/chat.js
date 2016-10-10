
/**
 * 聊天信息
 */
exports = module.exports = function (msg) {
    if(!msg.msg){
        this.error = this.error ? this.error :0;
        this.error ++;
        if(this.error>=30){
            return this.socket.disconnect(true);
        }
        else if(this.error>=10){
            return this.socket.send('error','你是猴子请来的逗逼吗');
        }
        else{
            return this.socket.send('error','msg empty');
        }
    }
    if(!this.data){
        return this.socket.send('error','user not login');
    }

    msg.uid = this.data.uid;
    msg.name = this.data.name;
    if(msg.cid == 1) {
        this.broadcast().send('chat',msg);
    }
    else if(msg.cid == 2) {
        if(this.club) {
            this.broadcast('club',this.club).send('chat',msg);
        }
    }
    else if(msg.cid == 3) {
        if(this.scene) {
            this.broadcast('scene',this.scene).send('chat',msg);
        }
    }
    else if(msg.cid == 4) {
        if(this.group){
            this.broadcast('group',this.group).send('chat',msg);
        }
    }
    // else if(msg.cid == '9' && msg["tar"]){
    //     var uid = msg["tar"];
    //     this.broadcast('uid',uid).send('chat',msg);
    //     this.socket.send('chat',msg);
    // }
};