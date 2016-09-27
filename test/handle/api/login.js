module.exports = function(){
    var self = this;
    var uid = '10000';
    var data = {"uid":uid,"name":"test"};

    if(self.session.option.ObjectID){
        self.session.create(data,this.call(true,result) );
    }
    else{
        self.session.create(uid,data,this.call(true,result) );
    }

}



var result = function(err,ret){
    this.callback(err,ret);
}