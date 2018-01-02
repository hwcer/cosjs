"use strict";

exports.parse = function parse(text,reviver){
    if( !text || typeof text == 'object'){
        return text;
    }
    var json = null;
    try {
        json = JSON.parse(text,reviver);
    }
    catch(e){
        json = null;
    }
    return json;
}

exports.clone = function clone(v){
    return JSON.parse(JSON.stringify(v));
}

//对象合并
exports.extend = function extend() {
    var options, name, src, copy, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;

        // skip the boolean and the target
        target = arguments[ i ] || {};
        i++;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && typeof target != 'function' ) {
        target = {};
    }

    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];
                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && typeof copy == 'object' ) {
                    if ( Array.isArray(copy)  ) {
                        clone = src && Array.isArray(src) ? src : [];

                    } else {
                        clone = src && typeof src === 'object' ? src : {};
                    }

                    // Never move original objects, clone them
                    target[ name ] = Object.extend( deep, clone, copy );

                    // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }
    // Return the modified object
    return target;
}
