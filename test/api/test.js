
exports.test = function() {
    var self = this;

    this.index = function () {
        var result = {
            "title":"cosjs test index",
            "menu":[
                {"url":"/test/baidu","name":"redirect to baidu"},
                {"url":"/test/check","name":"check user login"},
                {"url":"/test/login","name":"test login"},
            ]
        }
        self.display('index',result);
    };

    this.baidu = function () {
        self.redirect('http://www.baidu.com');
    };

    this.check = function(){
        var cookie = self.cookie(['id','lastTime']);
        if(!cookie){
            var obj = self.cookie();
            self.callback(obj.error);
        }
        else{
            self.callback(null,cookie);
        }

    }

    this.login = function(){
        var cookie = self.cookie();
        var time = new Date().getTime();
        var data = {"id":1,"lastTime":time};
        cookie.set(data);
        self.callback(null,data);
    }

    this.task = function(){

        var worker = function(id,callback){
            console.log(id);
            callback(null,id);
        }

        var finish = function(err,ret){
            self.callback(err,ret)
        }

        var task = new $.task(1000,worker,finish);
        task.sync();
    }
}