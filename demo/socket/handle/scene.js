
/**
 * 场景信息
 */


exports.join = function (id) {
    if(this.scene){
        this.leave('scene',this.scene);
        this.broadcast('scene',this.scene).send('scene/leave',this.data);
    }
    this.join('scene',id);
    this.broadcast('scene',id).send('scene/join',this.data);
};

//移动
exports.move = function (x,y) {
    this.data.position = [x,y];
    this.broadcast('scene',this.scene).send('scene/move',this.data);
};