/**
 * Created by HWC on 2014/10/10.
 */
    var router = [];

    exports.set = function (reg,api) {
        var $router = {};
        $router['reg'] = reg;
        $router['api'] = api;
        router.push($router);
    }

    exports.get = function (req,res,pathname) {
        for (var k in router) {
            var $RegExp = router[k]['reg'];
            if(!$RegExp){
                continue;
            }
            var $Match  = typeof $RegExp == 'object' ? parseRouterRegExp($RegExp,pathname) : parseRouterString($RegExp,pathname);
            if ($Match) {
                return router[k]['api'](req,res,$Match);
            }
        }
        return false;
    }


    var parseRouterString = function(reg,pathname){
        if(pathname.substr(0,reg.length) == reg){
            return pathname;
        }
        else{
            return false;
        }
    }

    var parseRouterRegExp = function(RegExp,pathname){
        return pathname.match(RegExp);
    }