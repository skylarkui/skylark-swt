/**
 * skylark-swt - The skylark standard widget tookit
 * @author Hudaokeji, Inc.
 * @version v0.9.2.beta
 * @link https://github.com/skylarkui/skylark-bs-swt/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
  	  require = globals.require,
  	  isAmd = (typeof define === 'function' && define.amd),
  	  isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");    
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                exports: null
            };
            require(id);
        } else {
            resolved[id] = factory;
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.exports) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(window, args);
        }
        return module.exports;
    };
  }

  factory(define,require);

  if (!isAmd) { 
    if (isCmd) {
      exports = require("skylark-bs-swt/main");
    } else {
      if (!globals.skylarkjs) {
         globals.skylarkjs = require("skylark-langx/skylark");
      }

    }
  }

})(function(define,require) {

define('skylark-langx/skylark',[], function() {
    var skylark = {

    };
    return skylark;
});

define('skylark-utils/skylark',["skylark-langx/skylark"], function(skylark) {
    return skylark;
});

define('skylark-langx/langx',["./skylark"], function(skylark) {
    "use strict";
    var toString = {}.toString,
        concat = Array.prototype.concat,
        indexOf = Array.prototype.indexOf,
        slice = Array.prototype.slice,
        filter = Array.prototype.filter,
        hasOwnProperty = Object.prototype.hasOwnProperty;


    var  PGLISTENERS = Symbol ? Symbol() : '__pglisteners';

    // An internal function for creating assigner functions.
    function createAssigner(keysFunc, defaults) {
        return function(obj) {
          var length = arguments.length;
          if (defaults) obj = Object(obj);
          if (length < 2 || obj == null) return obj;
          for (var index = 1; index < length; index++) {
            var source = arguments[index],
                keys = keysFunc(source),
                l = keys.length;
            for (var i = 0; i < l; i++) {
              var key = keys[i];
              if (!defaults || obj[key] === void 0) obj[key] = source[key];
            }
          }
          return obj;
       };
    }

    // Internal recursive comparison function for `isEqual`.
    var eq, deepEq;
    var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

    eq = function(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b) return a !== 0 || 1 / a === 1 / b;
        // `null` or `undefined` only equal to itself (strict comparison).
        if (a == null || b == null) return false;
        // `NaN`s are equivalent, but non-reflexive.
        if (a !== a) return b !== b;
        // Exhaust primitive checks
        var type = typeof a;
        if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
        return deepEq(a, b, aStack, bStack);
    };

    // Internal recursive comparison function for `isEqual`.
    deepEq = function(a, b, aStack, bStack) {
        // Unwrap any wrapped objects.
        //if (a instanceof _) a = a._wrapped;
        //if (b instanceof _) b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className !== toString.call(b)) return false;
        switch (className) {
            // Strings, numbers, regular expressions, dates, and booleans are compared by value.
            case '[object RegExp]':
            // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
            case '[object String]':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return '' + a === '' + b;
            case '[object Number]':
                // `NaN`s are equivalent, but non-reflexive.
                // Object(NaN) is equivalent to NaN.
                if (+a !== +a) return +b !== +b;
                // An `egal` comparison is performed for other numeric values.
                return +a === 0 ? 1 / +a === 1 / b : +a === +b;
            case '[object Date]':
            case '[object Boolean]':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a === +b;
            case '[object Symbol]':
                return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
        }

        var areArrays = className === '[object Array]';
        if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object') return false;
            // Objects with different constructors are not equivalent, but `Object`s or `Array`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
                               isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
                return false;
            }
        }
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

        // Initializing stack of traversed objects.
        // It's done here since we only need them for objects and arrays comparison.
        aStack = aStack || [];
        bStack = bStack || [];
        var length = aStack.length;
        while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] === a) return bStack[length] === b;
        }

        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);

        // Recursively compare objects and arrays.
        if (areArrays) {
            // Compare array lengths to determine if a deep comparison is necessary.
            length = a.length;
            if (length !== b.length) return false;
            // Deep compare the contents, ignoring non-numeric properties.
            while (length--) {
                if (!eq(a[length], b[length], aStack, bStack)) return false;
            }
        } else {
            // Deep compare objects.
            var keys = Object.keys(a), key;
            length = keys.length;
            // Ensure that both objects contain the same number of properties before comparing deep equality.
            if (Object.keys(b).length !== length) return false;
            while (length--) {
                // Deep compare each member
                key = keys[length];
                if (!(b[key]!==undefined && eq(a[key], b[key], aStack, bStack))) return false;
            }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return true;
    };

    var undefined, nextId = 0;
    function advise(dispatcher, type, advice, receiveArguments){
        var previous = dispatcher[type];
        var around = type == "around";
        var signal;
        if(around){
            var advised = advice(function(){
                return previous.advice(this, arguments);
            });
            signal = {
                remove: function(){
                    if(advised){
                        advised = dispatcher = advice = null;
                    }
                },
                advice: function(target, args){
                    return advised ?
                        advised.apply(target, args) :  // called the advised function
                        previous.advice(target, args); // cancelled, skip to next one
                }
            };
        }else{
            // create the remove handler
            signal = {
                remove: function(){
                    if(signal.advice){
                        var previous = signal.previous;
                        var next = signal.next;
                        if(!next && !previous){
                            delete dispatcher[type];
                        }else{
                            if(previous){
                                previous.next = next;
                            }else{
                                dispatcher[type] = next;
                            }
                            if(next){
                                next.previous = previous;
                            }
                        }

                        // remove the advice to signal that this signal has been removed
                        dispatcher = advice = signal.advice = null;
                    }
                },
                id: nextId++,
                advice: advice,
                receiveArguments: receiveArguments
            };
        }
        if(previous && !around){
            if(type == "after"){
                // add the listener to the end of the list
                // note that we had to change this loop a little bit to workaround a bizarre IE10 JIT bug
                while(previous.next && (previous = previous.next)){}
                previous.next = signal;
                signal.previous = previous;
            }else if(type == "before"){
                // add to beginning
                dispatcher[type] = signal;
                signal.next = previous;
                previous.previous = signal;
            }
        }else{
            // around or first one just replaces
            dispatcher[type] = signal;
        }
        return signal;
    }
    function aspect(type){
        return function(target, methodName, advice, receiveArguments){
            var existing = target[methodName], dispatcher;
            if(!existing || existing.target != target){
                // no dispatcher in place
                target[methodName] = dispatcher = function(){
                    var executionId = nextId;
                    // before advice
                    var args = arguments;
                    var before = dispatcher.before;
                    while(before){
                        args = before.advice.apply(this, args) || args;
                        before = before.next;
                    }
                    // around advice
                    if(dispatcher.around){
                        var results = dispatcher.around.advice(this, args);
                    }
                    // after advice
                    var after = dispatcher.after;
                    while(after && after.id < executionId){
                        if(after.receiveArguments){
                            var newResults = after.advice.apply(this, args);
                            // change the return value only if a new value was returned
                            results = newResults === undefined ? results : newResults;
                        }else{
                            results = after.advice.call(this, results, args);
                        }
                        after = after.next;
                    }
                    return results;
                };
                if(existing){
                    dispatcher.around = {advice: function(target, args){
                        return existing.apply(target, args);
                    }};
                }
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    var f1 = function() {
        function extendClass(ctor, props, options) {
            // Copy the properties to the prototype of the class.
            var proto = ctor.prototype,
                _super = ctor.superclass.prototype,
                noOverrided = options && options.noOverrided;

            for (var name in props) {
                if (name === "constructor") {
                    continue;
                }

                // Check if we're overwriting an existing function
                var prop = props[name];
                if (typeof props[name] == "function") {
                    proto[name] =  !prop._constructor && !noOverrided && typeof _super[name] == "function" ?
                          (function(name, fn, superFn) {
                            return function() {
                                var tmp = this.overrided;

                                // Add a new ._super() method that is the same method
                                // but on the super-class
                                this.overrided = superFn;

                                // The method only need to be bound temporarily, so we
                                // remove it when we're done executing
                                var ret = fn.apply(this, arguments);

                                this.overrided = tmp;

                                return ret;
                            };
                        })(name, prop, _super[name]) :
                        prop;
                } else if (typeof prop == "object" && prop!==null && (prop.get)) {
                    Object.defineProperty(proto,name,prop);
                } else {
                    proto[name] = prop;
                }
            }
            return ctor;
        }

        function serialMixins(ctor,mixins) {
            var result = [];

            mixins.forEach(function(mixin){
                if (has(mixin,"__mixins__")) {
                     throw new Error("nested mixins");
                }
                var clss = [];
                while (mixin) {
                    clss.unshift(mixin);
                    mixin = mixin.superclass;
                }
                result = result.concat(clss);
            });

            result = uniq(result);

            result = result.filter(function(mixin){
                var cls = ctor;
                while (cls) {
                    if (mixin === cls) {
                        return false;
                    }
                    if (has(cls,"__mixins__")) {
                        var clsMixines = cls["__mixins__"];
                        for (var i=0; i<clsMixines.length;i++) {
                            if (clsMixines[i]===mixin) {
                                return false;
                            }
                        }
                    }
                    cls = cls.superclass;
                }
                return true;
            });

            if (result.length>0) {
                return result;
            } else {
                return false;
            }
        }

        function mergeMixins(ctor,mixins) {
            var newCtor =ctor;
            for (var i=0;i<mixins.length;i++) {
                var xtor = new Function();
                xtor.prototype = Object.create(newCtor.prototype);
                xtor.__proto__ = newCtor;
                xtor.superclass = null;
                mixin(xtor.prototype,mixins[i].prototype);
                xtor.prototype.__mixin__ = mixins[i];
                newCtor = xtor;
            }

            return newCtor;
        }

        return function createClass(props, parent, mixins,options) {
            if (isArray(parent)) {
                options = mixins;
                mixins = parent;
                parent = null;
            }
            parent = parent || Object;

            if (isDefined(mixins) && !isArray(mixins)) {
                options = mixins;
                mixins = false;
            }

            var innerParent = parent;

            if (mixins) {
                mixins = serialMixins(innerParent,mixins);
            }

            if (mixins) {
                innerParent = mergeMixins(innerParent,mixins);
            }


            var _constructor = props.constructor;
            if (_constructor === Object) {
                _constructor = function() {
                    if (this.init) {
                        return this.init.apply(this, arguments);
                    }
                };
            };

            var klassName = props.klassName || "",
                ctor = new Function(
                    "return function " + klassName + "() {" +
                    "var inst = this," +
                    " ctor = arguments.callee;" +
                    "if (!(inst instanceof ctor)) {" +
                    "inst = Object.create(ctor.prototype);" +
                    "}" +
                    "return ctor._constructor.apply(inst, arguments) || inst;" + 
                    "}"
                )();


            ctor._constructor = _constructor;
            // Populate our constructed prototype object
            ctor.prototype = Object.create(innerParent.prototype);

            // Enforce the constructor to be what we expect
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent;

            // And make this class extendable
            ctor.__proto__ = innerParent;

            if (mixins) {
                ctor.__mixins__ = mixins;
            }

            if (!ctor.partial) {
                ctor.partial = function(props, options) {
                    return extendClass(this, props, options);
                };
            }
            if (!ctor.inherit) {
                ctor.inherit = function(props, mixins,options) {
                    return createClass(props, this, mixins,options);
                };
            }

            ctor.partial(props, options);

            return ctor;
        };
    }

    var createClass = f1();


    // Retrieve all the property names of an object.
    function allKeys(obj) {
        if (!isObject(obj)) return [];
        var keys = [];
        for (var key in obj) keys.push(key);
        return keys;
    }

    function createEvent(type, props) {
        var e = new CustomEvent(type, props);

        return safeMixin(e, props);
    }
    
    function debounce(fn, wait) {
        var timeout,
            args,
            later = function() {
                fn.apply(null, args);
            };

        return function() {
            args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    var delegate = (function() {
        // boodman/crockford delegation w/ cornford optimization
        function TMP() {}
        return function(obj, props) {
            TMP.prototype = obj;
            var tmp = new TMP();
            TMP.prototype = null;
            if (props) {
                mixin(tmp, props);
            }
            return tmp; // Object
        };
    })();


    // Retrieve the values of an object's properties.
    function values(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
        }
        return values;
    }
    
    function clone( /*anything*/ src,checkCloneMethod) {
        var copy;
        if (src === undefined || src === null) {
            copy = src;
        } else if (checkCloneMethod && src.clone) {
            copy = src.clone();
        } else if (isArray(src)) {
            copy = [];
            for (var i = 0; i < src.length; i++) {
                copy.push(clone(src[i]));
            }
        } else if (isPlainObject(src)) {
            copy = {};
            for (var key in src) {
                copy[key] = clone(src[key]);
            }
        } else {
            copy = src;
        }

        return copy;

    }

    function compact(array) {
        return filter.call(array, function(item) {
            return item != null;
        });
    }

    /*
     * Converts camel case into dashes.
     * @param {String} str
     * @return {String}
     * @exapmle marginTop -> margin-top
     */
    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase();
    }

    function deserializeValue(value) {
        try {
            return value ?
                value == "true" ||
                (value == "false" ? false :
                    value == "null" ? null :
                    +value + "" == value ? +value :
                    /^[\[\{]/.test(value) ? JSON.parse(value) :
                    value) : value;
        } catch (e) {
            return value;
        }
    }

    function each(obj, callback) {
        var length, key, i, undef, value;

        if (obj) {
            length = obj.length;

            if (length === undef) {
                // Loop object items
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        value = obj[key];
                        if (callback.call(value, key, value) === false) {
                            break;
                        }
                    }
                }
            } else {
                // Loop array items
                for (i = 0; i < length; i++) {
                    value = obj[i];
                    if (callback.call(value, i, value) === false) {
                        break;
                    }
                }
            }
        }

        return this;
    }

    function flatten(array) {
        if (isArrayLike(array)) {
            var result = [];
            for (var i = 0; i < array.length; i++) {
                var item = array[i];
                if (isArrayLike(item)) {
                    for (var j = 0; j < item.length; j++) {
                        result.push(item[j]);
                    }
                } else {
                    result.push(item);
                }
            }
            return result;
        } else {
            return array;
        }
        //return array.length > 0 ? concat.apply([], array) : array;
    }

    function funcArg(context, arg, idx, payload) {
        return isFunction(arg) ? arg.call(context, idx, payload) : arg;
    }

    var getAbsoluteUrl = (function() {
        var a;

        return function(url) {
            if (!a) a = document.createElement('a');
            a.href = url;

            return a.href;
        };
    })();

    function getQueryParams(url) {
        var url = url || window.location.href,
            segs = url.split("?"),
            params = {};

        if (segs.length > 1) {
            segs[1].split("&").forEach(function(queryParam) {
                var nv = queryParam.split('=');
                params[nv[0]] = nv[1];
            });
        }
        return params;
    }

    function grep(array, callback) {
        var out = [];

        each(array, function(i, item) {
            if (callback(item, i)) {
                out.push(item);
            }
        });

        return out;
    }


    function has(obj, path) {
        if (!isArray(path)) {
            return obj != null && hasOwnProperty.call(obj, path);
        }
        var length = path.length;
        for (var i = 0; i < length; i++) {
            var key = path[i];
            if (obj == null || !hasOwnProperty.call(obj, key)) {
                return false;
            }
            obj = obj[key];
        }
        return !!length;
    }

    function inArray(item, array) {
        if (!array) {
            return -1;
        }
        var i;

        if (array.indexOf) {
            return array.indexOf(item);
        }

        i = array.length;
        while (i--) {
            if (array[i] === item) {
                return i;
            }
        }

        return -1;
    }

    function inherit(ctor, base) {
        var f = function() {};
        f.prototype = base.prototype;

        ctor.prototype = new f();
    }

    function isArray(object) {
        return object && object.constructor === Array;
    }

    function isArrayLike(obj) {
        return !isString(obj) && !isHtmlNode(obj) && typeof obj.length == 'number' && !isFunction(obj);
    }

    function isBoolean(obj) {
        return typeof(obj) === "boolean";
    }

    function isDocument(obj) {
        return obj != null && obj.nodeType == obj.DOCUMENT_NODE;
    }



  // Perform a deep comparison to check if two objects are equal.
    function isEqual(a, b) {
        return eq(a, b);
    }

    function isFunction(value) {
        return type(value) == "function";
    }

    function isObject(obj) {
        return type(obj) == "object";
    }

    function isPlainObject(obj) {
        return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype;
    }

    function isString(obj) {
        return typeof obj === 'string';
    }

    function isWindow(obj) {
        return obj && obj == obj.window;
    }

    function isDefined(obj) {
        return typeof obj !== 'undefined';
    }

    function isHtmlNode(obj) {
        return obj && (obj instanceof Node);
    }

    function isInstanceOf( /*Object*/ value, /*Type*/ type) {
        //Tests whether the value is an instance of a type.
        if (value === undefined) {
            return false;
        } else if (value === null || type == Object) {
            return true;
        } else if (typeof value === "number") {
            return type === Number;
        } else if (typeof value === "string") {
            return type === String;
        } else if (typeof value === "boolean") {
            return type === Boolean;
        } else if (typeof value === "string") {
            return type === String;
        } else {
            return (value instanceof type) || (value && value.isInstanceOf ? value.isInstanceOf(type) : false);
        }
    }

    function isNumber(obj) {
        return typeof obj == 'number';
    }

    function isSameOrigin(href) {
        if (href) {
            var origin = location.protocol + '//' + location.hostname;
            if (location.port) {
                origin += ':' + location.port;
            }
            return href.startsWith(origin);
        }
    }


    function isEmptyObject(obj) {
        var name;
        for (name in obj) {
            if (obj[name] !== null) {
                return false;
            }
        }
        return true;
    }

    // Returns whether an object has a given set of `key:value` pairs.
    function isMatch(object, attrs) {
        var keys = keys(attrs), length = keys.length;
        if (object == null) return !length;
        var obj = Object(object);
        for (var i = 0; i < length; i++) {
          var key = keys[i];
          if (attrs[key] !== obj[key] || !(key in obj)) return false;
        }
        return true;
    }    

    // Retrieve the names of an object's own properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`.
    function keys(obj) {
        if (isObject(obj)) return [];
        var keys = [];
        for (var key in obj) if (has(obj, key)) keys.push(key);
        return keys;
    }

    function makeArray(obj, offset, startWith) {
       if (isArrayLike(obj) ) {
        return (startWith || []).concat(Array.prototype.slice.call(obj, offset || 0));
      }

      // array of single index
      return [ obj ];             
    }



    function map(elements, callback) {
        var value, values = [],
            i, key
        if (isArrayLike(elements))
            for (i = 0; i < elements.length; i++) {
                value = callback.call(elements[i], elements[i], i);
                if (value != null) values.push(value)
            }
        else
            for (key in elements) {
                value = callback.call(elements[key], elements[key], key);
                if (value != null) values.push(value)
            }
        return flatten(values)
    }

    function defer(fn) {
        if (requestAnimationFrame) {
            requestAnimationFrame(fn);
        } else {
            setTimeoutout(fn);
        }
        return this;
    }

    function noop() {
    }

    function proxy(fn, context) {
        var args = (2 in arguments) && slice.call(arguments, 2)
        if (isFunction(fn)) {
            var proxyFn = function() {
                return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments);
            }
            return proxyFn;
        } else if (isString(context)) {
            if (args) {
                args.unshift(fn[context], fn)
                return proxy.apply(null, args)
            } else {
                return proxy(fn[context], fn);
            }
        } else {
            throw new TypeError("expected function");
        }
    }


    function toPixel(value) {
        // style values can be floats, client code may want
        // to round for integer pixels.
        return parseFloat(value) || 0;
    }

    var type = (function() {
        var class2type = {};

        // Populate the class2type map
        each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
            class2type["[object " + name + "]"] = name.toLowerCase();
        });

        return function type(obj) {
            return obj == null ? String(obj) :
                class2type[toString.call(obj)] || "object";
        };
    })();

    function trim(str) {
        return str == null ? "" : String.prototype.trim.call(str);
    }

    function removeItem(items, item) {
        if (isArray(items)) {
            var idx = items.indexOf(item);
            if (idx != -1) {
                items.splice(idx, 1);
            }
        } else if (isPlainObject(items)) {
            for (var key in items) {
                if (items[key] == item) {
                    delete items[key];
                    break;
                }
            }
        }

        return this;
    }

    function _mixin(target, source, deep, safe) {
        for (var key in source) {
            //if (!source.hasOwnProperty(key)) {
            //    continue;
            //}
            if (safe && target[key] !== undefined) {
                continue;
            }
            if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
                    target[key] = {};
                }
                if (isArray(source[key]) && !isArray(target[key])) {
                    target[key] = [];
                }
                _mixin(target[key], source[key], deep, safe);
            } else if (source[key] !== undefined) {
                target[key] = source[key]
            }
        }
        return target;
    }

    function _parseMixinArgs(args) {
        var params = slice.call(arguments, 0),
            target = params.shift(),
            deep = false;
        if (isBoolean(params[params.length - 1])) {
            deep = params.pop();
        }

        return {
            target: target,
            sources: params,
            deep: deep
        };
    }

    function mixin() {
        var args = _parseMixinArgs.apply(this, arguments);

        args.sources.forEach(function(source) {
            _mixin(args.target, source, args.deep, false);
        });
        return args.target;
    }

    function result(obj, path, fallback) {
        if (!isArray(path)) {
            path = [path]
        };
        var length = path.length;
        if (!length) {
          return isFunction(fallback) ? fallback.call(obj) : fallback;
        }
        for (var i = 0; i < length; i++) {
          var prop = obj == null ? void 0 : obj[path[i]];
          if (prop === void 0) {
            prop = fallback;
            i = length; // Ensure we don't continue iterating.
          }
          obj = isFunction(prop) ? prop.call(obj) : prop;
        }

        return obj;
    }

    function safeMixin() {
        var args = _parseMixinArgs.apply(this, arguments);

        args.sources.forEach(function(source) {
            _mixin(args.target, source, args.deep, true);
        });
        return args.target;
    }

    function substitute( /*String*/ template,
        /*Object|Array*/
        map,
        /*Function?*/
        transform,
        /*Object?*/
        thisObject) {
        // summary:
        //    Performs parameterized substitutions on a string. Throws an
        //    exception if any parameter is unmatched.
        // template:
        //    a string with expressions in the form `${key}` to be replaced or
        //    `${key:format}` which specifies a format function. keys are case-sensitive.
        // map:
        //    hash to search for substitutions
        // transform:
        //    a function to process all parameters before substitution takes


        thisObject = thisObject || window;
        transform = transform ?
            proxy(thisObject, transform) : function(v) {
                return v;
            };

        function getObject(key, map) {
            if (key.match(/\./)) {
                var retVal,
                    getValue = function(keys, obj) {
                        var _k = keys.pop();
                        if (_k) {
                            if (!obj[_k]) return null;
                            return getValue(keys, retVal = obj[_k]);
                        } else {
                            return retVal;
                        }
                    };
                return getValue(key.split(".").reverse(), map);
            } else {
                return map[key];
            }
        }

        return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
            function(match, key, format) {
                var value = getObject(key, map);
                if (format) {
                    value = getObject(format, thisObject).call(thisObject, value, key);
                }
                return transform(value, key).toString();
            }); // String
    }

    var _uid = 1;

    function uid(obj) {
        return obj._uid || (obj._uid = _uid++);
    }

    function uniq(array) {
        return filter.call(array, function(item, idx) {
            return array.indexOf(item) == idx;
        })
    }

    var idCounter = 0;
    function uniqueId (prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    }

    var Deferred = function() {
        var self = this,
            p = this.promise = new Promise(function(resolve, reject) {
                self._resolve = resolve;
                self._reject = reject;
            }),
           added = {
                state : function() {
                    if (self.isResolved()) {
                        return 'resolved';
                    }
                    if (self.isRejected()) {
                        return 'rejected';
                    }
                    return 'pending';
                },
                then : function(onResolved,onRejected,onProgress) {
                    if (onProgress) {
                        this.progress(onProgress);
                    }
                    return mixin(Promise.prototype.then.call(this,
                            onResolved && function(args) {
                                if (args && args.__ctx__ !== undefined) {
                                    return onResolved.apply(args.__ctx__,args);
                                } else {
                                    return onResolved(args);
                                }
                            },
                            onRejected && function(args){
                                if (args && args.__ctx__ !== undefined) {
                                    return onRejected.apply(args.__ctx__,args);
                                } else {
                                    return onRejected(args);
                                }
                            }),added);
                },
                always: function(handler) {
                    //this.done(handler);
                    //this.fail(handler);
                    this.then(handler,handler);
                    return this;
                },
                done : function(handler) {
                    return this.then(handler);
                },
                fail : function(handler) { 
                    //return mixin(Promise.prototype.catch.call(this,handler),added);
                    return this.then(null,handler);
                }, 
                progress : function(handler) {
                    self[PGLISTENERS].push(handler);
                    return this;
                }

            };

        added.pipe = added.then;
        mixin(p,added);

        this[PGLISTENERS] = [];

        //this.resolve = Deferred.prototype.resolve.bind(this);
        //this.reject = Deferred.prototype.reject.bind(this);
        //this.progress = Deferred.prototype.progress.bind(this);

    };

    Deferred.prototype.resolve = function(value) {
        var args = slice.call(arguments);
        return this.resolveWith(null,args);
    };

    Deferred.prototype.resolveWith = function(context,args) {
        args = args ? makeArray(args) : []; 
        args.__ctx__ = context;
        this._resolve(args);
        this._resolved = true;
        return this;
    };

    Deferred.prototype.progress = function(value) {
        try {
          return this[PGLISTENERS].forEach(function (listener) {
            return listener(value);
          });
        } catch (error) {
          this.reject(error);
        }
        return this;
    };

    Deferred.prototype.reject = function(reason) {
        var args = slice.call(arguments);
        return this.rejectWith(null,args);
    };

    Deferred.prototype.rejectWith = function(context,args) {
        args = args ? makeArray(args) : []; 
        args.__ctx__ = context;
        this._reject(args);
        this._rejected = true;
        return this;
    };

    Deferred.prototype.isResolved = function() {
        return !!this._resolved;
    };

    Deferred.prototype.isRejected = function() {
        return !!this._rejected;
    };

    Deferred.prototype.then = function(callback, errback, progback) {
        var p = result(this,"promise");
        return p.then(callback, errback, progback);
    };

    Deferred.prototype.done  = Deferred.prototype.then;

    Deferred.all = function(array) {
        return Promise.all(array);
    };

    Deferred.first = function(array) {
        return Promise.race(array);
    };


    Deferred.when = function(valueOrPromise, callback, errback, progback) {
        var receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";
        var nativePromise = receivedPromise && valueOrPromise instanceof Promise;

        if (!receivedPromise) {
            if (arguments.length > 1) {
                return callback ? callback(valueOrPromise) : valueOrPromise;
            } else {
                return new Deferred().resolve(valueOrPromise);
            }
//        } else if (!nativePromise) {
//            var deferred = new Deferred(valueOrPromise.cancel);
//            valueOrPromise.then(deferred.resolve, deferred.reject, deferred.progress);
//            valueOrPromise = deferred.promise;
        }

        if (callback || errback || progback) {
            return valueOrPromise.then(callback, errback, progback);
        }
        return valueOrPromise;
    };

    Deferred.reject = function(err) {
        var d = new Deferred();
        d.reject(err);
        return d.promise;
    };

    Deferred.resolve = function(data) {
        var d = new Deferred();
        d.resolve(data);
        return d.promise;
    };

    Deferred.immediate = Deferred.resolve;

    var Evented = createClass({
        on: function(events, selector, data, callback, ctx, /*used internally*/ one) {
            var self = this,
                _hub = this._hub || (this._hub = {});

            if (isPlainObject(events)) {
                ctx = callback;
                each(events, function(type, fn) {
                    self.on(type, selector, data, fn, ctx, one);
                });
                return this;
            }

            if (!isString(selector) && !isFunction(callback)) {
                ctx = callback;
                callback = data;
                data = selector;
                selector = undefined;
            }

            if (isFunction(data)) {
                ctx = callback;
                callback = data;
                data = null;
            }

            if (isString(events)) {
                events = events.split(/\s/)
            }

            events.forEach(function(name) {
                (_hub[name] || (_hub[name] = [])).push({
                    fn: callback,
                    selector: selector,
                    data: data,
                    ctx: ctx,
                    one: one
                });
            });

            return this;
        },

        one: function(events, selector, data, callback, ctx) {
            return this.on(events, selector, data, callback, ctx, 1);
        },

        trigger: function(e /*,argument list*/ ) {
            if (!this._hub) {
                return this;
            }

            var self = this;

            if (isString(e)) {
                e = new CustomEvent(e);
            }

            Object.defineProperty(e,"target",{
                value : this
            });

            var args = slice.call(arguments, 1);
            if (isDefined(args)) {
                args = [e].concat(args);
            } else {
                args = [e];
            }
            [e.type || e.name, "all"].forEach(function(eventName) {
                var listeners = self._hub[eventName];
                if (!listeners) {
                    return;
                }

                var len = listeners.length,
                    reCompact = false;

                for (var i = 0; i < len; i++) {
                    var listener = listeners[i];
                    if (e.data) {
                        if (listener.data) {
                            e.data = mixin({}, listener.data, e.data);
                        }
                    } else {
                        e.data = listener.data || null;
                    }
                    listener.fn.apply(listener.ctx, args);
                    if (listener.one) {
                        listeners[i] = null;
                        reCompact = true;
                    }
                }

                if (reCompact) {
                    self._hub[eventName] = compact(listeners);
                }

            });
            return this;
        },

        listened: function(event) {
            var evtArr = ((this._hub || (this._events = {}))[event] || []);
            return evtArr.length > 0;
        },

        listenTo: function(obj, event, callback, /*used internally*/ one) {
            if (!obj) {
                return this;
            }

            // Bind callbacks on obj,
            if (isString(callback)) {
                callback = this[callback];
            }

            if (one) {
                obj.one(event, callback, this);
            } else {
                obj.on(event, callback, this);
            }

            //keep track of them on listening.
            var listeningTo = this._listeningTo || (this._listeningTo = []),
                listening;

            for (var i = 0; i < listeningTo.length; i++) {
                if (listeningTo[i].obj == obj) {
                    listening = listeningTo[i];
                    break;
                }
            }
            if (!listening) {
                listeningTo.push(
                    listening = {
                        obj: obj,
                        events: {}
                    }
                );
            }
            var listeningEvents = listening.events,
                listeningEvent = listeningEvents[event] = listeningEvents[event] || [];
            if (listeningEvent.indexOf(callback) == -1) {
                listeningEvent.push(callback);
            }

            return this;
        },

        listenToOnce: function(obj, event, callback) {
            return this.listenTo(obj, event, callback, 1);
        },

        off: function(events, callback) {
            var _hub = this._hub || (this._hub = {});
            if (isString(events)) {
                events = events.split(/\s/)
            }

            events.forEach(function(name) {
                var evts = _hub[name];
                var liveEvents = [];

                if (evts && callback) {
                    for (var i = 0, len = evts.length; i < len; i++) {
                        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
                            liveEvents.push(evts[i]);
                    }
                }

                if (liveEvents.length) {
                    _hub[name] = liveEvents;
                } else {
                    delete _hub[name];
                }
            });

            return this;
        },
        unlistenTo: function(obj, event, callback) {
            var listeningTo = this._listeningTo;
            if (!listeningTo) {
                return this;
            }
            for (var i = 0; i < listeningTo.length; i++) {
                var listening = listeningTo[i];

                if (obj && obj != listening.obj) {
                    continue;
                }

                var listeningEvents = listening.events;
                for (var eventName in listeningEvents) {
                    if (event && event != eventName) {
                        continue;
                    }

                    var listeningEvent = listeningEvents[eventName];

                    for (var j = 0; j < listeningEvent.length; j++) {
                        if (!callback || callback == listeningEvent[i]) {
                            listening.obj.off(eventName, listeningEvent[i], this);
                            listeningEvent[i] = null;
                        }
                    }

                    listeningEvent = listeningEvents[eventName] = compact(listeningEvent);

                    if (isEmptyObject(listeningEvent)) {
                        listeningEvents[eventName] = null;
                    }

                }

                if (isEmptyObject(listeningEvents)) {
                    listeningTo[i] = null;
                }
            }

            listeningTo = this._listeningTo = compact(listeningTo);
            if (isEmptyObject(listeningTo)) {
                this._listeningTo = null;
            }

            return this;
        }
    });

    var Stateful = Evented.inherit({
        init : function(attributes, options) {
            var attrs = attributes || {};
            options || (options = {});
            this.cid = uniqueId(this.cidPrefix);
            this.attributes = {};
            if (options.collection) this.collection = options.collection;
            if (options.parse) attrs = this.parse(attrs, options) || {};
            var defaults = result(this, 'defaults');
            attrs = mixin({}, defaults, attrs);
            this.set(attrs, options);
            this.changed = {};
        },

        // A hash of attributes whose current and previous value differ.
        changed: null,

        // The value returned during the last failed validation.
        validationError: null,

        // The default name for the JSON `id` attribute is `"id"`. MongoDB and
        // CouchDB users may want to set this to `"_id"`.
        idAttribute: 'id',

        // The prefix is used to create the client id which is used to identify models locally.
        // You may want to override this if you're experiencing name clashes with model ids.
        cidPrefix: 'c',


        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
          return clone(this.attributes);
        },


        // Get the value of an attribute.
        get: function(attr) {
          return this.attributes[attr];
        },

        // Returns `true` if the attribute contains a value that is not null
        // or undefined.
        has: function(attr) {
          return this.get(attr) != null;
        },

        // Set a hash of model attributes on the object, firing `"change"`. This is
        // the core primitive operation of a model, updating the data and notifying
        // anyone who needs to know about the change in state. The heart of the beast.
        set: function(key, val, options) {
          if (key == null) return this;

          // Handle both `"key", value` and `{key: value}` -style arguments.
          var attrs;
          if (typeof key === 'object') {
            attrs = key;
            options = val;
          } else {
            (attrs = {})[key] = val;
          }

          options || (options = {});

          // Run validation.
          if (!this._validate(attrs, options)) return false;

          // Extract attributes and options.
          var unset      = options.unset;
          var silent     = options.silent;
          var changes    = [];
          var changing   = this._changing;
          this._changing = true;

          if (!changing) {
            this._previousAttributes = clone(this.attributes);
            this.changed = {};
          }

          var current = this.attributes;
          var changed = this.changed;
          var prev    = this._previousAttributes;

          // For each `set` attribute, update or delete the current value.
          for (var attr in attrs) {
            val = attrs[attr];
            if (!isEqual(current[attr], val)) changes.push(attr);
            if (!isEqual(prev[attr], val)) {
              changed[attr] = val;
            } else {
              delete changed[attr];
            }
            unset ? delete current[attr] : current[attr] = val;
          }

          // Update the `id`.
          if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

          // Trigger all relevant attribute changes.
          if (!silent) {
            if (changes.length) this._pending = options;
            for (var i = 0; i < changes.length; i++) {
              this.trigger('change:' + changes[i], this, current[changes[i]], options);
            }
          }

          // You might be wondering why there's a `while` loop here. Changes can
          // be recursively nested within `"change"` events.
          if (changing) return this;
          if (!silent) {
            while (this._pending) {
              options = this._pending;
              this._pending = false;
              this.trigger('change', this, options);
            }
          }
          this._pending = false;
          this._changing = false;
          return this;
        },

        // Remove an attribute from the model, firing `"change"`. `unset` is a noop
        // if the attribute doesn't exist.
        unset: function(attr, options) {
          return this.set(attr, void 0, mixin({}, options, {unset: true}));
        },

        // Clear all attributes on the model, firing `"change"`.
        clear: function(options) {
          var attrs = {};
          for (var key in this.attributes) attrs[key] = void 0;
          return this.set(attrs, mixin({}, options, {unset: true}));
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
          if (attr == null) return !isEmptyObject(this.changed);
          return this.changed[attr] !== undefined;
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function(diff) {
          if (!diff) return this.hasChanged() ? clone(this.changed) : false;
          var old = this._changing ? this._previousAttributes : this.attributes;
          var changed = {};
          for (var attr in diff) {
            var val = diff[attr];
            if (isEqual(old[attr], val)) continue;
            changed[attr] = val;
          }
          return !isEmptyObject(changed) ? changed : false;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
          if (attr == null || !this._previousAttributes) return null;
          return this._previousAttributes[attr];
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
          return clone(this._previousAttributes);
        },

        // Create a new model with identical attributes to this one.
        clone: function() {
          return new this.constructor(this.attributes);
        },

        // A model is new if it has never been saved to the server, and lacks an id.
        isNew: function() {
          return !this.has(this.idAttribute);
        },

        // Check if the model is currently in a valid state.
        isValid: function(options) {
          return this._validate({}, mixin({}, options, {validate: true}));
        },

        // Run validation against the next complete set of model attributes,
        // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
        _validate: function(attrs, options) {
          if (!options.validate || !this.validate) return true;
          attrs = mixin({}, this.attributes, attrs);
          var error = this.validationError = this.validate(attrs, options) || null;
          if (!error) return true;
          this.trigger('invalid', this, error, mixin(options, {validationError: error}));
          return false;
        }
    });

    var SimpleQueryEngine = function(query, options){
        // summary:
        //      Simple query engine that matches using filter functions, named filter
        //      functions or objects by name-value on a query object hash
        //
        // description:
        //      The SimpleQueryEngine provides a way of getting a QueryResults through
        //      the use of a simple object hash as a filter.  The hash will be used to
        //      match properties on data objects with the corresponding value given. In
        //      other words, only exact matches will be returned.
        //
        //      This function can be used as a template for more complex query engines;
        //      for example, an engine can be created that accepts an object hash that
        //      contains filtering functions, or a string that gets evaluated, etc.
        //
        //      When creating a new dojo.store, simply set the store's queryEngine
        //      field as a reference to this function.
        //
        // query: Object
        //      An object hash with fields that may match fields of items in the store.
        //      Values in the hash will be compared by normal == operator, but regular expressions
        //      or any object that provides a test() method are also supported and can be
        //      used to match strings by more complex expressions
        //      (and then the regex's or object's test() method will be used to match values).
        //
        // options: dojo/store/api/Store.QueryOptions?
        //      An object that contains optional information such as sort, start, and count.
        //
        // returns: Function
        //      A function that caches the passed query under the field "matches".  See any
        //      of the "query" methods on dojo.stores.
        //
        // example:
        //      Define a store with a reference to this engine, and set up a query method.
        //
        //  |   var myStore = function(options){
        //  |       //  ...more properties here
        //  |       this.queryEngine = SimpleQueryEngine;
        //  |       //  define our query method
        //  |       this.query = function(query, options){
        //  |           return QueryResults(this.queryEngine(query, options)(this.data));
        //  |       };
        //  |   };

        // create our matching query function
        switch(typeof query){
            default:
                throw new Error("Can not query with a " + typeof query);
            case "object": case "undefined":
                var queryObject = query;
                query = function(object){
                    for(var key in queryObject){
                        var required = queryObject[key];
                        if(required && required.test){
                            // an object can provide a test method, which makes it work with regex
                            if(!required.test(object[key], object)){
                                return false;
                            }
                        }else if(required != object[key]){
                            return false;
                        }
                    }
                    return true;
                };
                break;
            case "string":
                // named query
                if(!this[query]){
                    throw new Error("No filter function " + query + " was found in store");
                }
                query = this[query];
                // fall through
            case "function":
                // fall through
        }
        
        function filter(arr, callback, thisObject){
            // summary:
            //      Returns a new Array with those items from arr that match the
            //      condition implemented by callback.
            // arr: Array
            //      the array to iterate over.
            // callback: Function|String
            //      a function that is invoked with three arguments (item,
            //      index, array). The return of this function is expected to
            //      be a boolean which determines whether the passed-in item
            //      will be included in the returned array.
            // thisObject: Object?
            //      may be used to scope the call to callback
            // returns: Array
            // description:
            //      This function corresponds to the JavaScript 1.6 Array.filter() method, with one difference: when
            //      run over sparse arrays, this implementation passes the "holes" in the sparse array to
            //      the callback function with a value of undefined. JavaScript 1.6's filter skips the holes in the sparse array.
            //      For more details, see:
            //      https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
            // example:
            //  | // returns [2, 3, 4]
            //  | array.filter([1, 2, 3, 4], function(item){ return item>1; });

            // TODO: do we need "Ctr" here like in map()?
            var i = 0, l = arr && arr.length || 0, out = [], value;
            if(l && typeof arr == "string") arr = arr.split("");
            if(typeof callback == "string") callback = cache[callback] || buildFn(callback);
            if(thisObject){
                for(; i < l; ++i){
                    value = arr[i];
                    if(callback.call(thisObject, value, i, arr)){
                        out.push(value);
                    }
                }
            }else{
                for(; i < l; ++i){
                    value = arr[i];
                    if(callback(value, i, arr)){
                        out.push(value);
                    }
                }
            }
            return out; // Array
        }

        function execute(array){
            // execute the whole query, first we filter
            var results = filter(array, query);
            // next we sort
            var sortSet = options && options.sort;
            if(sortSet){
                results.sort(typeof sortSet == "function" ? sortSet : function(a, b){
                    for(var sort, i=0; sort = sortSet[i]; i++){
                        var aValue = a[sort.attribute];
                        var bValue = b[sort.attribute];
                        // valueOf enables proper comparison of dates
                        aValue = aValue != null ? aValue.valueOf() : aValue;
                        bValue = bValue != null ? bValue.valueOf() : bValue;
                        if (aValue != bValue){
                            // modified by lwf 2016/07/09
                            //return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                            return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                        }
                    }
                    return 0;
                });
            }
            // now we paginate
            if(options && (options.start || options.count)){
                var total = results.length;
                results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
                results.total = total;
            }
            return results;
        }
        execute.matches = query;
        return execute;
    };

    var QueryResults = function(results){
        // summary:
        //      A function that wraps the results of a store query with additional
        //      methods.
        // description:
        //      QueryResults is a basic wrapper that allows for array-like iteration
        //      over any kind of returned data from a query.  While the simplest store
        //      will return a plain array of data, other stores may return deferreds or
        //      promises; this wrapper makes sure that *all* results can be treated
        //      the same.
        //
        //      Additional methods include `forEach`, `filter` and `map`.
        // results: Array|dojo/promise/Promise
        //      The result set as an array, or a promise for an array.
        // returns:
        //      An array-like object that can be used for iterating over.
        // example:
        //      Query a store and iterate over the results.
        //
        //  |   store.query({ prime: true }).forEach(function(item){
        //  |       //  do something
        //  |   });

        if(!results){
            return results;
        }

        var isPromise = !!results.then;
        // if it is a promise it may be frozen
        if(isPromise){
            results = Object.delegate(results);
        }
        function addIterativeMethod(method){
            // Always add the iterative methods so a QueryResults is
            // returned whether the environment is ES3 or ES5
            results[method] = function(){
                var args = arguments;
                var result = Deferred.when(results, function(results){
                    //Array.prototype.unshift.call(args, results);
                    return QueryResults(Array.prototype[method].apply(results, args));
                });
                // forEach should only return the result of when()
                // when we're wrapping a promise
                if(method !== "forEach" || isPromise){
                    return result;
                }
            };
        }

        addIterativeMethod("forEach");
        addIterativeMethod("filter");
        addIterativeMethod("map");
        if(results.total == null){
            results.total = Deferred.when(results, function(results){
                return results.length;
            });
        }
        return results; // Object
    };

    var async = {
        parallel : function(arr,args,ctx) {
            var rets = [];
            ctx = ctx || null;
            args = args || [];

            each(arr,function(i,func){
                rets.push(func.apply(ctx,args));
            });

            return Deferred.all(rets);
        },

        series : function(arr,args,ctx) {
            var rets = [],
                d = new Deferred(),
                p = d.promise;

            ctx = ctx || null;
            args = args || [];

            d.resolve();
            each(arr,function(i,func){
                p = p.then(function(){
                    return func.apply(ctx,args);
                });
                rets.push(p);
            });

            return Deferred.all(rets);
        },

        waterful : function(arr,args,ctx) {
            var d = new Deferred(),
                p = d.promise;

            ctx = ctx || null;
            args = args || [];

            d.resolveWith(ctx,args);

            each(arr,function(i,func){
                p = p.then(func);
            });
            return p;
        }
    };

    var ArrayStore = createClass({
        "klassName": "ArrayStore",

        "queryEngine": SimpleQueryEngine,
        
        "idProperty": "id",


        get: function(id){
            // summary:
            //      Retrieves an object by its identity
            // id: Number
            //      The identity to use to lookup the object
            // returns: Object
            //      The object in the store that matches the given id.
            return this.data[this.index[id]];
        },

        getIdentity: function(object){
            return object[this.idProperty];
        },

        put: function(object, options){
            var data = this.data,
                index = this.index,
                idProperty = this.idProperty;
            var id = object[idProperty] = (options && "id" in options) ? options.id : idProperty in object ? object[idProperty] : Math.random();
            if(id in index){
                // object exists
                if(options && options.overwrite === false){
                    throw new Error("Object already exists");
                }
                // replace the entry in data
                data[index[id]] = object;
            }else{
                // add the new object
                index[id] = data.push(object) - 1;
            }
            return id;
        },

        add: function(object, options){
            (options = options || {}).overwrite = false;
            // call put with overwrite being false
            return this.put(object, options);
        },

        remove: function(id){
            // summary:
            //      Deletes an object by its identity
            // id: Number
            //      The identity to use to delete the object
            // returns: Boolean
            //      Returns true if an object was removed, falsy (undefined) if no object matched the id
            var index = this.index;
            var data = this.data;
            if(id in index){
                data.splice(index[id], 1);
                // now we have to reindex
                this.setData(data);
                return true;
            }
        },
        query: function(query, options){
            // summary:
            //      Queries the store for objects.
            // query: Object
            //      The query to use for retrieving objects from the store.
            // options: dojo/store/api/Store.QueryOptions?
            //      The optional arguments to apply to the resultset.
            // returns: dojo/store/api/Store.QueryResults
            //      The results of the query, extended with iterative methods.
            //
            // example:
            //      Given the following store:
            //
            //  |   var store = new Memory({
            //  |       data: [
            //  |           {id: 1, name: "one", prime: false },
            //  |           {id: 2, name: "two", even: true, prime: true},
            //  |           {id: 3, name: "three", prime: true},
            //  |           {id: 4, name: "four", even: true, prime: false},
            //  |           {id: 5, name: "five", prime: true}
            //  |       ]
            //  |   });
            //
            //  ...find all items where "prime" is true:
            //
            //  |   var results = store.query({ prime: true });
            //
            //  ...or find all items where "even" is true:
            //
            //  |   var results = store.query({ even: true });
            return QueryResults(this.queryEngine(query, options)(this.data));
        },

        setData: function(data){
            // summary:
            //      Sets the given data as the source for this store, and indexes it
            // data: Object[]
            //      An array of objects to use as the source of data.
            if(data.items){
                // just for convenience with the data format IFRS expects
                this.idProperty = data.identifier || this.idProperty;
                data = this.data = data.items;
            }else{
                this.data = data;
            }
            this.index = {};
            for(var i = 0, l = data.length; i < l; i++){
                this.index[data[i][this.idProperty]] = i;
            }
        },

        init: function(options) {
            for(var i in options){
                this[i] = options[i];
            }
            this.setData(this.data || []);
        }

    });

    var Xhr = (function(){
        var jsonpID = 0,
            key,
            name,
            rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            scriptTypeRE = /^(?:text|application)\/javascript/i,
            xmlTypeRE = /^(?:text|application)\/xml/i,
            jsonType = 'application/json',
            htmlType = 'text/html',
            blankRE = /^\s*$/;

        var XhrDefaultOptions = {
            async: true,

            // Default type of request
            type: 'GET',
            // Callback that is executed before request
            beforeSend: noop,
            // Callback that is executed if the request succeeds
            success: noop,
            // Callback that is executed the the server drops error
            error: noop,
            // Callback that is executed on request complete (both: error and success)
            complete: noop,
            // The context for the callbacks
            context: null,
            // Whether to trigger "global" Ajax events
            global: true,

            // MIME types mapping
            // IIS returns Javascript as "application/x-javascript"
            accepts: {
                script: 'text/javascript, application/javascript, application/x-javascript',
                json: 'application/json',
                xml: 'application/xml, text/xml',
                html: 'text/html',
                text: 'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
            // Default timeout
            timeout: 0,
            // Whether data should be serialized to string
            processData: true,
            // Whether the browser should be allowed to cache GET responses
            cache: true,

            xhrFields : {
                withCredentials : true
            }
        };

        function mimeToDataType(mime) {
            if (mime) {
                mime = mime.split(';', 2)[0];
            }
            if (mime) {
                if (mime == htmlType) {
                    return "html";
                } else if (mime == jsonType) {
                    return "json";
                } else if (scriptTypeRE.test(mime)) {
                    return "script";
                } else if (xmlTypeRE.test(mime)) {
                    return "xml";
                }
            }
            return "text";
        }

        function appendQuery(url, query) {
            if (query == '') return url
            return (url + '&' + query).replace(/[&?]{1,2}/, '?')
        }

        // serialize payload and append it to the URL for GET requests
        function serializeData(options) {
            options.data = options.data || options.query;
            if (options.processData && options.data && type(options.data) != "string") {
                options.data = param(options.data, options.traditional);
            }
            if (options.data && (!options.type || options.type.toUpperCase() == 'GET')) {
                options.url = appendQuery(options.url, options.data);
                options.data = undefined;
            }
        }

        function serialize(params, obj, traditional, scope) {
            var t, array = isArray(obj),
                hash = isPlainObject(obj)
            each(obj, function(key, value) {
                t =type(value);
                if (scope) key = traditional ? scope :
                    scope + '[' + (hash || t == 'object' || t == 'array' ? key : '') + ']'
                // handle data in serializeArray() format
                if (!scope && array) params.add(value.name, value.value)
                // recurse into nested objects
                else if (t == "array" || (!traditional && t == "object"))
                    serialize(params, value, traditional, key)
                else params.add(key, value)
            })
        }

        var param = function(obj, traditional) {
            var params = []
            params.add = function(key, value) {
                if (isFunction(value)) value = value()
                if (value == null) value = ""
                this.push(escape(key) + '=' + escape(value))
            }
            serialize(params, obj, traditional)
            return params.join('&').replace(/%20/g, '+')
        };

        var Xhr = Evented.inherit({
            klassName : "Xhr",

            _request  : function(args) {
                var _ = this._,
                    self = this,
                    options = mixin({},XhrDefaultOptions,_.options,args),
                    xhr = _.xhr = new XMLHttpRequest();

                serializeData(options)

                var dataType = options.dataType || options.handleAs,
                    mime = options.mimeType || options.accepts[dataType],
                    headers = options.headers,
                    xhrFields = options.xhrFields,
                    isFormData = options.data && options.data instanceof FormData,
                    basicAuthorizationToken = options.basicAuthorizationToken,
                    type = options.type,
                    url = options.url,
                    async = options.async,
                    user = options.user , 
                    password = options.password,
                    deferred = new Deferred(),
                    contentType = isFormData ? false : 'application/x-www-form-urlencoded';

                if (xhrFields) {
                    for (name in xhrFields) {
                        xhr[name] = xhrFields[name];
                    }
                }

                if (mime && mime.indexOf(',') > -1) {
                    mime = mime.split(',', 2)[0];
                }
                if (mime && xhr.overrideMimeType) {
                    xhr.overrideMimeType(mime);
                }

                //if (dataType) {
                //    xhr.responseType = dataType;
                //}

                var finish = function() {
                    xhr.onloadend = noop;
                    xhr.onabort = noop;
                    xhr.onprogress = noop;
                    xhr.ontimeout = noop;
                    xhr = null;
                }
                var onloadend = function() {
                    var result, error = false
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && getAbsoluteUrl(url).startsWith('file:'))) {
                        dataType = dataType || mimeToDataType(options.mimeType || xhr.getResponseHeader('content-type'));

                        result = xhr.responseText;
                        try {
                            if (dataType == 'script') {
                                eval(result);
                            } else if (dataType == 'xml') {
                                result = xhr.responseXML;
                            } else if (dataType == 'json') {
                                result = blankRE.test(result) ? null : JSON.parse(result);
                            } else if (dataType == "blob") {
                                result = Blob([xhrObj.response]);
                            } else if (dataType == "arraybuffer") {
                                result = xhr.reponse;
                            }
                        } catch (e) { 
                            error = e;
                        }

                        if (error) {
                            deferred.reject(error,xhr.status,xhr);
                        } else {
                            deferred.resolve(result,xhr.status,xhr);
                        }
                    } else {
                        deferred.reject(new Error(xhr.statusText),xhr.status,xhr);
                    }
                    finish();
                };

                var onabort = function() {
                    if (deferred) {
                        deferred.reject(new Error("abort"),xhr.status,xhr);
                    }
                    finish();                 
                }
 
                var ontimeout = function() {
                    if (deferred) {
                        deferred.reject(new Error("timeout"),xhr.status,xhr);
                    }
                    finish();                 
                }

                var onprogress = function(evt) {
                    if (deferred) {
                        deferred.progress(evt,xhr.status,xhr);
                    }
                }

                xhr.onloadend = onloadend;
                xhr.onabort = onabort;
                xhr.ontimeout = ontimeout;
                xhr.onprogress = onprogress;

                xhr.open(type, url, async, user, password);
               
                if (headers) {
                    for ( var key in headers) {
                        var value = headers[key];
 
                        if(key.toLowerCase() === 'content-type'){
                            contentType = headers[hdr];
                        } else {
                           xhr.setRequestHeader(key, value);
                        }
                    }
                }   

                if  (contentType && contentType !== false){
                    xhr.setRequestHeader('Content-Type', contentType);
                }

                if(!headers || !('X-Requested-With' in headers)){
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                }


                //If basicAuthorizationToken is defined set its value into "Authorization" header
                if (basicAuthorizationToken) {
                    xhr.setRequestHeader("Authorization", basicAuthorizationToken);
                }

                xhr.send(options.data ? options.data : null);

                return deferred.promise;

            },

            "abort": function() {
                var _ = this._,
                    xhr = _.xhr;

                if (xhr) {
                    xhr.abort();
                }    
            },


            "request": function(args) {
                return this._request(args);
            },

            get : function(args) {
                args = args || {};
                args.type = "GET";
                return this._request(args);
            },

            post : function(args) {
                args = args || {};
                args.type = "POST";
                return this._request(args);
            },

            patch : function(args) {
                args = args || {};
                args.type = "PATCH";
                return this._request(args);
            },

            put : function(args) {
                args = args || {};
                args.type = "PUT";
                return this._request(args);
            },

            del : function(args) {
                args = args || {};
                args.type = "DELETE";
                return this._request(args);
            },

            "init": function(options) {
                this._ = {
                    options : options || {}
                };
            }
        });

        ["request","get","post","put","del","patch"].forEach(function(name){
            Xhr[name] = function(url,args) {
                var xhr = new Xhr({"url" : url});
                return xhr[name](args);
            };
        });

        Xhr.defaultOptions = XhrDefaultOptions;
        Xhr.param = param;

        return Xhr;
    })();

    var Restful = Evented.inherit({
        "klassName" : "Restful",

        "idAttribute": "id",
        
        getBaseUrl : function(args) {
            //$$baseEndpoint : "/files/${fileId}/comments",
            var baseEndpoint = String.substitute(this.baseEndpoint,args),
                baseUrl = this.server + this.basePath + baseEndpoint;
            if (args[this.idAttribute]!==undefined) {
                baseUrl = baseUrl + "/" + args[this.idAttribute]; 
            }
            return baseUrl;
        },
        _head : function(args) {
            //get resource metadata .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
        },
        _get : function(args) {
            //get resource ,one or list .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, null if list
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            return Xhr.get(this.getBaseUrl(args),args);
        },
        _post  : function(args,verb) {
            //create or move resource .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            //verb : the verb ,ex: copy,touch,trash,untrash,watch
            var url = this.getBaseUrl(args);
            if (verb) {
                url = url + "/" + verb;
            }
            return Xhr.post(url, args);
        },

        _put  : function(args,verb) {
            //update resource .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            //verb : the verb ,ex: copy,touch,trash,untrash,watch
            var url = this.getBaseUrl(args);
            if (verb) {
                url = url + "/" + verb;
            }
            return Xhr.put(url, args);
        },

        _delete : function(args) {
            //delete resource . 
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}         

            // HTTP request : DELETE http://center.utilhub.com/registry/v1/apps/{appid}
            var url = this.getBaseUrl(args);
            return Xhr.del(url);
        },

        _patch : function(args){
            //update resource metadata. 
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            var url = this.getBaseUrl(args);
            return Xhr.patch(url, args);
        },
        query: function(params) {
            
            return this._post(params);
        },

        retrieve: function(params) {
            return this._get(params);
        },

        create: function(params) {
            return this._post(params);
        },

        update: function(params) {
            return this._put(params);
        },

        delete: function(params) {
            // HTTP request : DELETE http://center.utilhub.com/registry/v1/apps/{appid}
            return this._delete(params);
        },

        patch: function(params) {
           // HTTP request : PATCH http://center.utilhub.com/registry/v1/apps/{appid}
            return this._patch(params);
        },
        init: function(params) {
            mixin(this,params);
 //           this._xhr = XHRx();
       }


    });

    function langx() {
        return langx;
    }

    mixin(langx, {
        after: aspect("after"),

        allKeys: allKeys,

        around: aspect("around"),

        ArrayStore : ArrayStore,

        async : async,
        
        before: aspect("before"),

        camelCase: function(str) {
            return str.replace(/-([\da-z])/g, function(a) {
                return a.toUpperCase().replace('-', '');
            });
        },

        clone: clone,

        compact: compact,

        createEvent : createEvent,

        dasherize: dasherize,

        debounce: debounce,

        defaults : createAssigner(allKeys, true),

        delegate: delegate,

        Deferred: Deferred,

        Evented: Evented,

        defer: defer,

        deserializeValue: deserializeValue,

        each: each,

        first : function(items,n) {
            if (n) {
                return items.slice(0,n);
            } else {
                return items[0];
            }
        },

        flatten: flatten,

        funcArg: funcArg,

        getQueryParams: getQueryParams,

        has: has,

        inArray: inArray,

        isArray: isArray,

        isArrayLike: isArrayLike,

        isBoolean: isBoolean,

        isDefined: function(v) {
            return v !== undefined;
        },

        isDocument: isDocument,

        isEmptyObject: isEmptyObject,

        isEqual: isEqual,

        isFunction: isFunction,

        isHtmlNode: isHtmlNode,

        isMatch: isMatch,

        isNumber: isNumber,

        isObject: isObject,

        isPlainObject: isPlainObject,

        isString: isString,

        isSameOrigin: isSameOrigin,

        isWindow: isWindow,

        keys: keys,

        klass: function(props, parent,mixins, options) {
            return createClass(props, parent, mixins,options);
        },

        lowerFirst: function(str) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        },

        makeArray: makeArray,

        map: map,

        mixin: mixin,

        noop : noop,

        proxy: proxy,

        removeItem: removeItem,

        Restful: Restful,

        result : result,
        
        returnTrue: function() {
            return true;
        },

        returnFalse: function() {
            return false;
        },

        safeMixin: safeMixin,

        serializeValue: function(value) {
            return JSON.stringify(value)
        },

        Stateful: Stateful,

        substitute: substitute,

        toPixel: toPixel,

        trim: trim,

        type: type,

        uid: uid,

        uniq: uniq,

        uniqueId: uniqueId,

        upperFirst: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        URL: typeof window !== "undefined" ? window.URL || window.webkitURL : null,

        values: values,

        Xhr: Xhr

    });

    return skylark.langx = langx;
});
define('skylark-utils/langx',[
    "skylark-langx/langx"
], function(langx) {
    return langx;
});

define('skylark-utils/styler',[
    "./skylark",
    "./langx"
], function(skylark, langx) {
    var every = Array.prototype.every,
        forEach = Array.prototype.forEach,
        camelCase = langx.camelCase,
        dasherize = langx.dasherize;

    function maybeAddPx(name, value) {
        return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
    }

    var cssNumber = {
            'column-count': 1,
            'columns': 1,
            'font-weight': 1,
            'line-height': 1,
            'opacity': 1,
            'z-index': 1,
            'zoom': 1
        },
        classReCache = {

        };

    function classRE(name) {
        return name in classReCache ?
            classReCache[name] : (classReCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'));
    }

    // access className property while respecting SVGAnimatedString
    function className(node, value) {
        var klass = node.className || '',
            svg = klass && klass.baseVal !== undefined

        if (value === undefined) return svg ? klass.baseVal : klass
        svg ? (klass.baseVal = value) : (node.className = value)
    }


    var elementDisplay = {};

    function defaultDisplay(nodeName) {
        var element, display
        if (!elementDisplay[nodeName]) {
            element = document.createElement(nodeName)
            document.body.appendChild(element)
            display = getComputedStyle(element, '').getPropertyValue("display")
            element.parentNode.removeChild(element)
            display == "none" && (display = "block")
            elementDisplay[nodeName] = display
        }
        return elementDisplay[nodeName]
    }

    function show(elm) {
        styler.css(elm, "display", "");
        if (styler.css(elm, "display") == "none") {
            styler.css(elm, "display", defaultDisplay(elm.nodeName));
        }
        return this;
    }

    function isInvisible(elm) {
        return styler.css(elm, "display") == "none" || styler.css(elm, "opacity") == 0;
    }

    function hide(elm) {
        styler.css(elm, "display", "none");
        return this;
    }

    function addClass(elm, name) {
        if (!name) return this
        var cls = className(elm),
            names;
        if (langx.isString(name)) {
            names = name.split(/\s+/g);
        } else {
            names = name;
        }
        names.forEach(function(klass) {
            var re = classRE(klass);
            if (!cls.match(re)) {
                cls += (cls ? " " : "") + klass;
            }
        });

        className(elm, cls);

        return this;
    }

    function css(elm, property, value) {
        if (arguments.length < 3) {
            var computedStyle,
                computedStyle = getComputedStyle(elm, '')
            if (langx.isString(property)) {
                return elm.style[camelCase(property)] || computedStyle.getPropertyValue(property)
            } else if (langx.isArrayLike(property)) {
                var props = {}
                forEach.call(property, function(prop) {
                    props[prop] = (elm.style[camelCase(prop)] || computedStyle.getPropertyValue(prop))
                })
                return props
            }
        }

        var css = '';
        if (typeof(property) == 'string') {
            if (!value && value !== 0) {
                elm.style.removeProperty(dasherize(property));
            } else {
                css = dasherize(property) + ":" + maybeAddPx(property, value)
            }
        } else {
            for (key in property) {
                if (property[key] === undefined) {
                    continue;
                }
                if (!property[key] && property[key] !== 0) {
                    elm.style.removeProperty(dasherize(key));
                } else {
                    css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
                }
            }
        }

        elm.style.cssText += ';' + css;
        return this;
    }


    function hasClass(elm, name) {
        var re = classRE(name);
        return elm.className && elm.className.match(re);
    }

    function removeClass(elm, name) {
        if (name) {
            var cls = className(elm),
                names;

            if (langx.isString(name)) {
                names = name.split(/\s+/g);
            } else {
                names = name;
            }

            names.forEach(function(klass) {
                var re = classRE(klass);
                if (cls.match(re)) {
                    cls = cls.replace(re, " ");
                }
            });

            className(elm, cls.trim());
        } else {
            className(elm,"");
        }

        return this;
    }

    function toggleClass(elm, name, when) {
        var self = this;
        name.split(/\s+/g).forEach(function(klass) {
            if (when === undefined) {
                when = !self.hasClass(elm, klass);
            }
            if (when) {
                self.addClass(elm, klass);
            } else {
                self.removeClass(elm, klass)
            }
        });

        return self;
    }

    var styler = function() {
        return styler;
    };

    langx.mixin(styler, {
        autocssfix: false,
        cssHooks : {

        },
        
        addClass: addClass,
        className: className,
        css: css,
        hasClass: hasClass,
        hide: hide,
        isInvisible: isInvisible,
        removeClass: removeClass,
        show: show,
        toggleClass: toggleClass
    });

    return skylark.styler = styler;
});

define('skylark-utils/noder',[
    "./skylark",
    "./langx",
    "./styler"
], function(skylark, langx, styler) {
    var isIE = !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g),
        fragmentRE = /^\s*<(\w+|!)[^>]*>/,
        singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
        div = document.createElement("div"),
        table = document.createElement('table'),
        tableBody = document.createElement('tbody'),
        tableRow = document.createElement('tr'),
        containers = {
            'tr': tableBody,
            'tbody': table,
            'thead': table,
            'tfoot': table,
            'td': tableRow,
            'th': tableRow,
            '*': div
        },
        rootNodeRE = /^(?:body|html)$/i,
        map = Array.prototype.map,
        slice = Array.prototype.slice;

    function ensureNodes(nodes, copyByClone) {
        if (!langx.isArrayLike(nodes)) {
            nodes = [nodes];
        }
        if (copyByClone) {
            nodes = map.call(nodes, function(node) {
                return node.cloneNode(true);
            });
        }
        return langx.flatten(nodes);
    }

    function nodeName(elm, chkName) {
        var name = elm.nodeName && elm.nodeName.toLowerCase();
        if (chkName !== undefined) {
            return name === chkName.toLowerCase();
        }
        return name;
    };

    function after(node, placing, copyByClone) {
        var refNode = node,
            parent = refNode.parentNode;
        if (parent) {
            var nodes = ensureNodes(placing, copyByClone),
                refNode = refNode.nextSibling;

            for (var i = 0; i < nodes.length; i++) {
                if (refNode) {
                    parent.insertBefore(nodes[i], refNode);
                } else {
                    parent.appendChild(nodes[i]);
                }
            }
        }
        return this;
    }

    function append(node, placing, copyByClone) {
        var parentNode = node,
            nodes = ensureNodes(placing, copyByClone);
        for (var i = 0; i < nodes.length; i++) {
            parentNode.appendChild(nodes[i]);
        }
        return this;
    }

    function before(node, placing, copyByClone) {
        var refNode = node,
            parent = refNode.parentNode;
        if (parent) {
            var nodes = ensureNodes(placing, copyByClone);
            for (var i = 0; i < nodes.length; i++) {
                parent.insertBefore(nodes[i], refNode);
            }
        }
        return this;
    }

    function contents(elm) {
        if (nodeName(elm, "iframe")) {
            return elm.contentDocument;
        }
        return elm.childNodes;
    }

    function createElement(tag, props,parent) {
        var node = document.createElement(tag);
        if (props) {
            for (var name in props) {
                node.setAttribute(name, props[name]);
            }
        }
        if (parent) {
            append(parent,node);
        }
        return node;
    }

    function createFragment(html) {
        // A special case optimization for a single tag
        html = langx.trim(html);
        if (singleTagRE.test(html)) {
            return [createElement(RegExp.$1)];
        }

        var name = fragmentRE.test(html) && RegExp.$1
        if (!(name in containers)) {
            name = "*"
        }
        var container = containers[name];
        container.innerHTML = "" + html;
        dom = slice.call(container.childNodes);

        dom.forEach(function(node) {
            container.removeChild(node);
        })

        return dom;
    }

    function clone(node, deep) {
        var self = this,
            clone;

        // TODO: Add feature detection here in the future
        if (!isIE || node.nodeType !== 1 || deep) {
            return node.cloneNode(deep);
        }

        // Make a HTML5 safe shallow copy
        if (!deep) {
            clone = document.createElement(node.nodeName);

            // Copy attribs
            each(self.getAttribs(node), function(attr) {
                self.setAttrib(clone, attr.nodeName, self.getAttrib(node, attr.nodeName));
            });

            return clone;
        }
    }

    function contains(node, child) {
        return isChildOf(child, node);
    }

    function createTextNode(text) {
        return document.createTextNode(text);
    }

    function doc() {
        return document;
    }

    function empty(node) {
        while (node.hasChildNodes()) {
            var child = node.firstChild;
            node.removeChild(child);
        }
        return this;
    }

    function html(node, html) {
        if (html === undefined) {
            return node.innerHTML;
        } else {
            this.empty(node);
            html = html || "";
            if (langx.isString(html) || langx.isNumber(html)) {
                node.innerHTML = html;
            } else if (langx.isArrayLike(html)) {
                for (var i = 0; i < html.length; i++) {
                    node.appendChild(html[i]);
                }
            } else {
                node.appendChild(html);
            }
        }
    }

    function isChildOf(node, parent,directly) {
        if (directly) {
            return node.parentNode === parent;
        }
        if (document.documentElement.contains) {
            return parent.contains(node);
        }
        while (node) {
            if (parent === node) {
                return true;
            }

            node = node.parentNode;
        }

        return false;
    }

    function isDoc(node) {
        return node != null && node.nodeType == node.DOCUMENT_NODE
    }

    function ownerDoc(elm) {
        if (!elm) {
            return document;
        }

        if (elm.nodeType == 9) {
            return elm;
        }

        return elm.ownerDocument;
    }

    function ownerWindow(elm) {
        var doc = ownerDoc(elm);
        return  doc.defaultView || doc.parentWindow;
    } 


    function prepend(node, placing, copyByClone) {
        var parentNode = node,
            refNode = parentNode.firstChild,
            nodes = ensureNodes(placing, copyByClone);
        for (var i = 0; i < nodes.length; i++) {
            if (refNode) {
                parentNode.insertBefore(nodes[i], refNode);
            } else {
                parentNode.appendChild(nodes[i]);
            }
        }
        return this;
    }


    function offsetParent(elm) {
        var parent = elm.offsetParent || document.body;
        while (parent && !rootNodeRE.test(parent.nodeName) && styler.css(parent, "position") == "static") {
            parent = parent.offsetParent;
        }
        return parent;
    }

    function overlay(elm, params) {
        var overlayDiv = createElement("div", params);
        styler.css(overlayDiv, {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0x7FFFFFFF,
            opacity: 0.7
        });
        elm.appendChild(overlayDiv);
        return overlayDiv;

    }



    function remove(node) {
        if (node && node.parentNode) {
            try {
               node.parentNode.removeChild(node);
            } catch (e) {
                console.warn("The node is already removed",e);
            }
         }
        return this;
    }

    function replace(node, oldNode) {
        oldNode.parentNode.replaceChild(node, oldNode);
        return this;
    }

    function throb(elm, params) {
        params = params || {};
        var self = this,
            text = params.text,
            style = params.style,
            time = params.time,
            callback = params.callback,
            timer,
            throbber = this.createElement("div", {
                className: params.className || "throbber",
                style: style
            }),
            _overlay = overlay(throbber, {
                className: 'overlay fade'
            }),
            throb = this.createElement("div", {
                className: "throb"
            }),
            textNode = this.createTextNode(text || ""),
            remove = function() {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                if (throbber) {
                    self.remove(throbber);
                    throbber = null;
                }
            },
            update = function(params) {
                if (params && params.text && throbber) {
                    textNode.nodeValue = params.text;
                }
            };
        throb.appendChild(textNode);
        throbber.appendChild(throb);
        elm.appendChild(throbber);
        var end = function() {
            remove();
            if (callback) callback();
        };
        if (time) {
            timer = setTimeout(end, time);
        }

        return {
            remove: remove,
            update: update
        };
    }

    function traverse(node, fn) {
        fn(node)
        for (var i = 0, len = node.childNodes.length; i < len; i++) {
            traverse(node.childNodes[i], fn);
        }
        return this;
    }

    function reverse(node) {
        var firstChild = node.firstChild;
        for (var i = node.children.length - 1; i > 0; i--) {
            if (i > 0) {
                var child = node.children[i];
                node.insertBefore(child, firstChild);
            }
        }
    }

    function wrapper(node, wrapperNode) {
        if (langx.isString(wrapperNode)) {
            wrapperNode = this.createFragment(wrapperNode).firstChild;
        }
        node.parentNode.insertBefore(wrapperNode, node);
        wrapperNode.appendChild(node);
    }

    function wrapperInner(node, wrapperNode) {
        var childNodes = slice.call(node.childNodes);
        node.appendChild(wrapperNode);
        for (var i = 0; i < childNodes.length; i++) {
            wrapperNode.appendChild(childNodes[i]);
        }
        return this;
    }

    function unwrap(node) {
        var child, parent = node.parentNode;
        if (parent) {
            if (this.isDoc(parent.parentNode)) return;
            parent.parentNode.insertBefore(node, parent);
        }
    }

    function noder() {
        return noder;
    }

    langx.mixin(noder, {
        body : function() {
            return document.body;
        },

        clone: clone,
        contents: contents,

        createElement: createElement,

        createFragment: createFragment,

        contains: contains,

        createTextNode: createTextNode,

        doc: doc,

        empty: empty,

        html: html,

        isChildOf: isChildOf,

        isDoc: isDoc,

        isWindow : langx.isWindow,

        offsetParent : offsetParent,
        
        ownerDoc: ownerDoc,

        ownerWindow : ownerWindow,

        after: after,

        before: before,

        prepend: prepend,

        append: append,

        remove: remove,

        replace: replace,

        throb: throb,

        traverse: traverse,

        reverse: reverse,

        wrapper: wrapper,

        wrapperInner: wrapperInner,

        unwrap: unwrap
    });

    return skylark.noder = noder;
});

define('skylark-utils/browser',[
    "./skylark",
    "./langx"
], function(skylark,langx) {
    var checkedCssProperties = {
        "transitionproperty": "TransitionProperty",
    };

    var css3PropPrefix = "",
        css3StylePrefix = "",
        css3EventPrefix = "",

        cssStyles = {},
        cssProps = {},

        vendorPrefix,
        vendorPrefixRE,
        vendorPrefixesRE = /^(Webkit|webkit|O|Moz|moz|ms)(.*)$/,

        document = window.document,
        testEl = document.createElement("div"),

        matchesSelector = testEl.webkitMatchesSelector ||
        testEl.mozMatchesSelector ||
        testEl.oMatchesSelector ||
        testEl.matchesSelector,

        testStyle = testEl.style;

    for (var name in testStyle) {
        var matched = name.match(vendorPrefixRE || vendorPrefixesRE);
        if (matched) {
            if (!vendorPrefixRE) {
                vendorPrefix = matched[1];
                vendorPrefixRE = new RegExp("^(" + vendorPrefix + ")(.*)$");

                css3StylePrefix = vendorPrefix;
                css3PropPrefix = '-' + vendorPrefix.toLowerCase() + '-';
                css3EventPrefix = vendorPrefix.toLowerCase();
            }

            cssStyles[langx.lowerFirst(matched[2])] = name;
            var cssPropName = langx.dasherize(matched[2]);
            cssProps[cssPropName] = css3PropPrefix + cssPropName;

        }
    }


    function normalizeCssEvent(name) {
        return css3EventPrefix ? css3EventPrefix + name : name.toLowerCase();
    }

    function normalizeCssProperty(name) {
        return cssProps[name] || name;
    }

    function normalizeStyleProperty(name) {
        return cssStyles[name] || name;
    }

    function browser() {
        return browser;
    }

    langx.mixin(browser, {
        css3PropPrefix: css3PropPrefix,

        normalizeStyleProperty: normalizeStyleProperty,

        normalizeCssProperty: normalizeCssProperty,

        normalizeCssEvent: normalizeCssEvent,

        matchesSelector: matchesSelector,

        location: function() {
            return window.location;
        },

        support : {}

    });

    testEl = null;

    return skylark.browser = browser;
});

define('skylark-utils/finder',[
    "./skylark",
    "./langx",
    "./browser",
    "./noder"
], function(skylark, langx, browser, noder, velm) {
    var local = {},
        filter = Array.prototype.filter,
        slice = Array.prototype.slice,
        nativeMatchesSelector = browser.matchesSelector;

    /*
    ---
    name: Slick.Parser
    description: Standalone CSS3 Selector parser
    provides: Slick.Parser
    ...
    */
    ;
    (function() {

        var parsed,
            separatorIndex,
            combinatorIndex,
            reversed,
            cache = {},
            reverseCache = {},
            reUnescape = /\\/g;

        var parse = function(expression, isReversed) {
            if (expression == null) return null;
            if (expression.Slick === true) return expression;
            expression = ('' + expression).replace(/^\s+|\s+$/g, '');
            reversed = !!isReversed;
            var currentCache = (reversed) ? reverseCache : cache;
            if (currentCache[expression]) return currentCache[expression];
            parsed = {
                Slick: true,
                expressions: [],
                raw: expression,
                reverse: function() {
                    return parse(this.raw, true);
                }
            };
            separatorIndex = -1;
            while (expression != (expression = expression.replace(regexp, parser)));
            parsed.length = parsed.expressions.length;
            return currentCache[parsed.raw] = (reversed) ? reverse(parsed) : parsed;
        };

        var reverseCombinator = function(combinator) {
            if (combinator === '!') return ' ';
            else if (combinator === ' ') return '!';
            else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
            else return '!' + combinator;
        };

        var reverse = function(expression) {
            var expressions = expression.expressions;
            for (var i = 0; i < expressions.length; i++) {
                var exp = expressions[i];
                var last = {
                    parts: [],
                    tag: '*',
                    combinator: reverseCombinator(exp[0].combinator)
                };

                for (var j = 0; j < exp.length; j++) {
                    var cexp = exp[j];
                    if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
                    cexp.combinator = cexp.reverseCombinator;
                    delete cexp.reverseCombinator;
                }

                exp.reverse().push(last);
            }
            return expression;
        };

        var escapeRegExp = (function() {
            // Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
            var from = /(?=[\-\[\]{}()*+?.\\\^$|,#\s])/g,
                to = '\\';
            return function(string) {
                return string.replace(from, to)
            }
        }())

        var regexp = new RegExp(
            "^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
            .replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
            .replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
            .replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
        );

        function parser(
            rawMatch,

            separator,
            combinator,
            combinatorChildren,

            tagName,
            id,
            className,

            attributeKey,
            attributeOperator,
            attributeQuote,
            attributeValue,

            pseudoMarker,
            pseudoClass,
            pseudoQuote,
            pseudoClassQuotedValue,
            pseudoClassValue
        ) {
            if (separator || separatorIndex === -1) {
                parsed.expressions[++separatorIndex] = [];
                combinatorIndex = -1;
                if (separator) return '';
            }

            if (combinator || combinatorChildren || combinatorIndex === -1) {
                combinator = combinator || ' ';
                var currentSeparator = parsed.expressions[separatorIndex];
                if (reversed && currentSeparator[combinatorIndex])
                    currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
                currentSeparator[++combinatorIndex] = {
                    combinator: combinator,
                    tag: '*'
                };
            }

            var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

            if (tagName) {
                currentParsed.tag = tagName.replace(reUnescape, '');

            } else if (id) {
                currentParsed.id = id.replace(reUnescape, '');

            } else if (className) {
                className = className.replace(reUnescape, '');

                if (!currentParsed.classList) currentParsed.classList = [];
                if (!currentParsed.classes) currentParsed.classes = [];
                currentParsed.classList.push(className);
                currentParsed.classes.push({
                    value: className,
                    regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
                });

            } else if (pseudoClass) {
                pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
                pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

                if (!currentParsed.pseudos) currentParsed.pseudos = [];
                currentParsed.pseudos.push({
                    key: pseudoClass.replace(reUnescape, ''),
                    value: pseudoClassValue,
                    type: pseudoMarker.length == 1 ? 'class' : 'element'
                });

            } else if (attributeKey) {
                attributeKey = attributeKey.replace(reUnescape, '');
                attributeValue = (attributeValue || '').replace(reUnescape, '');

                var test, regexp;

                switch (attributeOperator) {
                    case '^=':
                        regexp = new RegExp('^' + escapeRegExp(attributeValue));
                        break;
                    case '$=':
                        regexp = new RegExp(escapeRegExp(attributeValue) + '$');
                        break;
                    case '~=':
                        regexp = new RegExp('(^|\\s)' + escapeRegExp(attributeValue) + '(\\s|$)');
                        break;
                    case '|=':
                        regexp = new RegExp('^' + escapeRegExp(attributeValue) + '(-|$)');
                        break;
                    case '=':
                        test = function(value) {
                            return attributeValue == value;
                        };
                        break;
                    case '*=':
                        test = function(value) {
                            return value && value.indexOf(attributeValue) > -1;
                        };
                        break;
                    case '!=':
                        test = function(value) {
                            return attributeValue != value;
                        };
                        break;
                    default:
                        test = function(value) {
                            return !!value;
                        };
                }

                if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function() {
                    return false;
                };

                if (!test) test = function(value) {
                    return value && regexp.test(value);
                };

                if (!currentParsed.attributes) currentParsed.attributes = [];
                currentParsed.attributes.push({
                    key: attributeKey,
                    operator: attributeOperator,
                    value: attributeValue,
                    test: test
                });

            }

            return '';
        };

        // Slick NS

        var Slick = (this.Slick || {});

        Slick.parse = function(expression) {
            return parse(expression);
        };

        Slick.escapeRegExp = escapeRegExp;

        if (!this.Slick) this.Slick = Slick;

    }).apply(local);


    var simpleClassSelectorRE = /^\.([\w-]*)$/,
        simpleIdSelectorRE = /^#([\w-]*)$/,
        rinputs = /^(?:input|select|textarea|button)$/i,
        rheader = /^h\d$/i,
        slice = Array.prototype.slice;


    local.parseSelector = local.Slick.parse;


    var pseudos = local.pseudos = {
        // custom pseudos
        "button": function( elem ) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === "button" || name === "button";
        },

        'checked': function(elm) {
            return !!elm.checked;
        },

        'contains': function(elm, idx, nodes, text) {
            if ($(this).text().indexOf(text) > -1) return this
        },

        'disabled': function(elm) {
            return !!elm.disabled;
        },

        'enabled': function(elm) {
            return !elm.disabled;
        },

        'eq': function(elm, idx, nodes, value) {
            return (idx == value);
        },

        'even' : function(elm, idx, nodes, value) {
            return (idx % 2) === 0;
        },

        'focus': function(elm) {
            return document.activeElement === elm && (elm.href || elm.type || elm.tabindex);
        },

        'first': function(elm, idx) {
            return (idx === 0);
        },

        'gt': function(elm, idx, nodes, value) {
            return (idx > value);
        },

        'has': function(elm, idx, nodes, sel) {
            return find(elm, sel);
        },

        // Element/input types
        "header": function( elem ) {
            return rheader.test( elem.nodeName );
        },

        'hidden': function(elm) {
            return !local.pseudos["visible"](elm);
        },

        "input": function( elem ) {
            return rinputs.test( elem.nodeName );
        },

        'last': function(elm, idx, nodes) {
            return (idx === nodes.length - 1);
        },

        'lt': function(elm, idx, nodes, value) {
            return (idx < value);
        },

        'not': function(elm, idx, nodes, sel) {
            return !matches(elm, sel);
        },

        'odd' : function(elm, idx, nodes, value) {
            return (idx % 2) === 1;
        },

        'parent': function(elm) {
            return !!elm.parentNode;
        },

        'selected': function(elm) {
            return !!elm.selected;
        },

        'text': function(elm){
            return elm.type === "text";
        },

        'visible': function(elm) {
            return elm.offsetWidth && elm.offsetWidth
        }
    };

    ["first","eq","last"].forEach(function(item){
        pseudos[item].isArrayFilter = true;
    });



    pseudos["nth"] = pseudos["eq"];

    function createInputPseudo( type ) {
        return function( elem ) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === type;
        };
    }

    function createButtonPseudo( type ) {
        return function( elem ) {
            var name = elem.nodeName.toLowerCase();
            return (name === "input" || name === "button") && elem.type === type;
        };
    }

    // Add button/input type pseudos
    for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
        pseudos[ i ] = createInputPseudo( i );
    }
    for ( i in { submit: true, reset: true } ) {
        pseudos[ i ] = createButtonPseudo( i );
    }


    local.divide = function(cond) {
        var nativeSelector = "",
            customPseudos = [],
            tag,
            id,
            classes,
            attributes,
            pseudos;


        if (id = cond.id) {
            nativeSelector += ("#" + id);
        }
        if (classes = cond.classes) {
            for (var i = classes.length; i--;) {
                nativeSelector += ("." + classes[i].value);
            }
        }
        if (attributes = cond.attributes) {
            for (var i = 0; i < attributes.length; i++) {
                if (attributes[i].operator) {
                    nativeSelector += ("[" + attributes[i].key + attributes[i].operator + JSON.stringify(attributes[i].value)  +"]");
                } else {
                    nativeSelector += ("[" + attributes[i].key + "]");
                }
            }
        }
        if (pseudos = cond.pseudos) {
            for (i = pseudos.length; i--;) {
                part = pseudos[i];
                if (this.pseudos[part.key]) {
                    customPseudos.push(part);
                } else {
                    if (part.value !== undefined) {
                        nativeSelector += (":" + part.key + "(" + JSON.stringify(part))
                    }
                }
            }
        }

        if (tag = cond.tag) {
            nativeSelector = tag.toUpperCase() + nativeSelector;
        }

        if (!nativeSelector) {
            nativeSelector = "*";
        }

        return {
            nativeSelector: nativeSelector,
            customPseudos: customPseudos
        }

    };

    local.check = function(node, cond, idx, nodes,arrayFilte) {
        var tag,
            id,
            classes,
            attributes,
            pseudos,

            i, part, cls, pseudo;

        if (!arrayFilte) {
            if (tag = cond.tag) {
                var nodeName = node.nodeName.toUpperCase();
                if (tag == '*') {
                    if (nodeName < '@') return false; // Fix for comment nodes and closed nodes
                } else {
                    if (nodeName != (tag || "").toUpperCase()) return false;
                }
            }

            if (id = cond.id) {
                if (node.getAttribute('id') != id) {
                    return false;
                }
            }


            if (classes = cond.classes) {
                for (i = classes.length; i--;) {
                    cls = node.getAttribute('class');
                    if (!(cls && classes[i].regexp.test(cls))) return false;
                }
            }

            if (attributes = cond.attributes) {
                 for (i = attributes.length; i--;) {
                    part = attributes[i];
                    if (part.operator ? !part.test(node.getAttribute(part.key)) : !node.hasAttribute(part.key)) return false;
                }
            }

        }
        if (pseudos = cond.pseudos) {
            for (i = pseudos.length; i--;) {
                part = pseudos[i];
                if (pseudo = this.pseudos[part.key]) {
                    if ((arrayFilte && pseudo.isArrayFilter) || (!arrayFilte && !pseudo.isArrayFilter)) {
                        if (!pseudo(node, idx, nodes, part.value)) {
                            return false;
                        }
                    }
                } else {
                    if (!arrayFilte && !nativeMatchesSelector.call(node, part.key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    local.match = function(node, selector) {

        var parsed ;

        if (langx.isString(selector)) {
            parsed = local.Slick.parse(selector);
        } else {
            parsed = selector;            
        }
        
        if (!parsed) {
            return true;
        }

        // simple (single) selectors
        var expressions = parsed.expressions,
            simpleExpCounter = 0,
            i,
            currentExpression;
        for (i = 0;
            (currentExpression = expressions[i]); i++) {
            if (currentExpression.length == 1) {
                var exp = currentExpression[0];
                if (this.check(node,exp)) {
                    return true;
                }
                simpleExpCounter++;
            }
        }

        if (simpleExpCounter == parsed.length) {
            return false;
        }

        var nodes = this.query(document, parsed),
            item;
        for (i = 0; item = nodes[i++];) {
            if (item === node) {
                return true;
            }
        }
        return false;
    };


    local.filterSingle = function(nodes, exp){
        var matchs = filter.call(nodes, function(node, idx) {
            return local.check(node, exp, idx, nodes,false);
        });    

        matchs = filter.call(matchs, function(node, idx) {
            return local.check(node, exp, idx, matchs,true);
        }); 
        return matchs;
    };

    local.filter = function(nodes, selector) {
        var parsed;

        if (langx.isString(selector)) {
            parsed = local.Slick.parse(selector);
        } else {
            return local.filterSingle(nodes,selector);           
        }

        // simple (single) selectors
        var expressions = parsed.expressions,
            i,
            currentExpression,
            ret = [];
        for (i = 0;
            (currentExpression = expressions[i]); i++) {
            if (currentExpression.length == 1) {
                var exp = currentExpression[0];

                var matchs = local.filterSingle(nodes,exp);  

                ret = langx.uniq(ret.concat(matchs));
            } else {
                throw new Error("not supported selector:" + selector);
            }
        }

        return ret;
 
    };    

    local.combine = function(elm, bit) {
        var op = bit.combinator,
            cond = bit,
            node1,
            nodes = [];

        switch (op) {
            case '>': // direct children
                nodes = children(elm, cond);
                break;
            case '+': // next sibling
                node1 = nextSibling(elm, cond, true);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '^': // first child
                node1 = firstChild(elm, cond, true);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '~': // next siblings
                nodes = nextSiblings(elm, cond);
                break;
            case '++': // next sibling and previous sibling
                var prev = previousSibling(elm, cond, true),
                    next = nextSibling(elm, cond, true);
                if (prev) {
                    nodes.push(prev);
                }
                if (next) {
                    nodes.push(next);
                }
                break;
            case '~~': // next siblings and previous siblings
                nodes = siblings(elm, cond);
                break;
            case '!': // all parent nodes up to document
                nodes = ancestors(elm, cond);
                break;
            case '!>': // direct parent (one level)
                node1 = parent(elm, cond);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '!+': // previous sibling
                nodes = previousSibling(elm, cond, true);
                break;
            case '!^': // last child
                node1 = lastChild(elm, cond, true);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '!~': // previous siblings
                nodes = previousSiblings(elm, cond);
                break;
            default:
                var divided = this.divide(bit);
                nodes = slice.call(elm.querySelectorAll(divided.nativeSelector));
                if (divided.customPseudos) {
                    for (var i = divided.customPseudos.length - 1; i >= 0; i--) {
                        nodes = filter.call(nodes, function(item, idx) {
                            return local.check(item, {
                                pseudos: [divided.customPseudos[i]]
                            }, idx, nodes,false)
                        });

                        nodes = filter.call(nodes, function(item, idx) {
                            return local.check(item, {
                                pseudos: [divided.customPseudos[i]]
                            }, idx, nodes,true)
                        });                        
                    }
                }
                break;

        }
        return nodes;
    }

    local.query = function(node, selector, single) {


        var parsed = this.Slick.parse(selector);

        var
            founds = [],
            currentExpression, currentBit,
            expressions = parsed.expressions;

        for (var i = 0;
            (currentExpression = expressions[i]); i++) {
            var currentItems = [node],
                found;
            for (var j = 0;
                (currentBit = currentExpression[j]); j++) {
                found = langx.map(currentItems, function(item, i) {
                    return local.combine(item, currentBit)
                });
                if (found) {
                    currentItems = found;
                }
            }
            if (found) {
                founds = founds.concat(found);
            }
        }

        return founds;
    }


    function ancestor(node, selector, root) {
        var rootIsSelector = root && langx.isString(root);
        while (node = node.parentNode) {
            if (matches(node, selector)) {
                return node;
            }
            if (root) {
                if (rootIsSelector) {
                    if (matches(node,root)) {
                        break;
                    }
                } else if (node == root) {
                    break;
                }
            } 
        }
        return null;
    }

    function ancestors(node, selector,root) {
        var ret = [],
            rootIsSelector = root && langx.isString(root);
        while ((node = node.parentNode) && (node.nodeType !== 9)) {
            ret.push(node);
            if (root) {
                if (rootIsSelector) {
                    if (matches(node,root)) {
                        break;
                    }
                } else if (node == root) {
                    break;
                }
            } 

        }

        if (selector) {
            ret = local.filter(ret,selector);
        }
        return ret;
    }

    function byId(id, doc) {
        doc = doc || noder.doc();
        return doc.getElementById(id);
    }

    function children(node, selector) {
        var childNodes = node.childNodes,
            ret = [];
        for (var i = 0; i < childNodes.length; i++) {
            var node = childNodes[i];
            if (node.nodeType == 1) {
                ret.push(node);
            }
        }
        if (selector) {
            ret = local.filter(ret,selector);
        }
        return ret;
    }

    function closest(node, selector) {
        while (node && !(matches(node, selector))) {
            node = node.parentNode;
        }

        return node;
    }

    function descendants(elm, selector) {
        // Selector
        try {
            return slice.call(elm.querySelectorAll(selector));
        } catch (matchError) {
            //console.log(matchError);
        }
        return local.query(elm, selector);
    }

    function descendant(elm, selector) {
        // Selector
        try {
            return elm.querySelector(selector);
        } catch (matchError) {
            //console.log(matchError);
        }
        var nodes = local.query(elm, selector);
        if (nodes.length > 0) {
            return nodes[0];
        } else {
            return null;
        }
    }

    function find(elm,selector) {
        if (!selector) {
            selector = elm;
            elm = document.body;
        }
        if (matches(elm,selector)) {
            return elm;
        } else {
            return descendant(elm, selector);
        }
    }

    function findAll(elm,selector) {
        if (!selector) {
            selector = elm;
            elm = document.body;
        }
        return descendants(elm, selector);
    }

    function firstChild(elm, selector, first) {
        var childNodes = elm.childNodes,
            node = childNodes[0];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (first) {
                    break;
                }
            }
            node = node.nextSibling;
        }

        return null;
    }

    function lastChild(elm, selector, last) {
        var childNodes = elm.childNodes,
            node = childNodes[childNodes.length - 1];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (last) {
                    break;
                }
            }
            node = node.previousSibling;
        }

        return null;
    }

    function matches(elm, selector) {
        if (!selector || !elm || elm.nodeType !== 1) {
            return false
        }

        if (langx.isString(selector)) {
            try {
                return nativeMatchesSelector.call(elm, selector.replace(/\[([^=]+)=\s*([^'"\]]+?)\s*\]/g, '[$1="$2"]'));
            } catch (matchError) {
                //console.log(matchError);
            }
            return local.match(elm, selector);
        } else if (langx.isArrayLike(selector)) {
            return langx.inArray(elm,selector) > -1;
        } else if (langx.isPlainObject(selector)){    
            return local.check(elm, selector);
        } else {
            return elm === selector;
        }

    }

    function nextSibling(elm, selector, adjacent) {
        var node = elm.nextSibling;
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (adjacent) {
                    break;
                }
            }
            node = node.nextSibling;
        }
        return null;
    }

    function nextSiblings(elm, selector) {
        var node = elm.nextSibling,
            ret = [];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    ret.push(node);
                }
            }
            node = node.nextSibling;
        }
        return ret;
    }


    function parent(elm, selector) {
        var node = elm.parentNode;
        if (node && (!selector || matches(node, selector))) {
            return node;
        }

        return null;
    }

    function previousSibling(elm, selector, adjacent) {
        var node = elm.previousSibling;
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (adjacent) {
                    break;
                }
            }
            node = node.previousSibling;
        }
        return null;
    }

    function previousSiblings(elm, selector) {
        var node = elm.previousSibling,
            ret = [];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    ret.push(node);
                }
            }
            node = node.previousSibling;
        }
        return ret;
    }

    function siblings(elm, selector) {
        var node = elm.parentNode.firstChild,
            ret = [];
        while (node) {
            if (node.nodeType == 1 && node !== elm) {
                if (!selector || matches(node, selector)) {
                    ret.push(node);
                }
            }
            node = node.nextSibling;
        }
        return ret;
    }

    var finder = function() {
        return finder;
    };

    langx.mixin(finder, {

        ancestor: ancestor,

        ancestors: ancestors,

        byId: byId,

        children: children,

        closest: closest,

        descendant: descendant,

        descendants: descendants,

        find: find,

        findAll: findAll,

        firstChild: firstChild,

        lastChild: lastChild,

        matches: matches,

        nextSibling: nextSibling,

        nextSiblings: nextSiblings,

        parent: parent,

        previousSibling: previousSibling,

        previousSiblings: previousSiblings,

        pseudos: local.pseudos,

        siblings: siblings
    });

    return skylark.finder = finder;
});

define('skylark-utils/datax',[
    "./skylark",
    "./langx",
    "./finder"
], function(skylark, langx, finder) {
    var map = Array.prototype.map,
        filter = Array.prototype.filter,
        camelCase = langx.camelCase,
        deserializeValue = langx.deserializeValue,

        capitalRE = /([A-Z])/g,
        propMap = {
            'tabindex': 'tabIndex',
            'readonly': 'readOnly',
            'for': 'htmlFor',
            'class': 'className',
            'maxlength': 'maxLength',
            'cellspacing': 'cellSpacing',
            'cellpadding': 'cellPadding',
            'rowspan': 'rowSpan',
            'colspan': 'colSpan',
            'usemap': 'useMap',
            'frameborder': 'frameBorder',
            'contenteditable': 'contentEditable'
        };

    function setAttribute(elm, name, value) {
        if (value == null) {
            elm.removeAttribute(name);
        } else {
            elm.setAttribute(name, value);
        }
    }

    function aria(elm,name,value) {
        return this.attr(elm, "aria-"+name, value);
    }

    function attr(elm, name, value) {
        if (value === undefined) {
            if (typeof name === "object") {
                for (var attrName in name) {
                    attr(elm, attrName, name[attrName]);
                }
                return this;
            } else {
                if (elm.hasAttribute && elm.hasAttribute(name)) {
                    return elm.getAttribute(name);
                }
            }
        } else {
            elm.setAttribute(name, value);
            return this;
        }
    }

    // Read all "data-*" attributes from a node
    function _attributeData(elm) {
        var store = {}
        langx.each(elm.attributes || [], function(i, attr) {
            if (attr.name.indexOf('data-') == 0) {
                store[camelCase(attr.name.replace('data-', ''))] = deserializeValue(attr.value);
            }
        })
        return store;
    }

    function _store(elm, confirm) {
        var store = elm["_$_store"];
        if (!store && confirm) {
            store = elm["_$_store"] = _attributeData(elm);
        }
        return store;
    }

    function _getData(elm, name) {
        if (name === undefined) {
            return _store(elm, true);
        } else {
            var store = _store(elm);
            if (store) {
                if (name in store) {
                    return store[name];
                }
                var camelName = camelCase(name);
                if (camelName in store) {
                    return store[camelName];
                }
            }
            var attrName = 'data-' + name.replace(capitalRE, "-$1").toLowerCase()
            return attr(elm, attrName);
        }

    }

    function _setData(elm, name, value) {
        var store = _store(elm, true);
        store[camelCase(name)] = value;
    }


    function data(elm, name, value) {

        if (value === undefined) {
            if (typeof name === "object") {
                for (var dataAttrName in name) {
                    _setData(elm, dataAttrName, name[dataAttrName]);
                }
                return this;
            } else {
                return _getData(elm, name);
            }
        } else {
            _setData(elm, name, value);
            return this;
        }
    }

    function cleanData(elm) {
        if (elm["_$_store"]) {
            delete elm["_$_store"];
        }
    }

    function removeData(elm, names) {
        if (langx.isString(names)) {
            names = names.split(/\s+/);
        }
        var store = _store(elm, true);
        names.forEach(function(name) {
            delete store[name];
        });
        return this;
    }

    function pluck(nodes, property) {
        return map.call(nodes, function(elm) {
            return elm[property];
        });
    }

    function prop(elm, name, value) {
        name = propMap[name] || name;
        if (value === undefined) {
            return elm[name];
        } else {
            elm[name] = value;
            return this;
        }
    }

    function removeAttr(elm, name) {
        name.split(' ').forEach(function(attr) {
            setAttribute(elm, attr);
        });
        return this;
    }

    function removeProp(elm, name) {
        name.split(' ').forEach(function(prop) {
            delete elm[prop];
        });
        return this;
    }

    function text(elm, txt) {
        if (txt === undefined) {
            return elm.textContent;
        } else {
            elm.textContent = txt == null ? '' : '' + txt;
            return this;
        }
    }

    function val(elm, value) {
        if (value === undefined) {
            if (elm.multiple) {
                // select multiple values
                var selectedOptions = filter.call(finder.find(elm, "option"), (function(option) {
                    return option.selected;
                }));
                return pluck(selectedOptions, "value");
            } else {
                return elm.value;
            }
        } else {
            elm.value = value;
            return this;
        }
    }

    function datax() {
        return datax;
    }

    langx.mixin(datax, {
        aria: aria,
        
        attr: attr,

        cleanData : cleanData,
        
        data: data,

        pluck: pluck,

        prop: prop,

        removeAttr: removeAttr,

        removeData: removeData,

        removeProp: removeProp,

        text: text,

        val: val
    });

    return skylark.datax = datax;
});

define('skylark-utils/eventer',[
    "./skylark",
    "./langx",
    "./browser",
    "./finder",
    "./noder",
    "./datax"
], function(skylark, langx, browser, finder, noder, datax) {
    var mixin = langx.mixin,
        each = langx.each,
        slice = Array.prototype.slice,
        uid = langx.uid,
        ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
        eventMethods = {
            preventDefault: "isDefaultPrevented",
            stopImmediatePropagation: "isImmediatePropagationStopped",
            stopPropagation: "isPropagationStopped"
        },
        readyRE = /complete|loaded|interactive/;

    function compatible(event, source) {
        if (source || !event.isDefaultPrevented) {
            if (!source) {
                source = event;
            }

            langx.each(eventMethods, function(name, predicate) {
                var sourceMethod = source[name];
                event[name] = function() {
                    this[predicate] = langx.returnTrue;
                    return sourceMethod && sourceMethod.apply(source, arguments);
                }
                event[predicate] = langx.returnFalse;
            });
        }
        return event;
    }

    function parse(event) {
        var segs = ("" + event).split(".");
        return {
            type: segs[0],
            ns: segs.slice(1).sort().join(" ")
        };
    }

    //create a custom dom event
    var createEvent = (function() {
        var EventCtors = [
                window["CustomEvent"], // 0 default
                window["CompositionEvent"], // 1
                window["DragEvent"], // 2
                window["Event"], // 3
                window["FocusEvent"], // 4
                window["KeyboardEvent"], // 5
                window["MessageEvent"], // 6
                window["MouseEvent"], // 7
                window["MouseScrollEvent"], // 8
                window["MouseWheelEvent"], // 9
                window["MutationEvent"], // 10
                window["ProgressEvent"], // 11
                window["TextEvent"], // 12
                window["TouchEvent"], // 13
                window["UIEvent"], // 14
                window["WheelEvent"], // 15
                window["ClipboardEvent"] // 16
            ],
            NativeEvents = {
                "compositionstart": 1, // CompositionEvent
                "compositionend": 1, // CompositionEvent
                "compositionupdate": 1, // CompositionEvent

                "beforecopy": 16, // ClipboardEvent
                "beforecut": 16, // ClipboardEvent
                "beforepaste": 16, // ClipboardEvent
                "copy": 16, // ClipboardEvent
                "cut": 16, // ClipboardEvent
                "paste": 16, // ClipboardEvent

                "drag": 2, // DragEvent
                "dragend": 2, // DragEvent
                "dragenter": 2, // DragEvent
                "dragexit": 2, // DragEvent
                "dragleave": 2, // DragEvent
                "dragover": 2, // DragEvent
                "dragstart": 2, // DragEvent
                "drop": 2, // DragEvent

                "abort": 3, // Event
                "change": 3, // Event
                "error": 3, // Event
                "selectionchange": 3, // Event
                "submit": 3, // Event
                "reset": 3, // Event

                "focus": 4, // FocusEvent
                "blur": 4, // FocusEvent
                "focusin": 4, // FocusEvent
                "focusout": 4, // FocusEvent

                "keydown": 5, // KeyboardEvent
                "keypress": 5, // KeyboardEvent
                "keyup": 5, // KeyboardEvent

                "message": 6, // MessageEvent

                "click": 7, // MouseEvent
                "contextmenu": 7, // MouseEvent
                "dblclick": 7, // MouseEvent
                "mousedown": 7, // MouseEvent
                "mouseup": 7, // MouseEvent
                "mousemove": 7, // MouseEvent
                "mouseover": 7, // MouseEvent
                "mouseout": 7, // MouseEvent
                "mouseenter": 7, // MouseEvent
                "mouseleave": 7, // MouseEvent


                "textInput": 12, // TextEvent

                "touchstart": 13, // TouchEvent
                "touchmove": 13, // TouchEvent
                "touchend": 13, // TouchEvent

                "load": 14, // UIEvent
                "resize": 14, // UIEvent
                "select": 14, // UIEvent
                "scroll": 14, // UIEvent
                "unload": 14, // UIEvent,

                "wheel": 15 // WheelEvent
            }
        ;

        function getEventCtor(type) {
            var idx = NativeEvents[type];
            if (!idx) {
                idx = 0;
            }
            return EventCtors[idx];
        }

        return function(type, props) {
            //create a custom dom event

            if (langx.isString(type)) {
                props = props || {};
            } else {
                props = type || {};
                type = props.type || "";
            }
            var parsed = parse(type);
            type = parsed.type;

            props = langx.mixin({
                bubbles: true,
                cancelable: true
            }, props);

            if (parsed.ns) {
                props.namespace = parsed.ns;
            }

            var ctor = getEventCtor(type),
                e = new ctor(type, props);

            langx.safeMixin(e, props);

            return compatible(e);
        };
    })();

    function createProxy(src,props) {
        var key,
            proxy = {
                originalEvent: src
            };
        for (key in src) {
            if (key !== "keyIdentifier" && !ignoreProperties.test(key) && src[key] !== undefined) {
                proxy[key] = src[key];
            }
        }
        if (props) {
            langx.mixin(proxy,props);
        }
        return compatible(proxy, src);
    }

    var
        specialEvents = {},
        focusinSupported = "onfocusin" in window,
        focus = { focus: "focusin", blur: "focusout" },
        hover = { mouseenter: "mouseover", mouseleave: "mouseout" },
        realEvent = function(type) {
            return hover[type] || (focusinSupported && focus[type]) || type;
        },
        handlers = {},
        EventBindings = langx.klass({
            init: function(target, event) {
                this._target = target;
                this._event = event;
                this._bindings = [];
            },

            add: function(fn, options) {
                var bindings = this._bindings,
                    binding = {
                        fn: fn,
                        options: langx.mixin({}, options)
                    };

                bindings.push(binding);

                var self = this;
                if (!self._listener) {
                    self._listener = function(domEvt) {
                        var elm = this,
                            e = createProxy(domEvt),
                            args = domEvt._args,
                            bindings = self._bindings,
                            ns = e.namespace;

                        if (langx.isDefined(args)) {
                            args = [e].concat(args);
                        } else {
                            args = [e];
                        }

                        langx.each(bindings,function(idx,binding) {
                            var match = elm;
                            if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) {
                                return false;
                            }
                            var fn = binding.fn,
                                options = binding.options || {},
                                selector = options.selector,
                                one = options.one,
                                data = options.data;

                            if (ns && ns != options.ns && options.ns.indexOf(ns)===-1) {
                                return ;
                            }
                            if (selector) {
                                match = finder.closest(e.target, selector);
                                if (match && match !== elm) {
                                    langx.mixin(e, {
                                        currentTarget: match,
                                        liveFired: elm
                                    });
                                } else {
                                    return ;
                                }
                            }

                            var originalEvent = self._event;
                            if (originalEvent in hover) {
                                var related = e.relatedTarget;
                                if (related && (related === match || noder.contains(match, related))) {
                                    return;
                                }
                            }                           

                            if (langx.isDefined(data)) {
                                e.data = data;
                            }

                            if (one) {
                                self.remove(fn, options);
                            }

                            var result = fn.apply(match, args);

                            if (result === false) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        });;
                    };

                    var event = self._event;
/*
                    if (event in hover) {
                        var l = self._listener;
                        self._listener = function(e) {
                            var related = e.relatedTarget;
                            if (!related || (related !== this && !noder.contains(this, related))) {
                                return l.apply(this, arguments);
                            }
                        }
                    }
*/

                    if (self._target.addEventListener) {
                        self._target.addEventListener(realEvent(event), self._listener, false);
                    } else {
                        console.warn("invalid eventer object", self._target);
                    }
                }

            },
            remove: function(fn, options) {
                options = langx.mixin({}, options);

                function matcherFor(ns) {
                    return new RegExp("(?:^| )" + ns.replace(" ", " .* ?") + "(?: |$)");
                }
                var matcher;
                if (options.ns) {
                    matcher = matcherFor(options.ns);
                }

                this._bindings = this._bindings.filter(function(binding) {
                    var removing = (!fn || fn === binding.fn) &&
                        (!matcher || matcher.test(binding.options.ns)) &&
                        (!options.selector || options.selector == binding.options.selector);

                    return !removing;
                });
                if (this._bindings.length == 0) {
                    if (this._target.removeEventListener) {
                        this._target.removeEventListener(realEvent(this._event), this._listener, false);
                    }
                    this._listener = null;
                }
            }
        }),
        EventsHandler = langx.klass({
            init: function(elm) {
                this._target = elm;
                this._handler = {};
            },

            // add a event listener
            // selector Optional
            register: function(event, callback, options) {
                // Seperate the event from the namespace
                var parsed = parse(event),
                    event = parsed.type,
                    specialEvent = specialEvents[event],
                    bindingEvent = specialEvent && (specialEvent.bindType || specialEvent.bindEventName);

                var events = this._handler;

                // Check if there is already a handler for this event
                if (events[event] === undefined) {
                    events[event] = new EventBindings(this._target, bindingEvent || event);
                }

                // Register the new callback function
                events[event].add(callback, langx.mixin({
                    ns: parsed.ns
                }, options)); // options:{selector:xxx}
            },

            // remove a event listener
            unregister: function(event, fn, options) {
                // Check for parameter validtiy
                var events = this._handler,
                    parsed = parse(event);
                event = parsed.type;

                if (event) {
                    var listener = events[event];

                    if (listener) {
                        listener.remove(fn, langx.mixin({
                            ns: parsed.ns
                        }, options));
                    }
                } else {
                    //remove all events
                    for (event in events) {
                        var listener = events[event];
                        listener.remove(fn, langx.mixin({
                            ns: parsed.ns
                        }, options));
                    }
                }
            }
        }),

        findHandler = function(elm) {
            var id = uid(elm),
                handler = handlers[id];
            if (!handler) {
                handler = handlers[id] = new EventsHandler(elm);
            }
            return handler;
        };

    function off(elm, events, selector, callback) {
        var $this = this
        if (langx.isPlainObject(events)) {
            langx.each(events, function(type, fn) {
                off(elm, type, selector, fn);
            })
            return $this;
        }

        if (!langx.isString(selector) && !langx.isFunction(callback) && callback !== false) {
            callback = selector;
            selector = undefined;
        }

        if (callback === false) {
            callback = langx.returnFalse;
        }

        if (typeof events == "string") {
            if (events.indexOf(",") > -1) {
                events = events.split(",");
            } else {
                events = events.split(/\s/);
            }
        }

        var handler = findHandler(elm);

        if (events) events.forEach(function(event) {

            handler.unregister(event, callback, {
                selector: selector,
            });
        });
        return this;
    }

    function on(elm, events, selector, data, callback, one) {

        var autoRemove, delegator;
        if (langx.isPlainObject(events)) {
            langx.each(events, function(type, fn) {
                on(elm, type, selector, data, fn, one);
            });
            return this;
        }

        if (!langx.isString(selector) && !langx.isFunction(callback)) {
            callback = data;
            data = selector;
            selector = undefined;
        }

        if (langx.isFunction(data)) {
            callback = data;
            data = undefined;
        }

        if (callback === false) {
            callback = langx.returnFalse;
        }

        if (typeof events == "string") {
            if (events.indexOf(",") > -1) {
                events = events.split(",");
            } else {
                events = events.split(/\s/);
            }
        }

        var handler = findHandler(elm);

        events.forEach(function(event) {
            if (event == "ready") {
                return ready(callback);
            }
            handler.register(event, callback, {
                data: data,
                selector: selector,
                one: !!one
            });
        });
        return this;
    }

    function one(elm, events, selector, data, callback) {
        on(elm, events, selector, data, callback, 1);

        return this;
    }

    function stop(event) {
        if (window.document.all) {
            event.keyCode = 0;
        }
        if (event.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        return this;
    }

    function trigger(evented, type, args) {
        var e;
        if (type instanceof Event) {
            e = type;
        } else {
            e = createEvent(type, args);
        }
        e._args = args;

        var fn = (evented.dispatchEvent || evented.trigger);
        if (fn) {
            fn.call(evented, e);
        } else {
            console.warn("The evented parameter is not a eventable object");
        }

        return this;
    }

    function ready(callback) {
        // need to check if document.body exists for IE as that browser reports
        // document ready when it hasn't yet created the body elm
        if (readyRE.test(document.readyState) && document.body) {
            langx.defer(callback);
        } else {
            document.addEventListener('DOMContentLoaded', callback, false);
        }

        return this;
    }

    var keyCodeLookup = {
        "backspace": 8,
        "comma": 188,
        "delete": 46,
        "down": 40,
        "end": 35,
        "enter": 13,
        "escape": 27,
        "home": 36,
        "left": 37,
        "page_down": 34,
        "page_up": 33,
        "period": 190,
        "right": 39,
        "space": 32,
        "tab": 9,
        "up": 38        
    };
    //example:
    //shortcuts(elm).add("CTRL+ALT+SHIFT+X",function(){console.log("test!")});
    function shortcuts(elm) {

        var registry = datax.data(elm, "shortcuts");
        if (!registry) {
            registry = {};
            datax.data(elm, "shortcuts", registry);
            var run = function(shortcut, event) {
                var n = event.metaKey || event.ctrlKey;
                if (shortcut.ctrl == n && shortcut.alt == event.altKey && shortcut.shift == event.shiftKey) {
                    if (event.keyCode == shortcut.keyCode || event.charCode && event.charCode == shortcut.charCode) {
                        event.preventDefault();
                        if ("keydown" == event.type) {
                            shortcut.fn(event);
                        }
                        return true;
                    }
                }
            };
            on(elm, "keyup keypress keydown", function(event) {
                if (!(/INPUT|TEXTAREA/.test(event.target.nodeName))) {
                    for (var key in registry) {
                        run(registry[key], event);
                    }
                }
            });

        }

        return {
            add: function(pattern, fn) {
                var shortcutKeys;
                if (pattern.indexOf(",") > -1) {
                    shortcutKeys = pattern.toLowerCase().split(",");
                } else {
                    shortcutKeys = pattern.toLowerCase().split(" ");
                }
                shortcutKeys.forEach(function(shortcutKey) {
                    var setting = {
                        fn: fn,
                        alt: false,
                        ctrl: false,
                        shift: false
                    };
                    shortcutKey.split("+").forEach(function(key) {
                        switch (key) {
                            case "alt":
                            case "ctrl":
                            case "shift":
                                setting[key] = true;
                                break;
                            default:
                                setting.charCode = key.charCodeAt(0);
                                setting.keyCode = keyCodeLookup[key] || key.toUpperCase().charCodeAt(0);
                        }
                    });
                    var regKey = (setting.ctrl ? "ctrl" : "") + "," + (setting.alt ? "alt" : "") + "," + (setting.shift ? "shift" : "") + "," + setting.keyCode;
                    registry[regKey] = setting;
                })
            }

        };

    }

    function eventer() {
        return eventer;
    }

    langx.mixin(eventer, {
        create: createEvent,

        keys : keyCodeLookup,

        off: off,

        on: on,

        one: one,

        proxy: createProxy,

        ready: ready,

        shortcuts: shortcuts,

        special : specialEvents,

        stop: stop,

        trigger: trigger

    });

    return skylark.eventer = eventer;
});

define('skylark-utils/geom',[
    "./skylark",
    "./langx",
    "./noder",
    "./styler"
], function(skylark, langx, noder,styler) {
    var rootNodeRE = /^(?:body|html)$/i,
        px = langx.toPixel,
        offsetParent = noder.offsetParent,
        cachedScrollbarWidth;


    function scrollbarWidth() {
        if ( cachedScrollbarWidth !== undefined ) {
            return cachedScrollbarWidth;
        }
        var w1, w2,
            div = noder.createFragment( "<div style=" +
                "'display:block;position:absolute;width:200px;height:200px;overflow:hidden;'>" +
                "<div style='height:300px;width:auto;'></div></div>" )[0],
            innerDiv = div.childNodes[0];

        noder.append(document.body,div);

        w1 = innerDiv.offsetWidth;
        
        styler.css( div, "overflow", "scroll" );

        w2 = innerDiv.offsetWidth;

        if ( w1 === w2 ) {
            w2 = div[0].clientWidth;
        }

        noder.remove(div);

        return ( cachedScrollbarWidth = w1 - w2 );
    }

    function borderExtents(elm) {
        var s = getComputedStyle(elm);
        return {
            left: px(s.borderLeftWidth , elm),
            top: px(s.borderTopWidth, elm),
            right: px(s.borderRightWidth, elm),
            bottom: px(s.borderBottomWidth, elm)
        }
    }

    //viewport coordinate
    function boundingPosition(elm, coords) {
        if (coords === undefined) {
            return rootNodeRE.test(elm.nodeName) ? { top: 0, left: 0 } : elm.getBoundingClientRect();
        } else {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                parentOffset = boundingPosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            relativePosition(elm, {
                top: coords.top - parentOffset.top - mex.top - pbex.top,
                left: coords.left - parentOffset.left - mex.left - pbex.left
            });
            return this;
        }
    }

    function boundingRect(elm, coords) {
        if (coords === undefined) {
            return elm.getBoundingClientRect()
        } else {
            boundingPosition(elm, coords);
            size(elm, coords);
            return this;
        }
    }

    function clientHeight(elm, value) {
        if (value == undefined) {
            return clientSize(elm).height;
        } else {
            return clientSize(elm, {
                height: value
            });
        }
    }

    function clientSize(elm, dimension) {
        if (dimension == undefined) {
            return {
                width: elm.clientWidth,
                height: elm.clientHeight
            }
        } else {
            var isBorderBox = (styler.css(elm, "box-sizing") === "border-box"),
                props = {
                    width: dimension.width,
                    height: dimension.height
                };
            if (!isBorderBox) {
                var pex = paddingExtents(elm);

                if (props.width !== undefined) {
                    props.width = props.width - pex.left - pex.right;
                }

                if (props.height !== undefined) {
                    props.height = props.height - pex.top - pex.bottom;
                }
            } else {
                var bex = borderExtents(elm);

                if (props.width !== undefined) {
                    props.width = props.width + bex.left + bex.right;
                }

                if (props.height !== undefined) {
                    props.height = props.height + bex.top + bex.bottom;
                }

            }
            styler.css(elm, props);
            return this;
        }
        return {
            width: elm.clientWidth,
            height: elm.clientHeight
        };
    }

    function clientWidth(elm, value) {
        if (value == undefined) {
            return clientSize(elm).width;
        } else {
            clientSize(elm, {
                width: value
            });
            return this;
        }
    }

    function contentRect(elm) {
        var cs = clientSize(elm),
            pex = paddingExtents(elm);


        //// On Opera, offsetLeft includes the parent's border
        //if(has("opera")){
        //    pe.l += be.l;
        //    pe.t += be.t;
        //}
        return {
            left: pex.left,
            top: pex.top,
            width: cs.width - pex.left - pex.right,
            height: cs.height - pex.top - pex.bottom
        };
    }

    function getDocumentSize(doc) {
        var documentElement = doc.documentElement,
            body = doc.body,
            max = Math.max,
            scrollWidth = max(documentElement.scrollWidth, body.scrollWidth),
            clientWidth = max(documentElement.clientWidth, body.clientWidth),
            offsetWidth = max(documentElement.offsetWidth, body.offsetWidth),
            scrollHeight = max(documentElement.scrollHeight, body.scrollHeight),
            clientHeight = max(documentElement.clientHeight, body.clientHeight),
            offsetHeight = max(documentElement.offsetHeight, body.offsetHeight);

        return {
            width: scrollWidth < offsetWidth ? clientWidth : scrollWidth,
            height: scrollHeight < offsetHeight ? clientHeight : scrollHeight
        };
    }

    function height(elm, value) {
        if (value == undefined) {
            return size(elm).height;
        } else {
            size(elm, {
                height: value
            });
            return this;
        }
    }

    function marginExtents(elm) {
        var s = getComputedStyle(elm);
        return {
            left: px(s.marginLeft),
            top: px(s.marginTop),
            right: px(s.marginRight),
            bottom: px(s.marginBottom),
        }
    }

    function marginRect(elm) {
        var obj = this.relativeRect(elm),
            me = this.marginExtents(elm);

        return {
                left: obj.left,
                top: obj.top,
                width: obj.width + me.left + me.right,
                height: obj.height + me.top + me.bottom
            };
    }


    function marginSize(elm) {
        var obj = this.size(elm),
            me = this.marginExtents(elm);

        return {
                width: obj.width + me.left + me.right,
                height: obj.height + me.top + me.bottom
            };
    }

    function paddingExtents(elm) {
        var s = getComputedStyle(elm);
        return {
            left: px(s.paddingLeft),
            top: px(s.paddingTop),
            right: px(s.paddingRight),
            bottom: px(s.paddingBottom),
        }
    }

    //coordinate to the document
    function pagePosition(elm, coords) {
        if (coords === undefined) {
            var obj = elm.getBoundingClientRect()
            return {
                left: obj.left + window.pageXOffset,
                top: obj.top + window.pageYOffset
            }
        } else {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                parentOffset = pagePosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            relativePosition(elm, {
                top: coords.top - parentOffset.top - mex.top - pbex.top,
                left: coords.left - parentOffset.left - mex.left - pbex.left
            });
            return this;
        }
    }

    function pageRect(elm, coords) {
        if (coords === undefined) {
            var obj = elm.getBoundingClientRect()
            return {
                left: obj.left + window.pageXOffset,
                top: obj.top + window.pageYOffset,
                width: Math.round(obj.width),
                height: Math.round(obj.height)
            }
        } else {
            pagePosition(elm, coords);
            size(elm, coords);
            return this;
        }
    }

    // coordinate relative to it's parent
    function relativePosition(elm, coords) {
        if (coords == undefined) {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                offset = boundingPosition(elm),
                parentOffset = boundingPosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            // Subtract parent offsets and element margins
            return {
                top: offset.top - parentOffset.top - pbex.top,// - mex.top,
                left: offset.left - parentOffset.left - pbex.left,// - mex.left
            }
        } else {
            var props = {
                top: coords.top,
                left: coords.left
            }

            if (styler.css(elm, "position") == "static") {
                props['position'] = "relative";
            }
            styler.css(elm, props);
            return this;
        }
    }

    function relativeRect(elm, coords) {
        if (coords === undefined) {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                offset = boundingRect(elm),
                parentOffset = boundingPosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            // Subtract parent offsets and element margins
            return {
                top: offset.top - parentOffset.top - pbex.top, // - mex.top,
                left: offset.left - parentOffset.left - pbex.left, // - mex.left,
                width: offset.width,
                height: offset.height
            }
        } else {
            relativePosition(elm, coords);
            size(elm, coords);
            return this;
        }
    }

    function scrollIntoView(elm, align) {
        function getOffset(elm, rootElm) {
            var x, y, parent = elm;

            x = y = 0;
            while (parent && parent != rootElm && parent.nodeType) {
                x += parent.offsetLeft || 0;
                y += parent.offsetTop || 0;
                parent = parent.offsetParent;
            }

            return { x: x, y: y };
        }

        var parentElm = elm.parentNode;
        var x, y, width, height, parentWidth, parentHeight;
        var pos = getOffset(elm, parentElm);

        x = pos.x;
        y = pos.y;
        width = elm.offsetWidth;
        height = elm.offsetHeight;
        parentWidth = parentElm.clientWidth;
        parentHeight = parentElm.clientHeight;

        if (align == "end") {
            x -= parentWidth - width;
            y -= parentHeight - height;
        } else if (align == "center") {
            x -= (parentWidth / 2) - (width / 2);
            y -= (parentHeight / 2) - (height / 2);
        }

        parentElm.scrollLeft = x;
        parentElm.scrollTop = y;

        return this;
    }

    function scrollLeft(elm, value) {
        var hasScrollLeft = "scrollLeft" in elm;
        if (value === undefined) {
            return hasScrollLeft ? elm.scrollLeft : elm.pageXOffset
        } else {
            if (hasScrollLeft) {
                elm.scrollLeft = value;
            } else {
                elm.scrollTo(value, elm.scrollY);
            }
            return this;
        }
    }

    function scrollTop(elm, value) {
        var hasScrollTop = "scrollTop" in elm;

        if (value === undefined) {
            return hasScrollTop ? elm.scrollTop : elm.pageYOffset
        } else {
            if (hasScrollTop) {
                elm.scrollTop = value;
            } else {
                elm.scrollTo(elm.scrollX, value);
            }
            return this;
        }
    }

    function size(elm, dimension) {
        if (dimension == undefined) {
            if (langx.isWindow(elm)) {
                return {
                    width: elm.innerWidth,
                    height: elm.innerHeight
                }

            } else if (langx.isDocument(elm)) {
                return getDocumentSize(document);
            } else {
                return {
                    width: elm.offsetWidth,
                    height: elm.offsetHeight
                }
            }
        } else {
            var isBorderBox = (styler.css(elm, "box-sizing") === "border-box"),
                props = {
                    width: dimension.width,
                    height: dimension.height
                };
            if (!isBorderBox) {
                var pex = paddingExtents(elm),
                    bex = borderExtents(elm);

                if (props.width !== undefined && props.width !== "" && props.width !== null) {
                    props.width = props.width - pex.left - pex.right - bex.left - bex.right;
                }

                if (props.height !== undefined && props.height !== "" && props.height !== null) {
                    props.height = props.height - pex.top - pex.bottom - bex.top - bex.bottom;
                }
            }
            styler.css(elm, props);
            return this;
        }
    }

    function width(elm, value) {
        if (value == undefined) {
            return size(elm).width;
        } else {
            size(elm, {
                width: value
            });
            return this;
        }
    }

    function geom() {
        return geom;
    }

    langx.mixin(geom, {
        borderExtents: borderExtents,
        //viewport coordinate
        boundingPosition: boundingPosition,

        boundingRect: boundingRect,

        clientHeight: clientHeight,

        clientSize: clientSize,

        clientWidth: clientWidth,

        contentRect: contentRect,

        getDocumentSize: getDocumentSize,

        height: height,

        marginExtents: marginExtents,

        marginRect : marginRect,

        marginSize : marginSize,

        offsetParent: offsetParent,

        paddingExtents: paddingExtents,

        //coordinate to the document
        pagePosition: pagePosition,

        pageRect: pageRect,

        // coordinate relative to it's parent
        relativePosition: relativePosition,

        relativeRect: relativeRect,

        scrollbarWidth : scrollbarWidth,

        scrollIntoView: scrollIntoView,

        scrollLeft: scrollLeft,

        scrollTop: scrollTop,

        size: size,

        width: width
    });

    return skylark.geom = geom;
});

define('skylark-utils/fx',[
    "./skylark",
    "./langx",
    "./browser",
    "./geom",
    "./styler",
    "./eventer"
], function(skylark, langx, browser, geom, styler, eventer) {
    var animationName,
        animationDuration,
        animationTiming,
        animationDelay,
        transitionProperty,
        transitionDuration,
        transitionTiming,
        transitionDelay,

        animationEnd = browser.normalizeCssEvent('AnimationEnd'),
        transitionEnd = browser.normalizeCssEvent('TransitionEnd'),

        supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
        transform = browser.css3PropPrefix + "transform",
        cssReset = {};


    cssReset[animationName = browser.normalizeCssProperty("animation-name")] =
        cssReset[animationDuration = browser.normalizeCssProperty("animation-duration")] =
        cssReset[animationDelay = browser.normalizeCssProperty("animation-delay")] =
        cssReset[animationTiming = browser.normalizeCssProperty("animation-timing-function")] = "";

    cssReset[transitionProperty = browser.normalizeCssProperty("transition-property")] =
        cssReset[transitionDuration = browser.normalizeCssProperty("transition-duration")] =
        cssReset[transitionDelay = browser.normalizeCssProperty("transition-delay")] =
        cssReset[transitionTiming = browser.normalizeCssProperty("transition-timing-function")] = "";



    function animate(elm, properties, duration, ease, callback, delay) {
        var key,
            cssValues = {},
            cssProperties = [],
            transforms = "",
            that = this,
            endEvent,
            wrappedCallback,
            fired = false,
            hasScrollTop = false;

        if (langx.isPlainObject(duration)) {
            ease = duration.easing;
            callback = duration.complete;
            delay = duration.delay;
            duration = duration.duration;
        }

        if (langx.isString(duration)) {
            duration = fx.speeds[duration];
        }
        if (duration === undefined) {
            duration = fx.speeds.normal;
        }
        duration = duration / 1000;
        if (fx.off) {
            duration = 0;
        }

        if (langx.isFunction(ease)) {
            callback = ease;
            eace = "swing";
        } else {
            ease = ease || "swing";
        }

        if (delay) {
            delay = delay / 1000;
        } else {
            delay = 0;
        }

        if (langx.isString(properties)) {
            // keyframe animation
            cssValues[animationName] = properties;
            cssValues[animationDuration] = duration + "s";
            cssValues[animationTiming] = ease;
            endEvent = animationEnd;
        } else {
            // CSS transitions
            for (key in properties) {
                if (supportedTransforms.test(key)) {
                    transforms += key + "(" + properties[key] + ") ";
                } else {
                    if (key === "scrollTop") {
                        hasScrollTop = true;
                    }
                    cssValues[key] = properties[key];
                    cssProperties.push(langx.dasherize(key));
                }
            }
            endEvent = transitionEnd;
        }

        if (transforms) {
            cssValues[transform] = transforms;
            cssProperties.push(transform);
        }

        if (duration > 0 && langx.isPlainObject(properties)) {
            cssValues[transitionProperty] = cssProperties.join(", ");
            cssValues[transitionDuration] = duration + "s";
            cssValues[transitionDelay] = delay + "s";
            cssValues[transitionTiming] = ease;
        }

        wrappedCallback = function(event) {
            fired = true;
            if (event) {
                if (event.target !== event.currentTarget) {
                    return // makes sure the event didn't bubble from "below"
                }
                eventer.off(event.target, endEvent, wrappedCallback)
            } else {
                eventer.off(elm, animationEnd, wrappedCallback) // triggered by setTimeout
            }
            styler.css(elm, cssReset);
            callback && callback.call(this);
        };

        if (duration > 0) {
            eventer.on(elm, endEvent, wrappedCallback);
            // transitionEnd is not always firing on older Android phones
            // so make sure it gets fired
            langx.debounce(function() {
                if (fired) {
                    return;
                }
                wrappedCallback.call(that);
            }, ((duration + delay) * 1000) + 25)();
        }

        // trigger page reflow so new elements can animate
        elm.clientLeft;

        styler.css(elm, cssValues);

        if (duration <= 0) {
            langx.debounce(function() {
                if (fired) {
                    return;
                }
                wrappedCallback.call(that);
            }, 0)();
        }

        if (hasScrollTop) {
            scrollToTop(elm, properties["scrollTop"], duration, callback);
        }

        return this;
    }

    function show(elm, speed, callback) {
        styler.show(elm);
        if (speed) {
            if (!callback && langx.isFunction(speed)) {
                callback = speed;
                speed = "normal";
            }
            styler.css(elm, "opacity", 0)
            animate(elm, { opacity: 1, scale: "1,1" }, speed, callback);
        }
        return this;
    }


    function hide(elm, speed, callback) {
        if (speed) {
            if (!callback && langx.isFunction(speed)) {
                callback = speed;
                speed = "normal";
            }
            animate(elm, { opacity: 0, scale: "0,0" }, speed, function() {
                styler.hide(elm);
                if (callback) {
                    callback.call(elm);
                }
            });
        } else {
            styler.hide(elm);
        }
        return this;
    }

    function scrollToTop(elm, pos, speed, callback) {
        var scrollFrom = parseInt(elm.scrollTop),
            i = 0,
            runEvery = 5, // run every 5ms
            freq = speed * 1000 / runEvery,
            scrollTo = parseInt(pos);

        var interval = setInterval(function() {
            i++;

            if (i <= freq) elm.scrollTop = (scrollTo - scrollFrom) / freq * i + scrollFrom;

            if (i >= freq + 1) {
                clearInterval(interval);
                if (callback) langx.debounce(callback, 1000)();
            }
        }, runEvery);
    }

    function toggle(elm, speed, callback) {
        if (styler.isInvisible(elm)) {
            show(elm, speed, callback);
        } else {
            hide(elm, speed, callback);
        }
        return this;
    }

    function fadeTo(elm, speed, opacity, easing, callback) {
        animate(elm, { opacity: opacity }, speed, easing, callback);
        return this;
    }

    function fadeIn(elm, speed, easing, callback) {
        var target = styler.css(elm, "opacity");
        if (target > 0) {
            styler.css(elm, "opacity", 0);
        } else {
            target = 1;
        }
        styler.show(elm);

        fadeTo(elm, speed, target, easing, callback);

        return this;
    }

    function fadeOut(elm, speed, easing, callback) {
        var _elm = elm,
            complete,
            options = {};

        if (langx.isPlainObject(speed)) {
            options.easing = speed.easing;
            options.duration = speed.duration;
            complete = speed.complete;
        } else {
            options.duration = speed;
            if (callback) {
                complete = callback;
                options.easing = easing;
            } else {
                complete = easing;
            }
        }
        options.complete = function() {
            styler.hide(elm);
            if (complete) {
                complete.call(elm);
            }
        }

        fadeTo(elm, options, 0);

        return this;
    }

    function fadeToggle(elm, speed, ceasing, allback) {
        if (styler.isInvisible(elm)) {
            fadeIn(elm, speed, easing, callback);
        } else {
            fadeOut(elm, speed, easing, callback);
        }
        return this;
    }

    function slideDown(elm,duration,callback) {    
    
        // get the element position to restore it then
        var position = styler.css(elm,'position');
        
        // show element if it is hidden
        show(elm);
        
        // place it so it displays as usually but hidden
        styler.css(elm,{
            position: 'absolute',
            visibility: 'hidden'
        });
        
        // get naturally height, margin, padding
        var marginTop = styler.css(elm,'margin-top');
        var marginBottom = styler.css(elm,'margin-bottom');
        var paddingTop = styler.css(elm,'padding-top');
        var paddingBottom = styler.css(elm,'padding-bottom');
        var height = styler.css(elm,'height');
        
        // set initial css for animation
        styler.css(elm,{
            position: position,
            visibility: 'visible',
            overflow: 'hidden',
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0
        });
        
        // animate to gotten height, margin and padding
        animate(elm,{
            height: height,
            marginTop: marginTop,
            marginBottom: marginBottom,
            paddingTop: paddingTop,
            paddingBottom: paddingBottom
        }, {
            duration : duration,
            complete: function(){
                if (callback) {
                    callback.apply(elm); 
                }
            }    
        }
    );
        
        return this;
    };

    function slideUp(elm,duration,callback) {
        // active the function only if the element is visible
        if (geom.height(elm) > 0) {
                   
            // get the element position to restore it then
            var position = styler.css(elm,'position');
            
            // get the element height, margin and padding to restore them then
            var height = styler.css(elm,'height');
            var marginTop = styler.css(elm,'margin-top');
            var marginBottom = styler.css(elm,'margin-bottom');
            var paddingTop = styler.css(elm,'padding-top');
            var paddingBottom = styler.css(elm,'padding-bottom');
            
            // set initial css for animation
            styler.css(elm,{
                visibility: 'visible',
                overflow: 'hidden',
                height: height,
                marginTop: marginTop,
                marginBottom: marginBottom,
                paddingTop: paddingTop,
                paddingBottom: paddingBottom
            });
            
            // animate element height, margin and padding to zero
            animate(elm,{
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                paddingTop: 0,
                paddingBottom: 0
            }, { 
                // callback : restore the element position, height, margin and padding to original values
                duration: duration,
                queue: false,
                complete: function(){
                    hide(elm);
                    styler.css(elm,{
                        visibility: 'visible',
                        overflow: 'hidden',
                        height: height,
                        marginTop: marginTop,
                        marginBottom: marginBottom,
                        paddingTop: paddingTop,
                        paddingBottom: paddingBottom
                    });
                    if (callback) {
                        callback.apply(elm); 
                    }
                }
            });
        }
        return this;
    };
    
    /* SlideToggle */
    function slideToggle(elm,duration,callback) {
    
        // if the element is hidden, slideDown !
        if (geom.height(elm) == 0) {
            slideDown(elm,duration,callback);
        } 
        // if the element is visible, slideUp !
        else {
            slideUp(elm,duration,callback);
        }
        return this;
    };


    function fx() {
        return fx;
    }

    langx.mixin(fx, {
        off: false,

        speeds: {
            normal: 400,
            fast: 200,
            slow: 600
        },

        animate: animate,
        fadeIn: fadeIn,
        fadeOut: fadeOut,
        fadeTo: fadeTo,
        fadeToggle: fadeToggle,
        hide: hide,
        scrollToTop: scrollToTop,

        slideDown : slideDown,
        slideToggle : slideToggle,
        slideUp : slideUp,
        show: show,
        toggle: toggle
    });

    return skylark.fx = fx;
});
define('skylark-utils/query',[
    "./skylark",
    "./langx",
    "./noder",
    "./datax",
    "./eventer",
    "./finder",
    "./geom",
    "./styler",
    "./fx"
], function(skylark, langx, noder, datax, eventer, finder, geom, styler, fx) {
    var some = Array.prototype.some,
        push = Array.prototype.push,
        every = Array.prototype.every,
        concat = Array.prototype.concat,
        slice = Array.prototype.slice,
        map = Array.prototype.map,
        filter = Array.prototype.filter,
        forEach = Array.prototype.forEach,
        indexOf = Array.prototype.indexOf,
        sort = Array.prototype.sort,
        isQ;

    var rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/;

    var funcArg = langx.funcArg,
        isArrayLike = langx.isArrayLike,
        isString = langx.isString,
        uniq = langx.uniq,
        isFunction = langx.isFunction;

    var type = langx.type,
        isArray = langx.isArray,

        isWindow = langx.isWindow,

        isDocument = langx.isDocument,

        isObject = langx.isObject,

        isPlainObject = langx.isPlainObject,

        compact = langx.compact,

        flatten = langx.flatten,

        camelCase = langx.camelCase,

        dasherize = langx.dasherize,
        children = finder.children;

    function wrapper_map(func, context) {
        return function() {
            var self = this,
                params = slice.call(arguments);
            var result = $.map(self, function(elem, idx) {
                return func.apply(context, [elem].concat(params));
            });
            return $(uniq(result));
        }
    }

    function wrapper_selector(func, context, last) {
        return function(selector) {
            var self = this,
                params = slice.call(arguments);
            var result = this.map(function(idx, elem) {
                // if (elem.nodeType == 1) {
                if (elem.querySelector) {
                    return func.apply(context, last ? [elem] : [elem, selector]);
                }
            });
            if (last && selector) {
                return result.filter(selector);
            } else {
                return result;
            }
        }
    }

    function wrapper_selector_until(func, context, last) {
        return function(util, selector) {
            var self = this,
                params = slice.call(arguments);
            if (selector === undefined) {
                selector = util;
                util = undefined;
            }
            var result = this.map(function(idx, elem) {
                // if (elem.nodeType == 1) {
                if (elem.querySelector) {
                    return func.apply(context, last ? [elem, util] : [elem, selector, util]);
                }
            });
            if (last && selector) {
                return result.filter(selector);
            } else {
                return result;
            }
        }
    }


    function wrapper_every_act(func, context) {
        return function() {
            var self = this,
                params = slice.call(arguments);
            this.each(function(idx) {
                func.apply(context, [this].concat(params));
            });
            return self;
        }
    }

    function wrapper_every_act_firstArgFunc(func, context, oldValueFunc) {
        return function(arg1) {
            var self = this,
                params = slice.call(arguments);
            forEach.call(self, function(elem, idx) {
                var newArg1 = funcArg(elem, arg1, idx, oldValueFunc(elem));
                func.apply(context, [elem, arg1].concat(params.slice(1)));
            });
            return self;
        }
    }

    function wrapper_some_chk(func, context) {
        return function() {
            var self = this,
                params = slice.call(arguments);
            return some.call(self, function(elem) {
                return func.apply(context, [elem].concat(params));
            });
        }
    }

    function wrapper_name_value(func, context, oldValueFunc) {
        return function(name, value) {
            var self = this,
                params = slice.call(arguments);

            if (langx.isPlainObject(name) || langx.isDefined(value)) {
                forEach.call(self, function(elem, idx) {
                    var newValue;
                    if (oldValueFunc) {
                        newValue = funcArg(elem, value, idx, oldValueFunc(elem, name));
                    } else {
                        newValue = value
                    }
                    func.apply(context, [elem].concat(params));
                });
                return self;
            } else {
                if (self[0]) {
                    return func.apply(context, [self[0], name]);
                }
            }

        }
    }

    function wrapper_value(func, context, oldValueFunc) {
        return function(value) {
            var self = this;

            if (langx.isDefined(value)) {
                forEach.call(self, function(elem, idx) {
                    var newValue;
                    if (oldValueFunc) {
                        newValue = funcArg(elem, value, idx, oldValueFunc(elem));
                    } else {
                        newValue = value
                    }
                    func.apply(context, [elem, newValue]);
                });
                return self;
            } else {
                if (self[0]) {
                    return func.apply(context, [self[0]]);
                }
            }

        }
    }

    var NodeList = langx.klass({
        klassName: "SkNodeList",
        init: function(selector, context) {
            var self = this,
                match, nodes, node, props;

            if (selector) {
                self.context = context = context || noder.doc();

                if (isString(selector)) {
                    // a html string or a css selector is expected
                    self.selector = selector;

                    if (selector.charAt(0) === "<" && selector.charAt(selector.length - 1) === ">" && selector.length >= 3) {
                        match = [null, selector, null];
                    } else {
                        match = rquickExpr.exec(selector);
                    }

                    if (match) {
                        if (match[1]) {
                            // if selector is html
                            nodes = noder.createFragment(selector);

                            if (langx.isPlainObject(context)) {
                                props = context;
                            }

                        } else {
                            node = finder.byId(match[2], noder.ownerDoc(context));

                            if (node) {
                                // if selector is id
                                nodes = [node];
                            }

                        }
                    } else {
                        // if selector is css selector
                        if (langx.isString(context)) {
                            context = finder.find(context);
                        }

                        nodes = finder.descendants(context, selector);
                    }
                } else {
                    if (isArray(selector)) {
                        // a dom node array is expected
                        nodes = selector;
                    } else {
                        // a dom node is expected
                        nodes = [selector];
                    }
                    //self.add(selector, false);
                }
            }


            if (nodes) {

                push.apply(self, nodes);

                if (props) {
                    for ( var name  in props ) {
                        // Properties of context are called as methods if possible
                        if ( langx.isFunction( this[ name ] ) ) {
                            this[ name ]( props[ name ] );
                        } else {
                            this.attr( name, props[ name ] );
                        }
                    }
                }
            }

            return self;
        }
    });

    var query = (function() {
        isQ = function(object) {
            return object instanceof NodeList;
        }
        init = function(selector, context) {
            return new NodeList(selector, context);
        }

        var $ = function(selector, context) {
            if (isFunction(selector)) {
                eventer.ready(function() {
                    selector($);
                });
            } else if (isQ(selector)) {
                return selector;
            } else {
                if (context && isQ(context) && isString(selector)) {
                    return context.find(selector);
                }
                return init(selector, context);
            }
        };

        $.fn = NodeList.prototype;
        langx.mixin($.fn, {
            // `map` and `slice` in the jQuery API work differently
            // from their array counterparts
            length : 0,

            map: function(fn) {
                return $(uniq(langx.map(this, function(el, i) {
                    return fn.call(el, i, el)
                })));
            },

            slice: function() {
                return $(slice.apply(this, arguments))
            },

            forEach: function() {
                return forEach.apply(this,arguments);
            },

            get: function(idx) {
                return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
            },

            indexOf: function() {
                return indexOf.apply(this,arguments);
            },

            sort : function() {
                return sort.apply(this,arguments);
            },

            toArray: function() {
                return slice.call(this);
            },

            size: function() {
                return this.length
            },

            remove: wrapper_every_act(noder.remove, noder),

            each: function(callback) {
                langx.each(this, callback);
                return this;
            },

            filter: function(selector) {
                if (isFunction(selector)) return this.not(this.not(selector))
                return $(filter.call(this, function(element) {
                    return finder.matches(element, selector)
                }))
            },

            add: function(selector, context) {
                return $(uniq(this.toArray().concat($(selector, context).toArray())));
            },

            is: function(selector) {
                if (this.length > 0) {
                    var self = this;
                    if (langx.isString(selector)) {
                        return some.call(self,function(elem) {
                            return finder.matches(elem, selector);
                        });
                    } else if (langx.isArrayLike(selector)) {
                       return some.call(self,function(elem) {
                            return langx.inArray(elem, selector);
                        });
                    } else if (langx.isHtmlNode(selector)) {
                       return some.call(self,function(elem) {
                            return elem ==  selector;
                        });
                    }
                }
                return false;
            },
            
            not: function(selector) {
                var nodes = []
                if (isFunction(selector) && selector.call !== undefined)
                    this.each(function(idx) {
                        if (!selector.call(this, idx)) nodes.push(this)
                    })
                else {
                    var excludes = typeof selector == 'string' ? this.filter(selector) :
                        (isArrayLike(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
                    this.forEach(function(el) {
                        if (excludes.indexOf(el) < 0) nodes.push(el)
                    })
                }
                return $(nodes)
            },

            has: function(selector) {
                return this.filter(function() {
                    return isObject(selector) ?
                        noder.contains(this, selector) :
                        $(this).find(selector).size()
                })
            },

            eq: function(idx) {
                return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1);
            },

            first: function() {
                return this.eq(0);
            },

            last: function() {
                return this.eq(-1);
            },

            find: wrapper_selector(finder.descendants, finder),

            closest: wrapper_selector(finder.closest, finder),
            /*
                        closest: function(selector, context) {
                            var node = this[0],
                                collection = false
                            if (typeof selector == 'object') collection = $(selector)
                            while (node && !(collection ? collection.indexOf(node) >= 0 : finder.matches(node, selector)))
                                node = node !== context && !isDocument(node) && node.parentNode
                            return $(node)
                        },
            */


            parents: wrapper_selector(finder.ancestors, finder),

            parentsUntil: wrapper_selector_until(finder.ancestors, finder),


            parent: wrapper_selector(finder.parent, finder),

            children: wrapper_selector(finder.children, finder),

            contents: wrapper_map(noder.contents, noder),

            empty: wrapper_every_act(noder.empty, noder),

            // `pluck` is borrowed from Prototype.js
            pluck: function(property) {
                return langx.map(this, function(el) {
                    return el[property]
                })
            },

            pushStack : function(elms) {
                var ret = $(elms);
                ret.prevObject = this;
                return ret;
            },
            
            show: wrapper_every_act(fx.show, fx),

            replaceWith: function(newContent) {
                return this.before(newContent).remove();
            },

            wrap: function(structure) {
                var func = isFunction(structure)
                if (this[0] && !func)
                    var dom = $(structure).get(0),
                        clone = dom.parentNode || this.length > 1

                return this.each(function(index) {
                    $(this).wrapAll(
                        func ? structure.call(this, index) :
                        clone ? dom.cloneNode(true) : dom
                    )
                })
            },

            wrapAll: function(wrappingElement) {
                if (this[0]) {
                    $(this[0]).before(wrappingElement = $(wrappingElement));
                    var children;
                    // drill down to the inmost element
                    while ((children = wrappingElement.children()).length) {
                        wrappingElement = children.first();
                    }
                    $(wrappingElement).append(this);
                }
                return this
            },

            wrapInner: function(wrappingElement) {
                var func = isFunction(wrappingElement)
                return this.each(function(index) {
                    var self = $(this),
                        contents = self.contents(),
                        dom = func ? wrappingElement.call(this, index) : wrappingElement
                    contents.length ? contents.wrapAll(dom) : self.append(dom)
                })
            },

            unwrap: function(selector) {
                if (this.parent().children().length === 0) {
                    // remove dom without text
                    this.parent(selector).not("body").each(function() {
                        $(this).replaceWith(document.createTextNode(this.childNodes[0].textContent));
                    });
                } else {
                    this.parent().each(function() {
                        $(this).replaceWith($(this).children())
                    });
                }
                return this
            },

            clone: function() {
                return this.map(function() {
                    return this.cloneNode(true)
                })
            },

            hide: wrapper_every_act(fx.hide, fx),

            toggle: function(setting) {
                return this.each(function() {
                    var el = $(this);
                    (setting === undefined ? el.css("display") == "none" : setting) ? el.show(): el.hide()
                })
            },

            prev: function(selector) {
                return $(this.pluck('previousElementSibling')).filter(selector || '*')
            },

            prevAll: wrapper_selector(finder.previousSibling, finder),

            next: function(selector) {
                return $(this.pluck('nextElementSibling')).filter(selector || '*')
            },

            nextAll: wrapper_selector(finder.nextSiblings, finder),

            siblings: wrapper_selector(finder.siblings, finder),

            html: wrapper_value(noder.html, noder, noder.html),

            text: wrapper_value(datax.text, datax, datax.text),

            attr: wrapper_name_value(datax.attr, datax, datax.attr),

            removeAttr: wrapper_every_act(datax.removeAttr, datax),

            prop: wrapper_name_value(datax.prop, datax, datax.prop),

            removeProp: wrapper_every_act(datax.removeProp, datax),

            data: wrapper_name_value(datax.data, datax, datax.data),

            removeData: wrapper_every_act(datax.removeData, datax),

            val: wrapper_value(datax.val, datax, datax.val),

            offset: wrapper_value(geom.pagePosition, geom, geom.pagePosition),

            style: wrapper_name_value(styler.css, styler),

            css: wrapper_name_value(styler.css, styler),

            index: function(elem) {
                if (elem) {
                    return this.indexOf($(elem)[0]);
                } else {
                    return this.parent().children().indexOf(this[0]);
                }
            },

            //hasClass(name)
            hasClass: wrapper_some_chk(styler.hasClass, styler),

            //addClass(name)
            addClass: wrapper_every_act_firstArgFunc(styler.addClass, styler, styler.className),

            //removeClass(name)
            removeClass: wrapper_every_act_firstArgFunc(styler.removeClass, styler, styler.className),

            //toogleClass(name,when)
            toggleClass: wrapper_every_act_firstArgFunc(styler.toggleClass, styler, styler.className),

            scrollTop: wrapper_value(geom.scrollTop, geom),

            scrollLeft: wrapper_value(geom.scrollLeft, geom),

            position: function() {
                if (!this.length) return

                var elem = this[0];

                return geom.relativePosition(elem);
            },

            offsetParent: wrapper_map(geom.offsetParent, geom)
        });

        // for now
        $.fn.detach = $.fn.remove;

        $.fn.hover = function(fnOver, fnOut) {
            return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
        };

        $.fn.size = wrapper_value(geom.size, geom);

        $.fn.width = wrapper_value(geom.width, geom, geom.width);

        $.fn.height = wrapper_value(geom.height, geom, geom.height);

        $.fn.clientSize = wrapper_value(geom.clientSize, geom.clientSize);

        ['width', 'height'].forEach(function(dimension) {
            var offset, Dimension = dimension.replace(/./, function(m) {
                return m[0].toUpperCase()
            });

            $.fn['outer' + Dimension] = function(margin, value) {
                if (arguments.length) {
                    if (typeof margin !== 'boolean') {
                        value = margin;
                        margin = false;
                    }
                } else {
                    margin = false;
                    value = undefined;
                }

                if (value === undefined) {
                    var el = this[0];
                    if (!el) {
                        return undefined;
                    }
                    var cb = geom.size(el);
                    if (margin) {
                        var me = geom.marginExtents(el);
                        cb.width = cb.width + me.left + me.right;
                        cb.height = cb.height + me.top + me.bottom;
                    }
                    return dimension === "width" ? cb.width : cb.height;
                } else {
                    return this.each(function(idx, el) {
                        var mb = {};
                        var me = geom.marginExtents(el);
                        if (dimension === "width") {
                            mb.width = value;
                            if (margin) {
                                mb.width = mb.width - me.left - me.right
                            }
                        } else {
                            mb.height = value;
                            if (margin) {
                                mb.height = mb.height - me.top - me.bottom;
                            }
                        }
                        geom.size(el, mb);
                    })

                }
            };
        })

        $.fn.innerWidth = wrapper_value(geom.clientWidth, geom, geom.clientWidth);

        $.fn.innerHeight = wrapper_value(geom.clientHeight, geom, geom.clientHeight);


        var traverseNode = noder.traverse;

        function wrapper_node_operation(func, context, oldValueFunc) {
            return function(html) {
                var argType, nodes = langx.map(arguments, function(arg) {
                    argType = type(arg)
                    return argType == "object" || argType == "array" || arg == null ?
                        arg : noder.createFragment(arg)
                });
                if (nodes.length < 1) {
                    return this
                }
                this.each(function(idx) {
                    func.apply(context, [this, nodes, idx > 0]);
                });
                return this;
            }
        }


        $.fn.after = wrapper_node_operation(noder.after, noder);

        $.fn.prepend = wrapper_node_operation(noder.prepend, noder);

        $.fn.before = wrapper_node_operation(noder.before, noder);

        $.fn.append = wrapper_node_operation(noder.append, noder);


        langx.each( {
            appendTo: "append",
            prependTo: "prepend",
            insertBefore: "before",
            insertAfter: "after",
            replaceAll: "replaceWith"
        }, function( name, original ) {
            $.fn[ name ] = function( selector ) {
                var elems,
                    ret = [],
                    insert = $( selector ),
                    last = insert.length - 1,
                    i = 0;

                for ( ; i <= last; i++ ) {
                    elems = i === last ? this : this.clone( true );
                    $( insert[ i ] )[ original ]( elems );

                    // Support: Android <=4.0 only, PhantomJS 1 only
                    // .get() because push.apply(_, arraylike) throws on ancient WebKit
                    push.apply( ret, elems.get() );
                }

                return this.pushStack( ret );
            };
        } );

/*
        $.fn.insertAfter = function(html) {
            $(html).after(this);
            return this;
        };

        $.fn.insertBefore = function(html) {
            $(html).before(this);
            return this;
        };

        $.fn.appendTo = function(html) {
            $(html).append(this);
            return this;
        };

        $.fn.prependTo = function(html) {
            $(html).prepend(this);
            return this;
        };

        $.fn.replaceAll = function(selector) {
            $(selector).replaceWith(this);
            return this;
        };
*/
        return $;
    })();

    (function($) {
        $.fn.on = wrapper_every_act(eventer.on, eventer);

        $.fn.off = wrapper_every_act(eventer.off, eventer);

        $.fn.trigger = wrapper_every_act(eventer.trigger, eventer);


        ('focusin focusout focus blur load resize scroll unload click dblclick ' +
            'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
            'change select keydown keypress keyup error').split(' ').forEach(function(event) {
            $.fn[event] = function(data, callback) {
                return (0 in arguments) ?
                    this.on(event, data, callback) :
                    this.trigger(event)
            }
        });


        $.fn.one = function(event, selector, data, callback) {
            if (!langx.isString(selector) && !langx.isFunction(callback)) {
                callback = data;
                data = selector;
                selector = null;
            }

            if (langx.isFunction(data)) {
                callback = data;
                data = null;
            }

            return this.on(event, selector, data, callback, 1)
        };

        $.fn.animate = wrapper_every_act(fx.animate, fx);

        $.fn.show = wrapper_every_act(fx.show, fx);
        $.fn.hide = wrapper_every_act(fx.hide, fx);
        $.fn.toogle = wrapper_every_act(fx.toogle, fx);
        $.fn.fadeTo = wrapper_every_act(fx.fadeTo, fx);
        $.fn.fadeIn = wrapper_every_act(fx.fadeIn, fx);
        $.fn.fadeOut = wrapper_every_act(fx.fadeOut, fx);
        $.fn.fadeToggle = wrapper_every_act(fx.fadeToggle, fx);

        $.fn.slideDown = wrapper_every_act(fx.slideDown, fx);
        $.fn.slideToggle = wrapper_every_act(fx.slideToggle, fx);
        $.fn.slideUp = wrapper_every_act(fx.slideUp, fx);
    })(query);


    (function($) {
        $.fn.end = function() {
            return this.prevObject || $()
        }

        $.fn.andSelf = function() {
            return this.add(this.prevObject || $())
        }

        $.fn.addBack = function(selector) {
            if (this.prevObject) {
                if (selector) {
                    return this.add(this.prevObject.filter(selector));
                } else {
                    return this.add(this.prevObject);
                }
            } else {
                return this;
            }
        }

        'filter,add,not,eq,first,last,find,closest,parents,parent,children,siblings'.split(',').forEach(function(property) {
            var fn = $.fn[property]
            $.fn[property] = function() {
                var ret = fn.apply(this, arguments)
                ret.prevObject = this
                return ret
            }
        })
    })(query);


    (function($) {
        $.fn.query = $.fn.find;

        $.fn.place = function(refNode, position) {
            // summary:
            //      places elements of this node list relative to the first element matched
            //      by queryOrNode. Returns the original NodeList. See: `dojo/dom-construct.place`
            // queryOrNode:
            //      may be a string representing any valid CSS3 selector or a DOM node.
            //      In the selector case, only the first matching element will be used
            //      for relative positioning.
            // position:
            //      can be one of:
            //
            //      -   "last" (default)
            //      -   "first"
            //      -   "before"
            //      -   "after"
            //      -   "only"
            //      -   "replace"
            //
            //      or an offset in the childNodes
            if (langx.isString(refNode)) {
                refNode = finder.descendant(refNode);
            } else if (isQ(refNode)) {
                refNode = refNode[0];
            }
            return this.each(function(i, node) {
                switch (position) {
                    case "before":
                        noder.before(refNode, node);
                        break;
                    case "after":
                        noder.after(refNode, node);
                        break;
                    case "replace":
                        noder.replace(refNode, node);
                        break;
                    case "only":
                        noder.empty(refNode);
                        noder.append(refNode, node);
                        break;
                    case "first":
                        noder.prepend(refNode, node);
                        break;
                        // else fallthrough...
                    default: // aka: last
                        noder.append(refNode, node);
                }
            });
        };

        $.fn.addContent = function(content, position) {
            if (content.template) {
                content = langx.substitute(content.template, content);
            }
            return this.append(content);
        };

        $.fn.replaceClass = function(newClass, oldClass) {
            this.removeClass(oldClass);
            this.addClass(newClass);
            return this;
        };

    })(query);


    return skylark.query = query;

});
define('skylark-utils/dnd',[
    "./skylark",
    "./langx",
    "./noder",
    "./datax",
    "./finder",
    "./geom",
    "./eventer",
    "./styler"
],function(skylark, langx,noder,datax,finder,geom,eventer,styler){
    var on = eventer.on,
        off = eventer.off,
        attr = datax.attr,
        removeAttr = datax.removeAttr,
        offset = geom.pagePosition,
        addClass = styler.addClass,
        height = geom.height;


    var DndManager = langx.Evented.inherit({
      klassName : "DndManager",

      init : function() {

      },

      prepare : function(draggable) {
          var e = eventer.create("preparing",{
             dragSource : draggable.dragSource,
             dragHandle : draggable.dragHandle
          });
          draggable.trigger(e);
          draggable.dragSource = e.dragSource;
      },

      start : function(draggable,event) {

        var p = geom.pagePosition(draggable.dragSource);
        this.draggingOffsetX = parseInt(event.pageX - p.left);
        this.draggingOffsetY = parseInt(event.pageY - p.top)

        var e = eventer.create("started",{
          elm : draggable.elm,
          dragSource : draggable.dragSource,
          dragHandle : draggable.dragHandle,
          ghost : null,

          transfer : {
          }
        });

        draggable.trigger(e);


        this.dragging = draggable;

        if (draggable.draggingClass) {
          styler.addClass(draggable.dragSource,draggable.draggingClass);
        }

        this.draggingGhost = e.ghost;
        if (!this.draggingGhost) {
          this.draggingGhost = draggable.elm;
        }

        this.draggingTransfer = e.transfer;
        if (this.draggingTransfer) {

            langx.each(this.draggingTransfer,function(key,value){
                event.dataTransfer.setData(key, value);
            });
        }
        
        event.dataTransfer.setDragImage(this.draggingGhost, this.draggingOffsetX, this.draggingOffsetY);

        event.dataTransfer.effectAllowed = "copyMove";

        var e1 = eventer.create("dndStarted",{
          elm : e.elm,
          dragSource : e.dragSource,
          dragHandle : e.dragHandle,
          ghost : e.ghost,
          transfer : e.transfer
        });

        this.trigger(e1);
      },

      over : function() {

      },

      end : function(dropped) {
        var dragging = this.dragging;
        if (dragging) {
          if (dragging.draggingClass) {
            styler.removeClass(dragging.dragSource,dragging.draggingClass);
          }
        }

        var e = eventer.create("dndEnded",{
        });        
        this.trigger(e);


        this.dragging = null;
        this.draggingTransfer = null;
        this.draggingGhost = null;
        this.draggingOffsetX = null;
        this.draggingOffsetY = null;
      }
    });

    var manager = new DndManager(),
        draggingHeight,
        placeholders = [];



    var Draggable = langx.Evented.inherit({
      klassName : "Draggable",

      init : function (elm,params) {
        var self = this;

        self.elm = elm;
        self.draggingClass = params.draggingClass || "dragging",
        self.params = langx.clone(params);

        ["preparing","started", "ended", "moving"].forEach(function(eventName) {
            if (langx.isFunction(params[eventName])) {
                self.on(eventName, params[eventName]);
            }
        });


        eventer.on(elm,{
          "mousedown" : function(e) {
            var params = self.params;
            if (params.handle) {
              self.dragHandle = finder.closest(e.target,params.handle);
              if (!self.dragHandle) {
                return;
              }
            }
            if (params.source) {
                self.dragSource = finder.closest(e.target,params.source);
            } else {
                self.dragSource = self.elm;
            }
            manager.prepare(self);
            if (self.dragSource) {
              datax.attr(self.dragSource, "draggable", 'true');
            } 
          },

          "mouseup" :   function(e) {
            if (self.dragSource) {
              //datax.attr(self.dragSource, "draggable", 'false');
              self.dragSource = null;
              self.dragHandle = null;
            }
          },

          "dragstart":  function(e) {
            datax.attr(self.dragSource, "draggable", 'false');
            manager.start(self, e);
          },

          "dragend":   function(e){
            eventer.stop(e);

            if (!manager.dragging) {
              return;
            }

            manager.end(false);
          }
        });

      }

    });


    var Droppable = langx.Evented.inherit({
      klassName : "Droppable",

      init : function(elm,params) {
        var self = this,
            draggingClass = params.draggingClass || "dragging",
            hoverClass,
            activeClass,
            acceptable = true;

        self.elm = elm;
        self._params = params;

        ["started","entered", "leaved", "dropped","overing"].forEach(function(eventName) {
            if (langx.isFunction(params[eventName])) {
                self.on(eventName, params[eventName]);
            }
        });

        eventer.on(elm,{
          "dragover" : function(e) {
            e.stopPropagation()

            if (!acceptable) {
              return
            }

            var e2 = eventer.create("overing",{
                overElm : e.target,
                transfer : manager.draggingTransfer,
                acceptable : true
            });
            self.trigger(e2);

            if (e2.acceptable) {
              e.preventDefault() // allow drop

              e.dataTransfer.dropEffect = "copyMove";
            }

          },

          "dragenter" :   function(e) {
            var params = self._params,
                elm = self.elm;

            var e2 = eventer.create("entered",{
                transfer : manager.draggingTransfer
            });

            self.trigger(e2);

            e.stopPropagation()

            if (hoverClass && acceptable) {
              styler.addClass(elm,hoverClass)
            }
          },

          "dragleave":  function(e) {
            var params = self._params,
                elm = self.elm;
            if (!acceptable) return false
            
            var e2 = eventer.create("leaved",{
                transfer : manager.draggingTransfer
            });
            
            self.trigger(e2);

            e.stopPropagation()

            if (hoverClass && acceptable) {
              styler.removeClass(elm,hoverClass);
            }
          },

          "drop":   function(e){
            var params = self._params,
                elm = self.elm;

            eventer.stop(e); // stops the browser from redirecting.

            if (!manager.dragging) return

           // manager.dragging.elm.removeClass('dragging');

            if (hoverClass && acceptable) {
              styler.addClass(elm,hoverClass)
            }

            var e2 = eventer.create("dropped",{
                transfer : manager.draggingTransfer
            });

            self.trigger(e2);

            manager.end(true)
          }
        });

        manager.on("dndStarted",function(e){
            var e2 = eventer.create("started",{
                transfer : manager.draggingTransfer,
                acceptable : false
            });

            self.trigger(e2);

            acceptable = e2.acceptable;
            hoverClass = e2.hoverClass;
            activeClass = e2.activeClass;

            if (activeClass && acceptable) {
              styler.addClass(elm,activeClass);
            }

         }).on("dndEnded" , function(e){
            var e2 = eventer.create("ended",{
                transfer : manager.draggingTransfer,
                acceptable : false
            });

            self.trigger(e2);

            if (hoverClass && acceptable) {
              styler.removeClass(elm,hoverClass);
            }
            if (activeClass && acceptable) {
              styler.removeClass(elm,activeClass);
            }

            acceptable = false;
            activeClass = null;
            hoverClass = null;
        });

      }
    });


    function draggable(elm, params) {
      return new Draggable(elm,params);
    }

    function droppable(elm, params) {
      return new Droppable(elm,params);
    }

    function dnd(){
      return dnd;
    }

    langx.mixin(dnd, {
       //params ： {
        //  target : Element or string or function
        //  handle : Element
        //  copy : boolean
        //  placeHolder : "div"
        //  hoverClass : "hover"
        //  start : function
        //  enter : function
        //  over : function
        //  leave : function
        //  drop : function
        //  end : function
        //
        //
        //}
        draggable   : draggable,

        //params ： {
        //  accept : string or function
        //  placeHolder
        //
        //
        //
        //}
        droppable : droppable,

        manager : manager


    });

    return skylark.dnd = dnd;
});

define('skylark-utils/filer',[
    "./skylark",
    "./langx",
    "./datax",
    "./eventer",
    "./styler"
], function(skylark, langx, datax, eventer,styler) {
    var concat = Array.prototype.concat,
        on = eventer.on,
        attr = eventer.attr,
        Deferred = langx.Deferred,

        fileInput,
        fileInputForm,
        fileSelected,
        maxFileSize = 1 / 0;


    var webentry = (function(){
        function  one(entry, path) {
            var d = new Deferred(),
                onError = function(e) {
                    d.reject(e);
                };

            path = path || '';
            if (entry.isFile) {
                entry.file(function (file) {
                    file.relativePath = path;
                    d.resolve(file);
                }, onError);
            } else if (entry.isDirectory) {
                var dirReader = entry.createReader();
                dirReader.readEntries(function (entries) {
                    all(
                        entries,
                        path + entry.name + '/'
                    ).then(function (files) {
                        d.resolve(files);
                    }).catch(onError);
                }, onError);
            } else {
                // Return an empy list for file system items
                // other than files or directories:
                d.resolve([]);
            }
            return d.promise;
        }

        function all(entries, path) {
            return Deferred.all(
                langx.map(entries, function (entry) {
                    return one(entry, path);
                })
            ).then(function(){
                return concat.apply([],arguments);
            });
        }

        return {
            one : one,
            all : all
        };
    })();

    function dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    }

    function dropzone(elm, params) {
        params = params || {};
        var hoverClass = params.hoverClass || "dropzone",
            droppedCallback = params.dropped;

        var enterdCount = 0;
        on(elm, "dragenter", function(e) {
            if (e.dataTransfer && e.dataTransfer.types.indexOf("Files")>-1) {
                eventer.stop(e);
                enterdCount ++;
                styler.addClass(elm,hoverClass)
            }
        });

        on(elm, "dragover", function(e) {
            if (e.dataTransfer && e.dataTransfer.types.indexOf("Files")>-1) {
                eventer.stop(e);
            }
        });

        on(elm, "dragleave", function(e) {
            if (e.dataTransfer && e.dataTransfer.types.indexOf("Files")>-1) {
                enterdCount--
                if (enterdCount==0) {
                    styler.removeClass(elm,hoverClass);
                }
            }
        });

        on(elm, "drop", function(e) {
            if (e.dataTransfer && e.dataTransfer.types.indexOf("Files")>-1) {
                styler.removeClass(elm,hoverClass)
                eventer.stop(e);
                if (droppedCallback) {
                    var items = e.dataTransfer.items;
                    if (items && items.length && (items[0].webkitGetAsEntry ||
                        items[0].getAsEntry)) {
                        webentry.all(
                            langx.map(items, function (item) {
                                if (item.webkitGetAsEntry) {
                                    return item.webkitGetAsEntry();
                                }
                                return item.getAsEntry();
                            })
                        ).then(droppedCallback);
                    } else {
                        droppedCallback(e.dataTransfer.files);
                    }                    
                }
            }
        });

        return this;
    }

    function pastezone(elm,params) {
        params = params || {};
        var hoverClass = params.hoverClass || "pastezone",
            pastedCallback = params.pasted;

        on(elm, "paste", function(e) {
            var items = e.originalEvent && e.originalEvent.clipboardData &&
                    e.originalEvent.clipboardData.items,
                files = [];
            if (items && items.length) {
                langx.each(items, function (index, item) {
                    var file = item.getAsFile && item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                });
            }
            if (pastedCallback && files.length) {
                pastedCallback(files);
            }
        });

        return this;
    }
   
    function picker(elm, params) {
        on(elm, "click", function(e) {
            e.preventDefault();
            select(params);
        });
        return this;
    }

    function select(params) {
        params = params || {};
        var directory = params.directory || false, 
            multiple = params.multiple || false,
            fileSelected = params.picked;
        if (!fileInput) {
            var input = fileInput = document.createElement("input");

            function selectFiles(pickedFiles) {
                for (var i = pickedFiles.length; i--;) {
                    if (pickedFiles[i].size > maxFileSize) {
                        pickedFiles.splice(i, 1);
                    }
                }
                fileSelected(pickedFiles);
            }

            input.type = "file";
            input.style.position = "fixed",
                input.style.left = 0,
                input.style.top = 0,
                input.style.opacity = .001,
                document.body.appendChild(input);

            input.onchange = function(e) {
                var entries = e.target.webkitEntries || e.target.entries;

                if (entries && entries.length) {
                    webentry.all(entries).then(function(files) {
                        selectFiles(files);
                    });
                } else {
                    selectFiles(Array.prototype.slice.call(e.target.files));
                }
                // reset to "", so selecting the same file next time still trigger the change handler
                input.value = "";
            };
        }
        fileInput.multiple = multiple;
        fileInput.webkitdirectory = directory;
        fileInput.click();
    }

    function upload(params) {
        var xoptions = langx.mixin({
            contentRange : null, //

            // The parameter name for the file form data (the request argument name).
            // If undefined or empty, the name property of the file input field is
            // used, or "files[]" if the file input name property is also empty,
            // can be a string or an array of strings:
            paramName: undefined,
            // By default, each file of a selection is uploaded using an individual
            // request for XHR type uploads. Set to false to upload file
            // selections in one request each:
            singleFileUploads: true,
            // To limit the number of files uploaded with one XHR request,
            // set the following option to an integer greater than 0:
            limitMultiFileUploads: undefined,
            // The following option limits the number of files uploaded with one
            // XHR request to keep the request size under or equal to the defined
            // limit in bytes:
            limitMultiFileUploadSize: undefined,
            // Multipart file uploads add a number of bytes to each uploaded file,
            // therefore the following option adds an overhead for each file used
            // in the limitMultiFileUploadSize configuration:
            limitMultiFileUploadSizeOverhead: 512,
            // Set the following option to true to issue all file upload requests
            // in a sequential order:
            sequentialUploads: false,
            // To limit the number of concurrent uploads,
            // set the following option to an integer greater than 0:
            limitConcurrentUploads: undefined,
            // By default, XHR file uploads are sent as multipart/form-data.
            // The iframe transport is always using multipart/form-data.
            // Set to false to enable non-multipart XHR uploads:
            multipart: true,
            // To upload large files in smaller chunks, set the following option
            // to a preferred maximum chunk size. If set to 0, null or undefined,
            // or the browser does not support the required Blob API, files will
            // be uploaded as a whole.
            maxChunkSize: undefined,
            // When a non-multipart upload or a chunked multipart upload has been
            // aborted, this option can be used to resume the upload by setting
            // it to the size of the already uploaded bytes. This option is most
            // useful when modifying the options object inside of the "add" or
            // "send" callbacks, as the options are cloned for each file upload.
            uploadedBytes: undefined,
            // By default, failed (abort or error) file uploads are removed from the
            // global progress calculation. Set the following option to false to
            // prevent recalculating the global progress data:
            recalculateProgress: true,
            // Interval in milliseconds to calculate and trigger progress events:
            progressInterval: 100,
            // Interval in milliseconds to calculate progress bitrate:
            bitrateInterval: 500,
            // By default, uploads are started automatically when adding files:
            autoUpload: true,

            // Error and info messages:
            messages: {
                uploadedBytes: 'Uploaded bytes exceed file size'
            },

            // Translation function, gets the message key to be translated
            // and an object with context specific data as arguments:
            i18n: function (message, context) {
                message = this.messages[message] || message.toString();
                if (context) {
                    langx.each(context, function (key, value) {
                        message = message.replace('{' + key + '}', value);
                    });
                }
                return message;
            },

            // Additional form data to be sent along with the file uploads can be set
            // using this option, which accepts an array of objects with name and
            // value properties, a function returning such an array, a FormData
            // object (for XHR file uploads), or a simple object.
            // The form of the first fileInput is given as parameter to the function:
            formData: function (form) {
                return form.serializeArray();
            },

            // The add callback is invoked as soon as files are added to the fileupload
            // widget (via file input selection, drag & drop, paste or add API call).
            // If the singleFileUploads option is enabled, this callback will be
            // called once for each file in the selection for XHR file uploads, else
            // once for each file selection.
            //
            // The upload starts when the submit method is invoked on the data parameter.
            // The data object contains a files property holding the added files
            // and allows you to override plugin options as well as define ajax settings.
            //
            // Listeners for this callback can also be bound the following way:
            // .bind('fileuploadadd', func);
            //
            // data.submit() returns a Promise object and allows to attach additional
            // handlers using jQuery's Deferred callbacks:
            // data.submit().done(func).fail(func).always(func);
            add: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                if (data.autoUpload || (data.autoUpload !== false &&
                        $(this).fileupload('option', 'autoUpload'))) {
                    data.process().done(function () {
                        data.submit();
                    });
                }
            },

            // Other callbacks:

            // Callback for the submit event of each file upload:
            // submit: function (e, data) {}, // .bind('fileuploadsubmit', func);

            // Callback for the start of each file upload request:
            // send: function (e, data) {}, // .bind('fileuploadsend', func);

            // Callback for successful uploads:
            // done: function (e, data) {}, // .bind('fileuploaddone', func);

            // Callback for failed (abort or error) uploads:
            // fail: function (e, data) {}, // .bind('fileuploadfail', func);

            // Callback for completed (success, abort or error) requests:
            // always: function (e, data) {}, // .bind('fileuploadalways', func);

            // Callback for upload progress events:
            // progress: function (e, data) {}, // .bind('fileuploadprogress', func);

            // Callback for global upload progress events:
            // progressall: function (e, data) {}, // .bind('fileuploadprogressall', func);

            // Callback for uploads start, equivalent to the global ajaxStart event:
            // start: function (e) {}, // .bind('fileuploadstart', func);

            // Callback for uploads stop, equivalent to the global ajaxStop event:
            // stop: function (e) {}, // .bind('fileuploadstop', func);

            // Callback for change events of the fileInput(s):
            // change: function (e, data) {}, // .bind('fileuploadchange', func);

            // Callback for paste events to the pasteZone(s):
            // paste: function (e, data) {}, // .bind('fileuploadpaste', func);

            // Callback for drop events of the dropZone(s):
            // drop: function (e, data) {}, // .bind('fileuploaddrop', func);

            // Callback for dragover events of the dropZone(s):
            // dragover: function (e) {}, // .bind('fileuploaddragover', func);

            // Callback for the start of each chunk upload request:
            // chunksend: function (e, data) {}, // .bind('fileuploadchunksend', func);

            // Callback for successful chunk uploads:
            // chunkdone: function (e, data) {}, // .bind('fileuploadchunkdone', func);

            // Callback for failed (abort or error) chunk uploads:
            // chunkfail: function (e, data) {}, // .bind('fileuploadchunkfail', func);

            // Callback for completed (success, abort or error) chunk upload requests:
            // chunkalways: function (e, data) {}, // .bind('fileuploadchunkalways', func);

            // The plugin options are used as settings object for the ajax calls.
            // The following are jQuery ajax settings required for the file uploads:
            processData: false,
            contentType: false,
            cache: false
        },params);

        var blobSlice = function () {
            var slice = Blob.prototype.slice || Blob.prototype.webkitSlice || Blob.prototype.mozSlice;
            return slice.apply(this, arguments);
        },ajax = function(data) {
            return langx.Xhr.request(data.url,data);
        };

        function initDataSettings(o) {
            o.type = o.type || "POST";

            if (!chunkedUpload(o, true)) {
                if (!o.data) {
                    initXHRData(o);
                }
                //initProgressListener(o);
            }
        }

        function initXHRData(o) {
            var that = this,
                formData,
                file = o.files[0],
                // Ignore non-multipart setting if not supported:
                multipart = o.multipart,
                paramName = langx.type(o.paramName) === 'array' ?
                    o.paramName[0] : o.paramName;

            o.headers = langx.mixin({}, o.headers);
            if (o.contentRange) {
                o.headers['Content-Range'] = o.contentRange;
            }
            if (!multipart) {
                o.headers['Content-Disposition'] = 'attachment; filename="' +
                    encodeURI(file.name) + '"';
                o.contentType = file.type || 'application/octet-stream';
                o.data = o.blob || file;
            } else {
                formData = new FormData();
                if (o.blob) {
                    formData.append(paramName, o.blob, file.name);
                } else {
                    langx.each(o.files, function (index, file) {
                        // This check allows the tests to run with
                        // dummy objects:
                        formData.append(
                            (langx.type(o.paramName) === 'array' &&
                                o.paramName[index]) || paramName,
                            file,
                            file.uploadName || file.name
                        );
                    });                    
                }                
                o.data = formData;
            }
            // Blob reference is not needed anymore, free memory:
            o.blob = null;
        }

        function getTotal(files) {
            var total = 0;
            langx.each(files, function (index, file) {
                total += file.size || 1;
            });
            return total;
        }

        function getUploadedBytes(jqXHR) {
            var range = jqXHR.getResponseHeader('Range'),
                parts = range && range.split('-'),
                upperBytesPos = parts && parts.length > 1 &&
                    parseInt(parts[1], 10);
            return upperBytesPos && upperBytesPos + 1;
        }

        function initProgressObject(obj) {
            var progress = {
                loaded: 0,
                total: 0,
                bitrate: 0
            };
            if (obj._progress) {
                langx.mixin(obj._progress, progress);
            } else {
                obj._progress = progress;
            }
        }

        function BitrateTimer() {
            this.timestamp = ((Date.now) ? Date.now() : (new Date()).getTime());
            this.loaded = 0;
            this.bitrate = 0;
            this.getBitrate = function (now, loaded, interval) {
                var timeDiff = now - this.timestamp;
                if (!this.bitrate || !interval || timeDiff > interval) {
                    this.bitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
                    this.loaded = loaded;
                    this.timestamp = now;
                }
                return this.bitrate;
            };
        }

        function chunkedUpload(options, testOnly) {
            options.uploadedBytes = options.uploadedBytes || 0;
            var that = this,
                file = options.files[0],
                fs = file.size,
                ub = options.uploadedBytes,
                mcs = options.maxChunkSize || fs,
                slice = blobSlice,
                dfd = new Deferred(),
                promise = dfd.promise,
                jqXHR,
                upload;
            if (!(slice && (ub || mcs < fs)) ||
                    options.data) {
                return false;
            }
            if (testOnly) {
                return true;
            }
            if (ub >= fs) {
                file.error = options.i18n('uploadedBytes');
                return this._getXHRPromise(
                    false,
                    options.context,
                    [null, 'error', file.error]
                );
            }
            // The chunk upload method:
            upload = function () {
                // Clone the options object for each chunk upload:
                var o = langx.mixin({}, options),
                    currentLoaded = o._progress.loaded;
                o.blob = slice.call(
                    file,
                    ub,
                    ub + mcs,
                    file.type
                );
                // Store the current chunk size, as the blob itself
                // will be dereferenced after data processing:
                o.chunkSize = o.blob.size;
                // Expose the chunk bytes position range:
                o.contentRange = 'bytes ' + ub + '-' +
                    (ub + o.chunkSize - 1) + '/' + fs;
                // Process the upload data (the blob and potential form data):
                initXHRData(o);
                // Add progress listeners for this chunk upload:
                //initProgressListener(o);
                jqXHR = $.ajax(o).done(function (result, textStatus, jqXHR) {
                        ub = getUploadedBytes(jqXHR) ||
                            (ub + o.chunkSize);
                        // Create a progress event if no final progress event
                        // with loaded equaling total has been triggered
                        // for this chunk:
                        if (currentLoaded + o.chunkSize - o._progress.loaded) {
                            dfd.progress({
                                lengthComputable: true,
                                loaded: ub - o.uploadedBytes,
                                total: ub - o.uploadedBytes
                            });
                        }
                        options.uploadedBytes = o.uploadedBytes = ub;
                        o.result = result;
                        o.textStatus = textStatus;
                        o.jqXHR = jqXHR;
                        //that._trigger('chunkdone', null, o);
                        //that._trigger('chunkalways', null, o);
                        if (ub < fs) {
                            // File upload not yet complete,
                            // continue with the next chunk:
                            upload();
                        } else {
                            dfd.resolveWith(
                                o.context,
                                [result, textStatus, jqXHR]
                            );
                        }
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        o.jqXHR = jqXHR;
                        o.textStatus = textStatus;
                        o.errorThrown = errorThrown;
                        //that._trigger('chunkfail', null, o);
                        //that._trigger('chunkalways', null, o);
                        dfd.rejectWith(
                            o.context,
                            [jqXHR, textStatus, errorThrown]
                        );
                    });
            };
            //this._enhancePromise(promise);
            promise.abort = function () {
                return jqXHR.abort();
            };
            upload();
            return promise;
        }
        
        initDataSettings(xoptions);

        xoptions._bitrateTimer = new BitrateTimer();

        var jqXhr = chunkedUpload(xoptions) || ajax(xoptions);

        jqXhr.options = xoptions;

        return jqXhr;
    }

    var filer = function() {
        return filer;
    };

    langx.mixin(filer , {
        dropzone: dropzone,

        pastezone: pastezone,

        picker: picker,

        select : select,

        upload  : upload,

        readFile : function(file,params) {
            params = params || {};
            var d = new Deferred,
                reader = new FileReader();
            
            reader.onload = function(evt) {
                d.resolve(evt.target.result);
            };
            reader.onerror = function(e) {
                var code = e.target.error.code;
                if (code === 2) {
                    alert('please don\'t open this page using protocol fill:///');
                } else {
                    alert('error code: ' + code);
                }
            };
            
            if (params.asArrayBuffer){
                reader.readAsArrayBuffer(file);
            } else if (params.asDataUrl) {
                reader.readAsDataURL(file);                
            } else if (params.asText) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }

            return d.promise;
        },
         
        writeFile : function(data,name) {
            if (window.navigator.msSaveBlob) { 
               if (langx.isString(data)) {
                   data = dataURItoBlob(data);
               }
               window.navigator.msSaveBlob(data, name);
            } else {
                var a = document.createElement('a');
                if (data instanceof Blob) {
                    data = langx.URL.createObjectURL(data);
                }
                a.href = data;
                a.setAttribute('download', name || 'noname');
                a.dispatchEvent(new CustomEvent('click'));
            }              
        }

    });

    return skylark.filer = filer;
});

define('skylark-utils/velm',[
    "./skylark",
    "./langx",
    "./datax",
    "./dnd",
    "./eventer",
    "./filer",
    "./finder",
    "./fx",
    "./geom",
    "./noder",
    "./styler"
], function(skylark, langx, datax, dnd, eventer, filer, finder, fx, geom, noder, styler) {
    var map = Array.prototype.map,
        slice = Array.prototype.slice;

    var VisualElement = langx.klass({
        klassName: "VisualElement",

        "init": function(node) {
            if (langx.isString(node)) {
                node = document.getElementById(node);
            }
            this.domNode = node;
        }
    });

    var root = new VisualElement(document.body),
        velm = function(node) {
            if (node) {
                return new VisualElement(node);
            } else {
                return root;
            }
        };

    function _delegator(fn, context) {
        return function() {
            var self = this,
                elem = self.domNode,
                ret = fn.apply(context, [elem].concat(slice.call(arguments)));

            if (ret) {
                if (ret === context) {
                    return self;
                } else {
                    if (ret instanceof HTMLElement) {
                        ret = new VisualElement(ret);
                    } else if (langx.isArrayLike(ret)) {
                        ret = map.call(ret, function(el) {
                            if (el instanceof HTMLElement) {
                                return new VisualElement(ret);
                            } else {
                                return el;
                            }
                        })
                    }
                }
            }
            return ret;
        };
    }

    langx.mixin(velm, {
        batch: function(nodes, action, args) {
            nodes.forEach(function(node) {
                var elm = (node instanceof VisualElement) ? node : velm(node);
                elm[action].apply(elm, args);
            });

            return this;
        },

        root: new VisualElement(document.body),

        VisualElement: VisualElement,

        partial : function(name,fn) {
            var props = {};

            props[name] = fn;

            VisualElement.partial(props);
        },

        delegate: function(names, context) {
            var props = {};

            names.forEach(function(name) {
                props[name] = _delegator(context[name], context);
            });

            VisualElement.partial(props);
        }
    });

    // from ./datax
    velm.delegate([
        "attr",
        "data",
        "prop",
        "removeAttr",
        "removeData",
        "text",
        "val"
    ], datax);

    // from ./dnd
    velm.delegate([
        "draggable",
        "droppable"
    ], dnd);


    // from ./eventer
    velm.delegate([
        "off",
        "on",
        "one",
        "shortcuts",
        "trigger"
    ], eventer);

    // from ./filer
    velm.delegate([
        "picker",
        "dropzone"
    ], filer);

    // from ./finder
    velm.delegate([
        "ancestor",
        "ancestors",
        "children",
        "descendant",
        "find",
        "findAll",
        "firstChild",
        "lastChild",
        "matches",
        "nextSibling",
        "nextSiblings",
        "parent",
        "previousSibling",
        "previousSiblings",
        "siblings"
    ], finder);

    velm.find = function(selector) {
        if (selector === "body") {
            return this.root;
        } else {
            return this.root.descendant(selector);
        }
    };

    // from ./fx
    velm.delegate([
        "animate",
        "fadeIn",
        "fadeOut",
        "fadeTo",
        "fadeToggle",
        "hide",
        "scrollToTop",
        "show",
        "toggle"
    ], fx);


    // from ./geom
    velm.delegate([
        "borderExtents",
        "boundingPosition",
        "boundingRect",
        "clientHeight",
        "clientSize",
        "clientWidth",
        "contentRect",
        "height",
        "marginExtents",
        "offsetParent",
        "paddingExtents",
        "pagePosition",
        "pageRect",
        "relativePosition",
        "relativeRect",
        "scrollIntoView",
        "scrollLeft",
        "scrollTop",
        "size",
        "width"
    ], geom);

    // from ./mover
    velm.delegate([
        "draggable",
        "droppable"
    ], dnd);


    // from ./noder
    velm.delegate([
        "after",
        "append",
        "before",
        "clone",
        "contains",
        "contents",
        "empty",
        "html",
        "isChildOf",
        "ownerDoc",
        "prepend",
        "remove",
        "replace",
        "reverse",
        "throb",
        "traverse",
        "wrapper",
        "wrapperInner",
        "unwrap"
    ], noder);

    // from ./styler
    velm.delegate([
        "addClass",
        "className",
        "css",
        "hasClass",
        "hide",
        "isInvisible",
        "removeClass",
        "show",
        "toggleClass"
    ], styler);
    
    return skylark.velm = velm;
});

define('skylark-utils/widgets',[
    "./skylark",
    "./langx",
    "./noder",
    "./datax",
    "./styler",
    "./geom",
    "./eventer",
    "./query",
    "./velm"
], function(skylark,langx,noder, datax, styler, geom, eventer,query,velm) {
	// Cached regex to split keys for `delegate`.
	var delegateEventSplitter = /^(\S+)\s*(.*)$/,
		slice = Array.prototype.slice;


	function bridge( name, object ) {
		var fullName = object.prototype.widgetFullName || name,
			fn = {};

		function _delegate (isQuery) {

		}

		fn[name] = function( options ) {
			var isMethodCall = typeof options === "string";
			var args = slice.call( arguments, 1 );
			var returnValue = this;

			if ( isMethodCall ) {

				// If this is an empty collection, we need to have the instance method
				// return undefined instead of the jQuery instance
				if ( !this.length && options === "instance" ) {
					returnValue = undefined;
				} else {
					this.each( function() {
						var methodValue;
						var instance = datax.data( this, fullName );

						if ( options === "instance" ) {
							returnValue = instance;
							return false;
						}

						if ( !instance ) {
							return $.error( "cannot call methods on " + name +
								" prior to initialization; " +
								"attempted to call method '" + options + "'" );
						}

						if ( !$.isFunction( instance[ options ] ) || options.charAt( 0 ) === "_" ) {
							return $.error( "no such method '" + options + "' for " + name +
								" widget instance" );
						}

						methodValue = instance[ options ].apply( instance, args );

						if ( methodValue !== instance && methodValue !== undefined ) {
							returnValue = methodValue && methodValue.jquery ?
								returnValue.pushStack( methodValue.get() ) :
								methodValue;
							return false;
						}
					} );
				}
			} else {

				// Allow multiple hashes to be passed on init
				if ( args.length ) {
					options = $.widget.extend.apply( null, [ options ].concat( args ) );
				}

				this.each( function() {
					var instance = datax.data( this, fullName );
					if ( instance ) {
						instance.option( options || {} );
						if ( instance._init ) {
							instance._init();
						}
					} else {
						datax.data( this, fullName, new object( options, this ) );
					}
				} );
			}

			return returnValue;
		};
	};

	function widgets() {
	    return widgets;
	}

	var Widget = langx.Evented.inherit({
	    init :function(options,el) {
	    	//for supporting init(el,options)
	        if (langx.isHtmlNode(options)) {
	        	var _t = el,
	        		options = el;
	            el = options;
	        }
	        if (langx.isHtmlNode(el)) { 
	        	this.el = el;
	    	} else {
	    		this.el = null;
	    	}
	        if (options) {
	            langx.mixin(this,options);
	        }
	        if (!this.cid) {
	            this.cid = langx.uniqueId('w');
	        }
	        this._ensureElement();
	    },

	    // The default `tagName` of a View's element is `"div"`.
	    tagName: 'div',

	    // jQuery delegate for element lookup, scoped to DOM elements within the
	    // current view. This should be preferred to global lookups where possible.
	    $: function(selector) {
	      return this.$el.find(selector);
	    },

	    // **render** is the core function that your view should override, in order
	    // to populate its element (`this.el`), with the appropriate HTML. The
	    // convention is for **render** to always return `this`.
	    render: function() {
	      return this;
	    },

	    // Remove this view by taking the element out of the DOM, and removing any
	    // applicable Backbone.Events listeners.
	    remove: function() {
	      this._removeElement();
	      this.unlistenTo();
	      return this;
	    },

	    // Remove this view's element from the document and all event listeners
	    // attached to it. Exposed for subclasses using an alternative DOM
	    // manipulation API.
	    _removeElement: function() {
	      this.$el.remove();
	    },

	    // Change the view's element (`this.el` property) and re-delegate the
	    // view's events on the new element.
	    setElement: function(element) {
	      this.undelegateEvents();
	      this._setElement(element);
	      this.delegateEvents();
	      return this;
	    },

	    // Creates the `this.el` and `this.$el` references for this view using the
	    // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
	    // context or an element. Subclasses can override this to utilize an
	    // alternative DOM manipulation API and are only required to set the
	    // `this.el` property.
	    _setElement: function(el) {
	      this.$el = widgets.$(el);
	      this.el = this.$el[0];
	    },

	    // Set callbacks, where `this.events` is a hash of
	    //
	    // *{"event selector": "callback"}*
	    //
	    //     {
	    //       'mousedown .title':  'edit',
	    //       'click .button':     'save',
	    //       'click .open':       function(e) { ... }
	    //     }
	    //
	    // pairs. Callbacks will be bound to the view, with `this` set properly.
	    // Uses event delegation for efficiency.
	    // Omitting the selector binds the event to `this.el`.
	    delegateEvents: function(events) {
	      events || (events = langx.result(this, 'events'));
	      if (!events) return this;
	      this.undelegateEvents();
	      for (var key in events) {
	        var method = events[key];
	        if (!langx.isFunction(method)) method = this[method];
	        if (!method) continue;
	        var match = key.match(delegateEventSplitter);
	        this.delegate(match[1], match[2], langx.proxy(method, this));
	      }
	      return this;
	    },

	    // Add a single event listener to the view's element (or a child element
	    // using `selector`). This only works for delegate-able events: not `focus`,
	    // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
	    delegate: function(eventName, selector, listener) {
	      this.$el.on(eventName + '.delegateEvents' + this.uid, selector, listener);
	      return this;
	    },

	    // Clears all callbacks previously bound to the view by `delegateEvents`.
	    // You usually don't need to use this, but may wish to if you have multiple
	    // Backbone views attached to the same DOM element.
	    undelegateEvents: function() {
	      if (this.$el) this.$el.off('.delegateEvents' + this.uid);
	      return this;
	    },

	    // A finer-grained `undelegateEvents` for removing a single delegated event.
	    // `selector` and `listener` are both optional.
	    undelegate: function(eventName, selector, listener) {
	      this.$el.off(eventName + '.delegateEvents' + this.uid, selector, listener);
	      return this;
	    },

	    // Produces a DOM element to be assigned to your view. Exposed for
	    // subclasses using an alternative DOM manipulation API.
	    _createElement: function(tagName,attrs) {
	      return noder.createElement(tagName,attrs);
	    },

	    // Ensure that the View has a DOM element to render into.
	    // If `this.el` is a string, pass it through `$()`, take the first
	    // matching element, and re-assign it to `el`. Otherwise, create
	    // an element from the `id`, `className` and `tagName` properties.
	    _ensureElement: function() {
	      if (!this.el) {
	        var attrs = langx.mixin({}, langx.result(this, 'attributes'));
	        if (this.id) attrs.id = langx.result(this, 'id');
	        if (this.className) attrs['class'] = langx.result(this, 'className');
	        this.setElement(this._createElement(langx.result(this, 'tagName'),attrs));
	        this._setAttributes(attrs);
	      } else {
	        this.setElement(langx.result(this, 'el'));
	      }
	    },

	    // Set attributes from a hash on this view's element.  Exposed for
	    // subclasses using an alternative DOM manipulation API.
	    _setAttributes: function(attributes) {
	      this.$el.attr(attributes);
	    },

	    // Translation function, gets the message key to be translated
	    // and an object with context specific data as arguments:
	    i18n: function (message, context) {
	        message = (this.messages && this.messages[message]) || message.toString();
	        if (context) {
	            langx.each(context, function (key, value) {
	                message = message.replace('{' + key + '}', value);
	            });
	        }
	        return message;
	    },

		});

	function defineWidgetClass(name,base,prototype) {

	};

	langx.mixin(widgets, {
		$ : query,

		define : defineWidgetClass,
		Widget : Widget
	});


	return skylark.widgets = widgets;
});

define('skylark-swt/sbswt',[
  "skylark-utils/skylark",
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/query",
  "skylark-utils/widgets"
],function(skylark,langx,browser,eventer,noder,geom,$,widgets){
	var ui = skylark.ui = skylark.ui || {}, 
		sbswt = ui.sbswt = {};

/*---------------------------------------------------------------------------------*/
	/*
	 * Fuel UX utilities.js
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */
	var CONST = {
		BACKSPACE_KEYCODE: 8,
		COMMA_KEYCODE: 188, // `,` & `<`
		DELETE_KEYCODE: 46,
		DOWN_ARROW_KEYCODE: 40,
		ENTER_KEYCODE: 13,
		TAB_KEYCODE: 9,
		UP_ARROW_KEYCODE: 38
	};

	var isShiftHeld = function isShiftHeld (e) { return e.shiftKey === true; };

	var isKey = function isKey (keyCode) {
		return function compareKeycodes (e) {
			return e.keyCode === keyCode;
		};
	};

	var isBackspaceKey = isKey(CONST.BACKSPACE_KEYCODE);
	var isDeleteKey = isKey(CONST.DELETE_KEYCODE);
	var isTabKey = isKey(CONST.TAB_KEYCODE);
	var isUpArrow = isKey(CONST.UP_ARROW_KEYCODE);
	var isDownArrow = isKey(CONST.DOWN_ARROW_KEYCODE);

	var ENCODED_REGEX = /&[^\s]*;/;
	/*
	 * to prevent double encoding decodes content in loop until content is encoding free
	 */
	var cleanInput = function cleanInput (questionableMarkup) {
		// check for encoding and decode
		while (ENCODED_REGEX.test(questionableMarkup)) {
			questionableMarkup = $('<i>').html(questionableMarkup).text();
		}

		// string completely decoded now encode it
		return $('<i>').text(questionableMarkup).html();
	};




	langx.mixin(sbswt, {
		CONST: CONST,
		cleanInput: cleanInput,
		isBackspaceKey: isBackspaceKey,
		isDeleteKey: isDeleteKey,
		isShiftHeld: isShiftHeld,
		isTabKey: isTabKey,
		isUpArrow: isUpArrow,
		isDownArrow: isDownArrow
	});

/*---------------------------------------------------------------------------------*/

	var WidgetBase = widgets.Widget.inherit({
        klassName: "WidgetBase",
    });


	langx.mixin(sbswt, {
		WidgetBase : WidgetBase
	});

	return sbswt;
});

define('skylark-swt/affix',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


/* ========================================================================
 * Bootstrap: affix.js v3.3.7
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // AFFIX CLASS DEFINITION
  // ======================

  var Affix = sbswt.Affix = sbswt.WidgetBase.inherit({
        klassName: "Affix",

        init : function(element,options) {
          this.options = langx.mixin({}, Affix.DEFAULTS, options)

          this.$target = $(this.options.target)
            .on('scroll.bs.affix.data-api', langx.proxy(this.checkPosition, this))
            .on('click.bs.affix.data-api',  langx.proxy(this.checkPositionWithEventLoop, this))

          this.$element     = $(element)
          this.affixed      = null;
          this.unpin        = null;
          this.pinnedOffset = null;

          this.checkPosition();
        },

        getState : function (scrollHeight, height, offsetTop, offsetBottom) {
          var scrollTop    = this.$target.scrollTop()
          var position     = this.$element.offset()
          var targetHeight = this.$target.height()

          if (offsetTop != null && this.affixed == 'top') return scrollTop < offsetTop ? 'top' : false

          if (this.affixed == 'bottom') {
            if (offsetTop != null) return (scrollTop + this.unpin <= position.top) ? false : 'bottom'
            return (scrollTop + targetHeight <= scrollHeight - offsetBottom) ? false : 'bottom'
          }

          var initializing   = this.affixed == null
          var colliderTop    = initializing ? scrollTop : position.top
          var colliderHeight = initializing ? targetHeight : height

          if (offsetTop != null && scrollTop <= offsetTop) return 'top'
          if (offsetBottom != null && (colliderTop + colliderHeight >= scrollHeight - offsetBottom)) return 'bottom'

          return false
        },

        getPinnedOffset : function () {
          if (this.pinnedOffset) return this.pinnedOffset
          this.$element.removeClass(Affix.RESET).addClass('affix')
          var scrollTop = this.$target.scrollTop()
          var position  = this.$element.offset()
          return (this.pinnedOffset = position.top - scrollTop)
        },

        checkPositionWithEventLoop : function () {
          setTimeout(langx.proxy(this.checkPosition, this), 1)
        },

        checkPosition : function () {
          if (!this.$element.is(':visible')) return

          var height       = this.$element.height()
          var offset       = this.options.offset
          var offsetTop    = offset.top
          var offsetBottom = offset.bottom
          var scrollHeight = Math.max($(document).height(), $(document.body).height())

          if (typeof offset != 'object')         offsetBottom = offsetTop = offset
          if (typeof offsetTop == 'function')    offsetTop    = offset.top(this.$element)
          if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element)

          var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom)

          if (this.affixed != affix) {
            if (this.unpin != null) this.$element.css('top', '')

            var affixType = 'affix' + (affix ? '-' + affix : '')
            var e         = eventer.create(affixType + '.bs.affix')

            this.$element.trigger(e)

            if (e.isDefaultPrevented()) return

            this.affixed = affix
            this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

            this.$element
              .removeClass(Affix.RESET)
              .addClass(affixType)
              .trigger(affixType.replace('affix', 'affixed') + '.bs.affix')
          }

          if (affix == 'bottom') {
            this.$element.offset({
              top: scrollHeight - height - offsetBottom
            })
          }
        }
  });


  Affix.VERSION  = '3.3.7'

  Affix.RESET    = 'affix affix-top affix-bottom'

  Affix.DEFAULTS = {
    offset: 0,
    target: window
  }



  // AFFIX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.affix')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.affix

  $.fn.affix             = Plugin;
  $.fn.affix.Constructor = Affix;


  // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old
    return this
  }


  // AFFIX DATA-API
  // ==============
  /*
  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this)
      var data = $spy.data()

      data.offset = data.offset || {}

      if (data.offsetBottom != null) data.offset.bottom = data.offsetBottom
      if (data.offsetTop    != null) data.offset.top    = data.offsetTop

      Plugin.call($spy, data)
    })
  })
  */

  return $.fn.affix;
});

define('skylark-swt/alert',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: alert.js v3.3.7
 * http://getbootstrap.com/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]';

  var Alert = sbswt.Alert = sbswt.WidgetBase.inherit({
    klassName: "Alert",

    init : function(el,options) {
      $(el).on('click', dismiss, this.close)
    },

    close : function (e) {
      var $this    = $(this);
      var selector = $this.attr('data-target');

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); // strip for ie7
      }

      var $parent = $(selector === '#' ? [] : selector);

      if (e) e.preventDefault()

      if (!$parent.length) {
        $parent = $this.closest('.alert');
      }

      $parent.trigger(e = eventer.create('close.bs.alert'));

      if (e.isDefaultPrevented()) {
        return
      }
        
      $parent.removeClass('in');

      function removeElement() {
        // detach from parent, fire event then clean up data
        $parent.detach().trigger('closed.bs.alert').remove()
      }

      if (browser.support.transition) {
        if ($parent.hasClass('fade') ) {
          $parent.one('bsTransitionEnd', removeElement)
          .emulateTransitionEnd(Alert.TRANSITION_DURATION);
        } else {
          removeElement();
        }

      } 
    }
  });


  Alert.VERSION = '3.3.7';

  Alert.TRANSITION_DURATION = 150;



  // ALERT PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var wgt  = $this.data('bs.alert')

      if (!wgt) {
        $this.data('bs.alert', (wgt = new Alert(this)));
      }
      if (typeof option == 'string') {
        wgt[option].call($this);
      }
    })
  }

  var old = $.fn.alert;

  $.fn.alert             = Plugin;
  $.fn.alert.Constructor = Alert;


  // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
    $.fn.alert = old;
    return this;
  }


  // ALERT DATA-API
  // ==============

  /*
  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)
  */

  return $.fn.alert;
});

define('skylark-swt/button',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: button.js v3.3.7
 * http://getbootstrap.com/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // BUTTON PUBLIC CLASS DEFINITION
  // ==============================

  var Button = sbswt.Button = sbswt.WidgetBase.inherit({
    klassName: "Button",

    init : function(element,options) {
      var $el = this.$element  = $(element)
      this.options   = langx.mixin({}, Button.DEFAULTS, options)
      this.isLoading = false

      if ($el.closest('[data-toggle^="button"]')) {
        $el.on("click.bs.button.data-api",langx.proxy(function(e){
          this.toggle()

          if (!($(e.target).is('input[type="radio"], input[type="checkbox"]'))) {
            // Prevent double click on radios, and the double selections (so cancellation) on checkboxes
            e.preventDefault()
            // The target component still receive the focus
            var $btn = this.$element; 
            if ($btn.is('input,button')) {
              $btn.trigger('focus');
            } else {
              $btn.find('input:visible,button:visible').first().trigger('focus');
            }
          }
        },this));
      }
    },

    setState : function (state) {
      var d    = 'disabled'
      var $el  = this.$element
      var val  = $el.is('input') ? 'val' : 'html'
      var data = $el.data()

      state += 'Text'

      if (data.resetText == null) $el.data('resetText', $el[val]())

      // push to event loop to allow forms to submit
      setTimeout(langx.proxy(function () {
        $el[val](data[state] == null ? this.options[state] : data[state])

        if (state == 'loadingText') {
          this.isLoading = true
          $el.addClass(d).attr(d, d).prop(d, true)
        } else if (this.isLoading) {
          this.isLoading = false
          $el.removeClass(d).removeAttr(d).prop(d, false)
        }
      }, this), 0)
    },

    toggle : function () {
      var changed = true
      var $parent = this.$element.closest('[data-toggle="buttons"]')

      if ($parent.length) {
        var $input = this.$element.find('input')
        if ($input.prop('type') == 'radio') {
          if ($input.prop('checked')) changed = false
          $parent.find('.active').removeClass('active')
          this.$element.addClass('active')
        } else if ($input.prop('type') == 'checkbox') {
          if (($input.prop('checked')) !== this.$element.hasClass('active')) changed = false
          this.$element.toggleClass('active')
        }
        $input.prop('checked', this.$element.hasClass('active'))
        if (changed) $input.trigger('change')
      } else {
        this.$element.attr('aria-pressed', !this.$element.hasClass('active'))
        this.$element.toggleClass('active')
      }
    }

  });  

  Button.VERSION  = '3.3.7'

  Button.DEFAULTS = {
    loadingText: 'loading...'
  }



  // BUTTON PLUGIN DEFINITION
  // ========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var wgt    = $this.data('bs.button')
      var options = typeof option == 'object' && option

      if (!wgt) {
        $this.data('bs.button', (wgt = new Button(this, options)));
      }

      if (option == 'toggle') {
        wgt.toggle();
      } else if (option) {
        wgt.setState(option);
      }
    });
  }

  var old = $.fn.button;

  $.fn.button             = Plugin;
  $.fn.button.Constructor = Button;


  // BUTTON NO CONFLICT
  // ==================

  $.fn.button.noConflict = function () {
    $.fn.button = old;
    return this;
  }


  // BUTTON DATA-API
  // ===============
  /*  
  $(document)
    .on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
      var $btn = $(e.target).closest('.btn')
      Plugin.call($btn, 'toggle')
      if (!($(e.target).is('input[type="radio"], input[type="checkbox"]'))) {
        // Prevent double click on radios, and the double selections (so cancellation) on checkboxes
        e.preventDefault()
        // The target component still receive the focus
        if ($btn.is('input,button')) $btn.trigger('focus')
        else $btn.find('input:visible,button:visible').first().trigger('focus')
      }
    })
    .on('focus.bs.button.data-api blur.bs.button.data-api', '[data-toggle^="button"]', function (e) {
      $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type))
    })
  */

  return $.fn.button;
});

define('skylark-swt/carousel',[
    "skylark-utils/langx",
    "skylark-utils/browser",
    "skylark-utils/eventer",
    "skylark-utils/noder",
    "skylark-utils/geom",
    "skylark-utils/velm",
    "skylark-utils/query",
    "./sbswt"
], function(langx, browser, eventer, noder, geom, velm, $, sbswt) {

    /* ========================================================================
     * Bootstrap: carousel.js v3.3.7
     * http://getbootstrap.com/javascript/#carousel
     * ========================================================================
     * Copyright 2011-2016 Twitter, Inc.
     * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
     * ======================================================================== */

    'use strict';

    // CAROUSEL CLASS DEFINITION
    // =========================

    var Carousel = sbswt.Carousel = sbswt.WidgetBase.inherit({
        klassName: "Carousel",

        init: function(element, options) {
            this.$element = $(element)
            this.$indicators = this.$element.find('.carousel-indicators')
            this.options = options
            this.paused = null
            this.sliding = null
            this.interval = null
            this.$active = null
            this.$items = null

            this.options.keyboard && this.$element.on('keydown.bs.carousel', langx.proxy(this.keydown, this))

            this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
                .on('mouseenter.bs.carousel', langx.proxy(this.pause, this))
                .on('mouseleave.bs.carousel', langx.proxy(this.cycle, this));

            this.$element.on("click.bs.carousel.data-api", "[data-slide],[data-slide-to]", function(e) {
                var href
                var $this = $(this)
                var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
                if (!$target.hasClass('carousel')) return
                var options = langx.mixin({}, $target.data(), $this.data());
                var slideIndex = $this.attr('data-slide-to')
                if (slideIndex) options.interval = false

                Plugin.call($target, options);

                if (slideIndex) {
                    $target.data('bs.carousel').to(slideIndex);
                }

                e.preventDefault();

            });
        }
    });

    // var Carousel = function (element, options) {
    // }

    Carousel.VERSION = '3.3.7'

    Carousel.TRANSITION_DURATION = 600

    Carousel.DEFAULTS = {
        interval: 5000,
        pause: 'hover',
        wrap: true,
        keyboard: true
    }

    Carousel.prototype.keydown = function(e) {
        if (/input|textarea/i.test(e.target.tagName)) return
        switch (e.which) {
            case 37:
                this.prev();
                break
            case 39:
                this.next();
                break
            default:
                return
        }

        e.preventDefault()
    }

    Carousel.prototype.cycle = function(e) {
        e || (this.paused = false)

        this.interval && clearInterval(this.interval)

        this.options.interval &&
            !this.paused &&
            (this.interval = setInterval(langx.proxy(this.next, this), this.options.interval))

        return this
    }

    Carousel.prototype.getItemIndex = function(item) {
        this.$items = item.parent().children('.item')
        return this.$items.index(item || this.$active)
    }

    Carousel.prototype.getItemForDirection = function(direction, active) {
        var activeIndex = this.getItemIndex(active)
        var willWrap = (direction == 'prev' && activeIndex === 0) ||
            (direction == 'next' && activeIndex == (this.$items.length - 1))
        if (willWrap && !this.options.wrap) return active
        var delta = direction == 'prev' ? -1 : 1
        var itemIndex = (activeIndex + delta) % this.$items.length
        return this.$items.eq(itemIndex)
    }

    Carousel.prototype.to = function(pos) {
        var that = this
        var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

        if (pos > (this.$items.length - 1) || pos < 0) return

        if (this.sliding) return this.$element.one('slid.bs.carousel', function() { that.to(pos) }) // yes, "slid"
        if (activeIndex == pos) return this.pause().cycle()

        return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos))
    }

    Carousel.prototype.pause = function(e) {
        e || (this.paused = true)

        if (this.$element.find('.next, .prev').length && browser.support.transition) {
            this.$element.trigger(browser.support.transition.end)
            this.cycle(true)
        }

        this.interval = clearInterval(this.interval)

        return this
    }

    Carousel.prototype.next = function() {
        if (this.sliding) return
        return this.slide('next')
    }

    Carousel.prototype.prev = function() {
        if (this.sliding) return
        return this.slide('prev')
    }

    Carousel.prototype.slide = function(type, next) {
        var $active = this.$element.find('.item.active')
        var $next = next || this.getItemForDirection(type, $active)
        var isCycling = this.interval
        var direction = type == 'next' ? 'left' : 'right'
        var that = this

        if ($next.hasClass('active')) return (this.sliding = false)

        var relatedTarget = $next[0]
        var slideEvent = eventer.create('slide.bs.carousel', {
            relatedTarget: relatedTarget,
            direction: direction
        })
        this.$element.trigger(slideEvent)
        if (slideEvent.isDefaultPrevented()) return

        this.sliding = true

        isCycling && this.pause()

        if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active')
            var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
            $nextIndicator && $nextIndicator.addClass('active')
        }

        var slidEvent = eventer.create('slid.bs.carousel', { relatedTarget: relatedTarget, direction: direction }) // yes, "slid"
        if (browser.support.transition && this.$element.hasClass('slide')) {
            $next.addClass(type)
            $next[0].offsetWidth // force reflow
            $active.addClass(direction)
            $next.addClass(direction)
            $active
                .one('bsTransitionEnd', function() {
                    $next.removeClass([type, direction].join(' ')).addClass('active')
                    $active.removeClass(['active', direction].join(' '))
                    that.sliding = false
                    setTimeout(function() {
                        that.$element.trigger(slidEvent)
                    }, 0)
                })
                .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
        } else {
            $active.removeClass('active')
            $next.addClass('active')
            this.sliding = false
            this.$element.trigger(slidEvent)
        }

        isCycling && this.cycle()

        return this
    }


    // CAROUSEL PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function() {
            var $this = $(this)
            var wgt = $this.data('bs.carousel')
            var options = langx.mixin({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
            var action = typeof option == 'string' ? option : options.slide

            if (!wgt) {
                $this.data('bs.carousel', (wgt = new Carousel(this, options)));
            }
            if (typeof option == 'number') {
                wgt.to(option);
            } else if (action) {
                wgt[action]()
            } else if (options.interval) {
                wgt.pause().cycle();
            }
        })
    }

    var old = $.fn.carousel

    $.fn.carousel = Plugin
    $.fn.carousel.Constructor = Carousel


    // CAROUSEL NO CONFLICT
    // ====================

    $.fn.carousel.noConflict = function() {
        $.fn.carousel = old
        return this
    }


    // CAROUSEL DATA-API
    // =================
    /*
    var clickHandler = function (e) {
      var href
      var $this   = $(this)
      var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
      if (!$target.hasClass('carousel')) return
      var options = langx.mixin({}, $target.data(), $this.data())
      var slideIndex = $this.attr('data-slide-to')
      if (slideIndex) options.interval = false

      Plugin.call($target, options)

      if (slideIndex) {
        $target.data('bs.carousel').to(slideIndex)
      }

      e.preventDefault()
    }

    $(document)
      .on('click.bs.carousel.data-api', '[data-slide]', clickHandler)
      .on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler)

    $(window).on('load', function () {
      $('[data-ride="carousel"]').each(function () {
        var $carousel = $(this)
        Plugin.call($carousel, $carousel.data())
      })
    })
    */

    return $.fn.carousel;

});
define('skylark-swt/checkbox',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.checkbox;

	// CHECKBOX CONSTRUCTOR AND PROTOTYPE

	var logError = function logError (error) {
		if (window && window.console && window.console.error) {
			window.console.error(error);
		}
	};


	var Checkbox = sbswt.Checkbox = sbswt.WidgetBase.inherit({
		klassName: "Checkbox",

		init : function(element,options) {
			this.options = langx.mixin({}, $.fn.checkbox.defaults, options);
			var $element = $(element);

			if (element.tagName.toLowerCase() !== 'label') {
				logError('Checkbox must be initialized on the `label` that wraps the `input` element. See https://github.com/ExactTarget/fuelux/blob/master/reference/markup/checkbox.html for example of proper markup. Call `.checkbox()` on the `<label>` not the `<input>`');
				return;
			}

			// cache elements
			this.$label = $element;
			this.$chk = this.$label.find('input[type="checkbox"]');
			this.$container = $element.parent('.checkbox'); // the container div

			if (!this.options.ignoreVisibilityCheck && this.$chk.css('visibility').match(/hidden|collapse/)) {
				logError('For accessibility reasons, in order for tab and space to function on checkbox, checkbox `<input />`\'s `visibility` must not be set to `hidden` or `collapse`. See https://github.com/ExactTarget/fuelux/pull/1996 for more details.');
			}

			// determine if a toggle container is specified
			var containerSelector = this.$chk.attr('data-toggle');
			this.$toggleContainer = $(containerSelector);

			// handle internal events
			this.$chk.on('change', langx.proxy(this.itemchecked, this));

			// set default state
			this.setInitialState();
		},

		setInitialState: function setInitialState () {
			var $chk = this.$chk;

			// get current state of input
			var checked = $chk.prop('checked');
			var disabled = $chk.prop('disabled');

			// sync label class with input state
			this.setCheckedState($chk, checked);
			this.setDisabledState($chk, disabled);
		},

		setCheckedState: function setCheckedState (element, checked) {
			var $chk = element;
			var $lbl = this.$label;
			var $containerToggle = this.$toggleContainer;

			if (checked) {
				$chk.prop('checked', true);
				$lbl.addClass('checked');
				$containerToggle.removeClass('hide hidden');
				$lbl.trigger('checked.fu.checkbox');
			} else {
				$chk.prop('checked', false);
				$lbl.removeClass('checked');
				$containerToggle.addClass('hidden');
				$lbl.trigger('unchecked.fu.checkbox');
			}

			$lbl.trigger('changed.fu.checkbox', checked);
		},

		setDisabledState: function setDisabledState (element, disabled) {
			var $chk = $(element);
			var $lbl = this.$label;

			if (disabled) {
				$chk.prop('disabled', true);
				$lbl.addClass('disabled');
				$lbl.trigger('disabled.fu.checkbox');
			} else {
				$chk.prop('disabled', false);
				$lbl.removeClass('disabled');
				$lbl.trigger('enabled.fu.checkbox');
			}

			return $chk;
		},

		itemchecked: function itemchecked (evt) {
			var $chk = $(evt.target);
			var checked = $chk.prop('checked');

			this.setCheckedState($chk, checked);
		},

		toggle: function toggle () {
			var checked = this.isChecked();

			if (checked) {
				this.uncheck();
			} else {
				this.check();
			}
		},

		check: function check () {
			this.setCheckedState(this.$chk, true);
		},

		uncheck: function uncheck () {
			this.setCheckedState(this.$chk, false);
		},

		isChecked: function isChecked () {
			var checked = this.$chk.prop('checked');
			return checked;
		},

		enable: function enable () {
			this.setDisabledState(this.$chk, false);
		},

		disable: function disable () {
			this.setDisabledState(this.$chk, true);
		},

		destroy: function destroy () {
			this.$label.remove();
			return this.$label[0].outerHTML;
		}
	});



	Checkbox.prototype.getValue = Checkbox.prototype.isChecked;

	// CHECKBOX PLUGIN DEFINITION

	$.fn.checkbox = function checkbox (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function applyData () {
			var $this = $(this);
			var data = $this.data('fu.checkbox');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.checkbox', (data = new Checkbox(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.checkbox.defaults = {
		ignoreVisibilityCheck: false
	};

	$.fn.checkbox.Constructor = Checkbox;

	$.fn.checkbox.noConflict = function noConflict () {
		$.fn.checkbox = old;
		return this;
	};

	// DATA-API

	/*
	$(document).on('mouseover.fu.checkbox.data-api', '[data-initialize=checkbox]', function initializeCheckboxes (e) {
		var $control = $(e.target);
		if (!$control.data('fu.checkbox')) {
			$control.checkbox($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function onReadyInitializeCheckboxes () {
		$('[data-initialize=checkbox]').each(function initializeCheckbox () {
			var $this = $(this);
			if (!$this.data('fu.checkbox')) {
				$this.checkbox($this.data());
			}
		});
	});
	*/

	return $.fn.checkbox;
});

define('skylark-swt/collapse',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: collapse.js v3.3.7
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

/* jshint latedef: false */

  'use strict';

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = sbswt.Collapse = sbswt.WidgetBase.inherit({
    klassName: "Collapse",

    init : function(element,options) {
      this.$element      = $(element)
      this.options       = langx.mixin({}, Collapse.DEFAULTS, options)
      this.$trigger      = $('[data-toggle="collapse"][href="#' + element.id + '"],' +
                             '[data-toggle="collapse"][data-target="#' + element.id + '"]')
      this.transitioning = null

      if (this.options.parent) {
        this.$parent = this.getParent()
      } else {
        this.addAriaAndCollapsedClass(this.$element, this.$trigger)
      }

      if (this.options.toggle) {
        this.toggle();
      }

      this.$element.on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
        var $this   = $(this)

        if (!$this.attr('data-target')) {
          e.preventDefault();
        }

        var $target = getTargetFromTrigger($this);
        var data    = $target.data('bs.collapse');
        var option  = data ? 'toggle' : $this.data();

        Plugin.call($target, option);
      })
    },

    dimension : function () {
      var hasWidth = this.$element.hasClass('width')
      return hasWidth ? 'width' : 'height'
    },

    show : function () {
      if (this.transitioning || this.$element.hasClass('in')) return

      var activesData
      var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing')

      if (actives && actives.length) {
        activesData = actives.data('bs.collapse')
        if (activesData && activesData.transitioning) return
      }

      var startEvent = eventer.create('show.bs.collapse')
      this.$element.trigger(startEvent)
      if (startEvent.isDefaultPrevented()) return

      if (actives && actives.length) {
        Plugin.call(actives, 'hide')
        activesData || actives.data('bs.collapse', null)
      }

      var dimension = this.dimension()

      this.$element
        .removeClass('collapse')
        .addClass('collapsing')[dimension](0)
        .attr('aria-expanded', true)

      this.$trigger
        .removeClass('collapsed')
        .attr('aria-expanded', true)

      this.transitioning = 1

      var complete = function () {
        this.$element
          .removeClass('collapsing')
          .addClass('collapse in')[dimension]('')
        this.transitioning = 0
        this.$element
          .trigger('shown.bs.collapse')
      }

      if (!browser.support.transition) return complete.call(this)

      var scrollSize = langx.camelCase(['scroll', dimension].join('-'))

      this.$element
        .one('bsTransitionEnd', langx.proxy(complete, this))
        .emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize])
    },

    hide : function () {
      if (this.transitioning || !this.$element.hasClass('in')) return

      var startEvent = eventer.create('hide.bs.collapse')
      this.$element.trigger(startEvent)
      if (startEvent.isDefaultPrevented()) return

      var dimension = this.dimension()

      this.$element[dimension](this.$element[dimension]())[0].offsetHeight

      this.$element
        .addClass('collapsing')
        .removeClass('collapse in')
        .attr('aria-expanded', false)

      this.$trigger
        .addClass('collapsed')
        .attr('aria-expanded', false)

      this.transitioning = 1

      var complete = function () {
        this.transitioning = 0
        this.$element
          .removeClass('collapsing')
          .addClass('collapse')
          .trigger('hidden.bs.collapse')
      }

      if (!browser.support.transition) return complete.call(this)

      this.$element
        [dimension](0)
        .one('bsTransitionEnd', langx.proxy(complete, this))
        .emulateTransitionEnd(Collapse.TRANSITION_DURATION)
    },

    toggle : function () {
      this[this.$element.hasClass('in') ? 'hide' : 'show']()
    },

    getParent : function () {
      return $(this.options.parent)
        .find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
        .each(langx.proxy(function (i, element) {
          var $element = $(element)
          this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element)
        }, this))
        .end()
    },

    addAriaAndCollapsedClass : function ($element, $trigger) {
      var isOpen = $element.hasClass('in')

      $element.attr('aria-expanded', isOpen)
      $trigger
        .toggleClass('collapsed', !isOpen)
        .attr('aria-expanded', isOpen)
    }

  });

  Collapse.VERSION  = '3.3.7'

  Collapse.TRANSITION_DURATION = 350

  Collapse.DEFAULTS = {
    toggle: true
  }


  function getTargetFromTrigger($trigger) {
    var href
    var target = $trigger.attr('data-target')
      || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7

    return $(target)
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = langx.mixin({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.collapse

  $.fn.collapse             = Plugin;
  $.fn.collapse.Constructor = Collapse;

  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================
  /*
  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var $this   = $(this)

    if (!$this.attr('data-target')) e.preventDefault()

    var $target = getTargetFromTrigger($this)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()

    Plugin.call($target, option)
  })
*/

  return $.fn.collapse;

});

define('skylark-swt/combobox',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.combobox;


	// COMBOBOX CONSTRUCTOR AND PROTOTYPE

	var Combobox = sbswt.Combobox = sbswt.WidgetBase.inherit({
		klassName: "Combobox",

		init : function(element,options) {
			this.$element = $(element);
			this.options = langx.mixin({}, $.fn.combobox.defaults, options);

			this.$dropMenu = this.$element.find('.dropdown-menu');
			this.$input = this.$element.find('input');
			this.$button = this.$element.find('.btn');
			this.$button.dropdown();
			this.$inputGroupBtn = this.$element.find('.input-group-btn');

			this.$element.on('click.fu.combobox', 'a', langx.proxy(this.itemclicked, this));
			this.$element.on('change.fu.combobox', 'input', langx.proxy(this.inputchanged, this));
			this.$element.on('shown.bs.dropdown', langx.proxy(this.menuShown, this));
			this.$input.on('keyup.fu.combobox', langx.proxy(this.keypress, this));

			// set default selection
			this.setDefaultSelection();

			// if dropdown is empty, disable it
			var items = this.$dropMenu.children('li');
			if( items.length === 0) {
				this.$button.addClass('disabled');
			}

			// filter on load in case the first thing they do is press navigational key to pop open the menu
			if (this.options.filterOnKeypress) {
				this.options.filter(this.$dropMenu.find('li'), this.$input.val(), this);
			}
		},

		destroy: function () {
			this.$element.remove();
			// remove any external bindings
			// [none]

			// set input value attrbute in markup
			this.$element.find('input').each(function () {
				$(this).attr('value', $(this).val());
			});

			// empty elements to return to original markup
			// [none]

			return this.$element[0].outerHTML;
		},

		doSelect: function ($item) {

			if (typeof $item[0] !== 'undefined') {
				// remove selection from old item, may result in remove and
				// re-addition of class if item is the same
				this.$element.find('li.selected:first').removeClass('selected');

				// add selection to new item
				this.$selectedItem = $item;
				this.$selectedItem.addClass('selected');

				// update input
				this.$input.val(this.$selectedItem.text().trim());
			} else {
				// this is a custom input, not in the menu
				this.$selectedItem = null;
				this.$element.find('li.selected:first').removeClass('selected');
			}
		},

		clearSelection: function () {
			this.$selectedItem = null;
			this.$input.val('');
			this.$dropMenu.find('li').removeClass('selected');
		},

		menuShown: function () {
			if (this.options.autoResizeMenu) {
				this.resizeMenu();
			}
		},

		resizeMenu: function () {
			var width = this.$element.outerWidth();
			this.$dropMenu.outerWidth(width);
		},

		selectedItem: function () {
			var item = this.$selectedItem;
			var data = {};

			if (item) {
				var txt = this.$selectedItem.text().trim();
				data = langx.mixin({
					text: txt
				}, this.$selectedItem.data());
			} else {
				data = {
					text: this.$input.val().trim(),
					notFound: true
				};
			}

			return data;
		},

		selectByText: function (text) {
			var $item = $([]);
			this.$element.find('li').each(function () {
				if ((this.textContent || this.innerText || $(this).text() || '').trim().toLowerCase() === (text || '').trim().toLowerCase()) {
					$item = $(this);
					return false;
				}
			});

			this.doSelect($item);
		},

		selectByValue: function (value) {
			var selector = 'li[data-value="' + value + '"]';
			this.selectBySelector(selector);
		},

		selectByIndex: function (index) {
			// zero-based index
			var selector = 'li:eq(' + index + ')';
			this.selectBySelector(selector);
		},

		selectBySelector: function (selector) {
			var $item = this.$element.find(selector);
			this.doSelect($item);
		},

		setDefaultSelection: function () {
			var selector = 'li[data-selected=true]:first';
			var item = this.$element.find(selector);

			if (item.length > 0) {
				// select by data-attribute
				this.selectBySelector(selector);
				item.removeData('selected');
				item.removeAttr('data-selected');
			}
		},

		enable: function () {
			this.$element.removeClass('disabled');
			this.$input.removeAttr('disabled');
			this.$button.removeClass('disabled');
		},

		disable: function () {
			this.$element.addClass('disabled');
			this.$input.attr('disabled', true);
			this.$button.addClass('disabled');
		},

		itemclicked: function (e) {
			this.$selectedItem = $(e.target).parent();

			// set input text and trigger input change event marked as synthetic
			this.$input.val(this.$selectedItem.text().trim()).trigger('change', {
				synthetic: true
			});

			// pass object including text and any data-attributes
			// to onchange event
			var data = this.selectedItem();

			// trigger changed event
			this.$element.trigger('changed.fu.combobox', data);

			e.preventDefault();

			// return focus to control after selecting an option
			this.$element.find('.dropdown-toggle').focus();
		},

		keypress: function (e) {
			var ENTER = 13;
			//var TAB = 9;
			var ESC = 27;
			var LEFT = 37;
			var UP = 38;
			var RIGHT = 39;
			var DOWN = 40;

			var IS_NAVIGATIONAL = (
				e.which === UP ||
				e.which === DOWN ||
				e.which === LEFT ||
				e.which === RIGHT
			);

			if(this.options.showOptionsOnKeypress && !this.$inputGroupBtn.hasClass('open')){
				this.$button.dropdown('toggle');
				this.$input.focus();
			}

			if (e.which === ENTER) {
				e.preventDefault();

				var selected = this.$dropMenu.find('li.selected').text().trim();
				if(selected.length > 0){
					this.selectByText(selected);
				}else{
					this.selectByText(this.$input.val());
				}

				this.$inputGroupBtn.removeClass('open');
			} else if (e.which === ESC) {
				e.preventDefault();
				this.clearSelection();
				this.$inputGroupBtn.removeClass('open');
			} else if (this.options.showOptionsOnKeypress) {
				if (e.which === DOWN || e.which === UP) {
					e.preventDefault();
					var $selected = this.$dropMenu.find('li.selected');
					if ($selected.length > 0) {
						if (e.which === DOWN) {
							$selected = $selected.next(':not(.hidden)');
						} else {
							$selected = $selected.prev(':not(.hidden)');
						}
					}

					if ($selected.length === 0){
						if (e.which === DOWN) {
							$selected = this.$dropMenu.find('li:not(.hidden):first');
						} else {
							$selected = this.$dropMenu.find('li:not(.hidden):last');
						}
					}
					this.doSelect($selected);
				}
			}

			// Avoid filtering on navigation key presses
			if (this.options.filterOnKeypress && !IS_NAVIGATIONAL) {
				this.options.filter(this.$dropMenu.find('li'), this.$input.val(), this);
			}

			this.previousKeyPress = e.which;
		},

		inputchanged: function (e, extra) {
			var val = $(e.target).val();
			// skip processing for internally-generated synthetic event
			// to avoid double processing
			if (extra && extra.synthetic) {
				this.selectByText(val);
				return;
			}
			this.selectByText(val);

			// find match based on input
			// if no match, pass the input value
			var data = this.selectedItem();
			if (data.text.length === 0) {
				data = {
					text: val
				};
			}

			// trigger changed event
			this.$element.trigger('changed.fu.combobox', data);
		}

	});



	Combobox.prototype.getValue = Combobox.prototype.selectedItem;

	// COMBOBOX PLUGIN DEFINITION

	$.fn.combobox = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.combobox');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.combobox', (data = new Combobox(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.combobox.defaults = {

		autoResizeMenu: true,
		filterOnKeypress: false,
		showOptionsOnKeypress: false,
		filter: function filter (list, predicate, self) {
			var visible = 0;
			self.$dropMenu.find('.empty-indicator').remove();

			list.each(function (i) {
				var $li = $(this);
				var text = $(this).text().trim();

				$li.removeClass();

				if (text === predicate) {
					$li.addClass('text-success');
					visible++;
				} else if (text.substr(0, predicate.length) === predicate) {
					$li.addClass('text-info');
					visible++;
				} else {
					$li.addClass('hidden');
				}
			});

			if (visible === 0) {
				self.$dropMenu.append('<li class="empty-indicator text-muted"><em>No Matches</em></li>');
			}
		}
	};

	$.fn.combobox.Constructor =  Combobox;

	$.fn.combobox.noConflict = function () {
		$.fn.combobox = old;
		return this;
	};

	// DATA-API

	/*

	$(document).on('mousedown.fu.combobox.data-api', '[data-initialize=combobox]', function (e) {
		var $control = $(e.target).closest('.combobox');
		if (!$control.data('fu.combobox')) {
			$control.combobox($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=combobox]').each(function () {
			var $this = $(this);
			if (!$this.data('fu.combobox')) {
				$this.combobox($this.data());
			}
		});
	});
	*/

	return $.fn.combobox;
});

define('skylark-swt/dropdown',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: dropdown.js v3.3.7
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
  'use strict';

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop';
  var toggle   = '[data-toggle="dropdown"]';

  var Dropdown = sbswt.Dropdown = sbswt.WidgetBase.inherit({
    klassName: "Dropdown",

    init : function(element,options) {
      var $el = this.$element = $(element);
      $el.on('click.bs.dropdown', this.toggle);
      $el.on('keydown.bs.dropdown', '[data-toggle="dropdown"],.dropdown-menu',this.keydown);
    },

    toggle : function (e) {
      var $this = $(this)

      if ($this.is('.disabled, :disabled')) return

      var $parent  = getParent($this)
      var isActive = $parent.hasClass('open')

      clearMenus()

      if (!isActive) {
        if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
          // if mobile we use a backdrop because click events don't delegate
          $(document.createElement('div'))
            .addClass('dropdown-backdrop')
            .insertAfter($(this))
            .on('click', clearMenus)
        }

        var relatedTarget = { relatedTarget: this }
        $parent.trigger(e = eventer.create('show.bs.dropdown', relatedTarget))

        if (e.isDefaultPrevented()) return

        $this
          .trigger('focus')
          .attr('aria-expanded', 'true')

        $parent
          .toggleClass('open')
          .trigger(eventer.create('shown.bs.dropdown', relatedTarget))
      }

      return false
    },

    keydown : function (e) {
      if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return

      var $this = $(this)

      e.preventDefault()
      e.stopPropagation()

      if ($this.is('.disabled, :disabled')) return

      var $parent  = getParent($this)
      var isActive = $parent.hasClass('open')

      if (!isActive && e.which != 27 || isActive && e.which == 27) {
        if (e.which == 27) $parent.find(toggle).trigger('focus')
        return $this.trigger('click')
      }

      var desc = ' li:not(.disabled):visible a'
      var $items = $parent.find('.dropdown-menu' + desc)

      if (!$items.length) return

      var index = $items.index(e.target)

      if (e.which == 38 && index > 0)                 index--         // up
      if (e.which == 40 && index < $items.length - 1) index++         // down
      if (!~index)                                    index = 0

      $items.eq(index).trigger('focus')
    }

  });

  Dropdown.VERSION = '3.3.7'

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }

  function clearMenus(e) {
    if (e && e.which === 3) return
    $(backdrop).remove()
    $(toggle).each(function () {
      var $this         = $(this)
      var $parent       = getParent($this)
      var relatedTarget = { relatedTarget: this }

      if (!$parent.hasClass('open')) return

      if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && noder.contains($parent[0], e.target)) return

      $parent.trigger(e = eventer.create('hide.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this.attr('aria-expanded', 'false')
      $parent.removeClass('open').trigger(eventer.create('hidden.bs.dropdown', relatedTarget))
    })
  }



  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.dropdown')

      if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.dropdown

  $.fn.dropdown             = Plugin;
  $.fn.dropdown.Constructor = Dropdown;


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================
  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() });

  /*
  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
    .on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown);
  */


  return $.fn.dropdown;

});

define('skylark-swt/dropdown-autoflip',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/query"
],function(langx,browser,eventer,noder,geom,$){

	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	$(document).on('click.fu.dropdown-autoflip', '[data-toggle=dropdown][data-flip]', function (event) {
		if ($(this).data().flip === "auto") {
			// have the drop down decide where to place itself
			_autoFlip($(this).next('.dropdown-menu'));
		}
	});

	// For pillbox suggestions dropdown
	$(document).on('suggested.fu.pillbox', function (event, element) {
		_autoFlip($(element));
		$(element).parent().addClass('open');
	});

	function _autoFlip(menu) {
		// hide while the browser thinks
		$(menu).css({
			visibility: "hidden"
		});

		// decide where to put menu
		if (dropUpCheck(menu)) {
			menu.parent().addClass("dropup");
		} else {
			menu.parent().removeClass("dropup");
		}

		// show again
		$(menu).css({
			visibility: "visible"
		});
	}

	function dropUpCheck(element) {
		// caching container
		var $container = _getContainer(element);

		// building object with measurementsances for later use
		var measurements = {};
		measurements.parentHeight = element.parent().outerHeight();
		measurements.parentOffsetTop = element.parent().offset().top;
		measurements.dropdownHeight = element.outerHeight();
		measurements.containerHeight = $container.overflowElement.outerHeight();

		// this needs to be different if the window is the container or another element is
		measurements.containerOffsetTop = (!!$container.isWindow) ? $container.overflowElement.scrollTop() : $container.overflowElement.offset().top;

		// doing the calculations
		measurements.fromTop = measurements.parentOffsetTop - measurements.containerOffsetTop;
		measurements.fromBottom = measurements.containerHeight - measurements.parentHeight - (measurements.parentOffsetTop - measurements.containerOffsetTop);

		// actual determination of where to put menu
		// false = drop down
		// true = drop up
		if (measurements.dropdownHeight < measurements.fromBottom) {
			return false;
		} else if (measurements.dropdownHeight < measurements.fromTop) {
			return true;
		} else if (measurements.dropdownHeight >= measurements.fromTop && measurements.dropdownHeight >= measurements.fromBottom) {
			// decide which one is bigger and put it there
			if (measurements.fromTop >= measurements.fromBottom) {
				return true;
			} else {
				return false;
			}

		}

	}

	function _getContainer(element) {
		var targetSelector = element.attr('data-target');
		var isWindow = true;
		var containerElement;

		if(!targetSelector) {
			// no selection so find the relevant ancestor
			langx.each(element.parents(), function (index, parentElement) {
				if ($(parentElement).css('overflow') !== 'visible') {
					containerElement = parentElement;
					isWindow = false;
					return false;
				}
			});
		}
		else if (targetSelector !== 'window') {
			containerElement = $(targetSelector);
			isWindow = false;
		}

		// fallback to window
		if (isWindow) {
			containerElement = window;
		}

		return {
				overflowElement: $(containerElement),
				isWindow: isWindow
		};
	}

	// register empty plugin
	$.fn.dropdownautoflip = function () {
		/* empty */
	};

});

define('skylark-swt/infinite-scroll',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query"
],function(langx,browser,eventer,noder,geom,velm,$){

	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.infinitescroll;

	// INFINITE SCROLL CONSTRUCTOR AND PROTOTYPE

	var InfiniteScroll = function (element, options) {
		this.$element = $(element);
		this.$element.addClass('infinitescroll');
		this.options = langx.mixin({}, $.fn.infinitescroll.defaults, options);

		this.curScrollTop = this.$element.scrollTop();
		this.curPercentage = this.getPercentage();
		this.fetchingData = false;

		this.$element.on('scroll.fu.infinitescroll', langx.proxy(this.onScroll, this));
		this.onScroll();
	};

	InfiniteScroll.prototype = {

		constructor: InfiniteScroll,

		destroy: function () {
			this.$element.remove();
			// any external bindings
			// [none]

			// empty elements to return to original markup
			this.$element.empty();

			return this.$element[0].outerHTML;
		},

		disable: function () {
			this.$element.off('scroll.fu.infinitescroll');
		},

		enable: function () {
			this.$element.on('scroll.fu.infinitescroll', langx.proxy(this.onScroll, this));
		},

		end: function (content) {
			var end = $('<div class="infinitescroll-end"></div>');
			if (content) {
				end.append(content);
			} else {
				end.append('---------');
			}

			this.$element.append(end);
			this.disable();
		},

		getPercentage: function () {
			var height = (this.$element.css('box-sizing') === 'border-box') ? this.$element.outerHeight() : this.$element.height();
			var scrollHeight = this.$element.get(0).scrollHeight;
			return (scrollHeight > height) ? ((height / (scrollHeight - this.curScrollTop)) * 100) : 0;
		},

		fetchData: function (force) {
			var load = $('<div class="infinitescroll-load"></div>');
			var self = this;
			var moreBtn;

			var fetch = function () {
				var helpers = {
					percentage: self.curPercentage,
					scrollTop: self.curScrollTop
				};
				var $loader = $('<div class="loader"></div>');
				load.append($loader);
				$loader.loader();
				if (self.options.dataSource) {
					self.options.dataSource(helpers, function (resp) {
						var end;
						load.remove();
						if (resp.content) {
							self.$element.append(resp.content);
						}

						if (resp.end) {
							end = (resp.end !== true) ? resp.end : undefined;
							self.end(end);
						}

						self.fetchingData = false;
					});
				}
			};

			this.fetchingData = true;
			this.$element.append(load);
			if (this.options.hybrid && force !== true) {
				moreBtn = $('<button type="button" class="btn btn-primary"></button>');
				if (typeof this.options.hybrid === 'object') {
					moreBtn.append(this.options.hybrid.label);
				} else {
					moreBtn.append('<span class="glyphicon glyphicon-repeat"></span>');
				}

				moreBtn.on('click.fu.infinitescroll', function () {
					moreBtn.remove();
					fetch();
				});
				load.append(moreBtn);
			} else {
				fetch();
			}
		},

		onScroll: function (e) {
			this.curScrollTop = this.$element.scrollTop();
			this.curPercentage = this.getPercentage();
			if (!this.fetchingData && this.curPercentage >= this.options.percentage) {
				this.fetchData();
			}
		}
	};

	// INFINITE SCROLL PLUGIN DEFINITION

	$.fn.infinitescroll = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.infinitescroll');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.infinitescroll', (data = new InfiniteScroll(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.infinitescroll.defaults = {
		dataSource: null,
		hybrid: false,//can be true or an object with structure: { 'label': (markup or jQuery obj) }
		percentage: 95//percentage scrolled to the bottom before more is loaded
	};

	$.fn.infinitescroll.Constructor = InfiniteScroll;

	$.fn.infinitescroll.noConflict = function () {
		$.fn.infinitescroll = old;
		return this;
	};

});

define('skylark-swt/loader',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */


	var old = $.fn.loader;

	// LOADER CONSTRUCTOR AND PROTOTYPE

	var Loader = sbswt.Loader = sbswt.WidgetBase.inherit({
		klassName: "Loader",

		init : function(element,options) {
			this.$element = $(element);
			this.options = langx.mixin({}, $.fn.loader.defaults, options);
		},
		destroy: function () {
			this.$element.remove();
			// any external bindings
			// [none]
			// empty elements to return to original markup
			// [none]
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		ieRepaint: function () {},

		msieVersion: function () {},

		next: function () {},

		pause: function () {},

		play: function () {},

		previous: function () {},

		reset: function () {}
	});

	// LOADER PLUGIN DEFINITION

	$.fn.loader = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.loader');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.loader', (data = new Loader(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.loader.defaults = {};

	$.fn.loader.Constructor = Loader;

	$.fn.loader.noConflict = function () {
		$.fn.loader = old;
		return this;
	};

	// INIT LOADER ON DOMCONTENTLOADED
	/*
	$(function () {
		$('[data-initialize=loader]').each(function () {
			var $this = $(this);
			if (!$this.data('fu.loader')) {
				$this.loader($this.data());
			}
		});
	});
	*/

	return $.fn.loader;
});

define('skylark-swt/modal',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: modal.js v3.3.7
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = sbswt.Modal = sbswt.WidgetBase.inherit({
    klassName: "Modal",

    init : function(element,options) {
      this.options             = options;
      this.$container               = $(options.container || document.body)
      this.$element            = $(element)
      this.$dialog             = this.$element.find('.modal-dialog')
      if (!this.$container.is("body")) {
        this.$element.css("position","absolute");
      }
      //this.$container.append(this.$element);
      this.$backdrop           = null
      this.isShown             = null
      this.originalBodyPad     = null
      this.scrollbarWidth      = 0
      this.ignoreBackdropClick = false

      if (this.options.remote) {
        this.$element
          .find('.modal-content')
          .load(this.options.remote, langx.proxy(function () {
            this.$element.trigger('loaded.bs.modal')
          }, this))
      }
    },

    toggle : function (_relatedTarget) {
      return this.isShown ? this.hide() : this.show(_relatedTarget)
    },

    show : function (_relatedTarget) {
      var that = this
      var e    = eventer.create('show.bs.modal', { relatedTarget: _relatedTarget })

      this.$element.trigger(e)

      if (this.isShown || e.isDefaultPrevented()) return

      this.isShown = true

      this.checkScrollbar()
      this.setScrollbar()
      this.$container.addClass('modal-open')

      this.escape()
      this.resize()

      this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', langx.proxy(this.hide, this))

      this.$dialog.on('mousedown.dismiss.bs.modal', function () {
        that.$element.one('mouseup.dismiss.bs.modal', function (e) {
          if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
        })
      })

      this.backdrop(function () {
        var transition = browser.support.transition && that.$element.hasClass('fade')

        if (!noder.isChildOf(that.$element[0],that.$container[0])) {
          that.$element.appendTo(that.$container) // don't move modals dom position
        }

        that.$element
          .show()
          .scrollTop(0)

        that.adjustDialog()

        if (transition) {
          that.$element[0].offsetWidth // force reflow
        }

        that.$element.addClass('in')

        that.enforceFocus()

        var e = eventer.create('shown.bs.modal', { relatedTarget: _relatedTarget })

        transition ?
          that.$dialog // wait for modal to slide in
            .one('bsTransitionEnd', function () {
              that.$element.trigger('focus').trigger(e)
            })
            .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
          that.$element.trigger('focus').trigger(e)
      })
    },

    hide : function (e) {
      if (e) e.preventDefault()

      e = eventer.create('hide.bs.modal')

      this.$element.trigger(e)

      if (!this.isShown || e.isDefaultPrevented()) return

      this.isShown = false

      this.escape()
      this.resize()

      $(document).off('focusin.bs.modal')

      this.$element
        .removeClass('in')
        .off('click.dismiss.bs.modal')
        .off('mouseup.dismiss.bs.modal')

      this.$dialog.off('mousedown.dismiss.bs.modal')

      browser.support.transition && this.$element.hasClass('fade') ?
        this.$element
          .one('bsTransitionEnd', langx.proxy(this.hideModal, this))
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        this.hideModal()
    },

    enforceFocus : function () {
      $(document)
        .off('focusin.bs.modal') // guard against infinite focus loop
        .on('focusin.bs.modal', langx.proxy(function (e) {
          if (document !== e.target &&
              this.$element[0] !== e.target &&
              !this.$element.has(e.target).length) {
            this.$element.trigger('focus')
          }
        }, this))
    },

    escape : function () {
      if (this.isShown && this.options.keyboard) {
        this.$element.on('keydown.dismiss.bs.modal', langx.proxy(function (e) {
          e.which == 27 && this.hide()
        }, this))
      } else if (!this.isShown) {
        this.$element.off('keydown.dismiss.bs.modal')
      }
    },

    resize : function () {
      if (this.isShown) {
        $(window).on('resize.bs.modal', langx.proxy(this.handleUpdate, this))
      } else {
        $(window).off('resize.bs.modal')
      }
    },

    hideModal : function () {
      var that = this
      this.$element.hide()
      this.backdrop(function () {
        that.$container.removeClass('modal-open')
        that.resetAdjustments()
        that.resetScrollbar()
        that.$element.trigger('hidden.bs.modal')
      })
    },

    removeBackdrop : function () {
      this.$backdrop && this.$backdrop.remove()
      this.$backdrop = null
    },

    backdrop : function (callback) {
      var that = this
      var animate = this.$element.hasClass('fade') ? 'fade' : ''

      if (this.isShown && this.options.backdrop) {
        var doAnimate = browser.support.transition && animate

        this.$backdrop = $(document.createElement('div'))
          .addClass('modal-backdrop ' + animate)
          .appendTo(this.$container)

        if (!this.$container.is("body")) {
          this.$backdrop.css("position","absolute");
        }


        this.$element.on('click.dismiss.bs.modal', langx.proxy(function (e) {
          if (this.ignoreBackdropClick) {
            this.ignoreBackdropClick = false
            return
          }
          if (e.target !== e.currentTarget) return
          this.options.backdrop == 'static'
            ? this.$element[0].focus()
            : this.hide()
        }, this))

        if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

        this.$backdrop.addClass('in')

        if (!callback) return

        doAnimate ?
          this.$backdrop
            .one('bsTransitionEnd', callback)
            .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
          callback()

      } else if (!this.isShown && this.$backdrop) {
        this.$backdrop.removeClass('in')

        var callbackRemove = function () {
          that.removeBackdrop()
          callback && callback()
        }
        browser.support.transition && this.$element.hasClass('fade') ?
          this.$backdrop
            .one('bsTransitionEnd', callbackRemove)
            .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
          callbackRemove()

      } else if (callback) {
        callback()
      }
    },

    // these following methods are used to handle overflowing modals

    handleUpdate : function () {
      this.adjustDialog()
    },

    adjustDialog : function () {
      var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

      this.$element.css({
        paddingLeft:  !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
        paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
      })
    },

    resetAdjustments : function () {
      this.$element.css({
        paddingLeft: '',
        paddingRight: ''
      })
    },

    checkScrollbar : function () {
      var fullWindowWidth = window.innerWidth
      if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
        var documentElementRect = document.documentElement.getBoundingClientRect()
        fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
      }
      this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
      this.scrollbarWidth = this.measureScrollbar()
    },

    setScrollbar : function () {
      var bodyPad = parseInt((this.$container.css('padding-right') || 0), 10)
      this.originalBodyPad = document.body.style.paddingRight || ''
      if (this.bodyIsOverflowing) this.$container.css('padding-right', bodyPad + this.scrollbarWidth)
    },

    resetScrollbar : function () {
      this.$container.css('padding-right', this.originalBodyPad)
    },

    measureScrollbar : function () { // thx walsh
      var scrollDiv = document.createElement('div')
      scrollDiv.className = 'modal-scrollbar-measure'
      this.$container.append(scrollDiv)
      var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
      this.$container[0].removeChild(scrollDiv)
      return scrollbarWidth
    }

  });  


  Modal.VERSION  = '3.3.7'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }



  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = langx.mixin({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal             = Plugin;
  $.fn.modal.Constructor = Modal;


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============
  /*
  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
    var option  = $target.data('bs.modal') ? 'toggle' : langx.mixin({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })
  */

  return $.fn.modal;
});

define('skylark-swt/menu',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

	var popup = null;
	var right_to_left ;

	var Menu = sbswt.Menu = sbswt.WidgetBase.inherit({
        klassName: "Menu",

        init : function(elm,options) {
        	if (!options) {
        		options = elm;
        		elm = null;
        	}
			var self = this,$el;

			this._options = langx.mixin({
					hide_onmouseleave	: 0,
					icons				: true

			},options);

			if (!elm) {
				$el = this.$el = $("<ul class='vakata-context'></ul>");
			} else {
				$el = this.$el = $(elm);
			}

			var to = false;
			$el.on("mouseenter", "li", function (e) {
					e.stopImmediatePropagation();

					if(noder.contains(this, e.relatedTarget)) {
						// премахнато заради delegate mouseleave по-долу
						// $(this).find(".vakata-context-hover").removeClass("vakata-context-hover");
						return;
					}

					if(to) { clearTimeout(to); }
					$el.find(".vakata-context-hover").removeClass("vakata-context-hover").end();

					$(this)
						.siblings().find("ul").hide().end().end()
						.parentsUntil(".vakata-context", "li").addBack().addClass("vakata-context-hover");
					self._show_submenu(this);
				})
				// тестово - дали не натоварва?
				.on("mouseleave", "li", function (e) {
					if(noder.contains(this, e.relatedTarget)) { return; }
					$(this).find(".vakata-context-hover").addBack().removeClass("vakata-context-hover");
				})
				.on("mouseleave", function (e) {
					$(this).find(".vakata-context-hover").removeClass("vakata-context-hover");
					if(self._options.hide_onmouseleave) {
						to = setTimeout(
							(function (t) {
								return function () { self.hide(); };
							}(this)), self._options.hide_onmouseleave);
					}
				})
				.on("click", "a", function (e) {
					e.preventDefault();
				//})
				//.on("mouseup", "a", function (e) {
					if(!$(this).blur().parent().hasClass("vakata-context-disabled") && self._execute($(this).attr("rel")) !== false) {
						self.hide();
					}
				})
				.on('keydown', 'a', function (e) {
						var o = null;
						switch(e.which) {
							case 13:
							case 32:
								e.type = "click";
								e.preventDefault();
								$(e.currentTarget).trigger(e);
								break;
							case 37:
								self.$el.find(".vakata-context-hover").last().closest("li").first().find("ul").hide().find(".vakata-context-hover").removeClass("vakata-context-hover").end().end().children('a').focus();
								e.stopImmediatePropagation();
								e.preventDefault();
								break;
							case 38:
								o = self.$el.find("ul:visible").addBack().last().children(".vakata-context-hover").removeClass("vakata-context-hover").prevAll("li:not(.vakata-context-separator)").first();
								if(!o.length) { o = self.$el.find("ul:visible").addBack().last().children("li:not(.vakata-context-separator)").last(); }
								o.addClass("vakata-context-hover").children('a').focus();
								e.stopImmediatePropagation();
								e.preventDefault();
								break;
							case 39:
								self.$el.find(".vakata-context-hover").last().children("ul").show().children("li:not(.vakata-context-separator)").removeClass("vakata-context-hover").first().addClass("vakata-context-hover").children('a').focus();
								e.stopImmediatePropagation();
								e.preventDefault();
								break;
							case 40:
								o = self.$el.find("ul:visible").addBack().last().children(".vakata-context-hover").removeClass("vakata-context-hover").nextAll("li:not(.vakata-context-separator)").first();
								if(!o.length) { o = self.$el.find("ul:visible").addBack().last().children("li:not(.vakata-context-separator)").first(); }
								o.addClass("vakata-context-hover").children('a').focus();
								e.stopImmediatePropagation();
								e.preventDefault();
								break;
							case 27:
								self.hide();
								e.preventDefault();
								break;
							default:
								//console.log(e.which);
								break;
						}
					})
				.on('keydown', function (e) {
					e.preventDefault();
					var a = self.$el.find('.vakata-contextmenu-shortcut-' + e.which).parent();
					if(a.parent().not('.vakata-context-disabled')) {
						a.click();
					}
				});

			this.render();
        },

        render : function() {
        	var items = this._options.items;
			if(this._parse(items)) {
				this.$el.html(this.html);
			}
			this.$el.width('');
        },

		_trigger : function (event_name) {
			$(document).trigger("context_" + event_name + ".sbswt", {
				"reference"	: this.reference,
				"element"	: this.$el,
				"position"	: {
					"x" : this.position_x,
					"y" : this.position_y
				}
			});
		},        

		_execute : function (i) {
			i = this.items[i];
			return i && (!i._disabled || (langx.isFunction(i._disabled) && !i._disabled({ "item" : i, "reference" : this.reference, "element" : this.$el }))) && i.action ? i.action.call(null, {
						"item"		: i,
						"reference"	: this.reference,
						"element"	: this.$el,
						"position"	: {
							"x" : this.position_x,
							"y" : this.position_y
						}
					}) : false;
		},
		_parse : function (o, is_callback) {
			var self = this,
				reference = self._options.reference;

			if(!o) { return false; }
			if(!is_callback) {
				self.html		= "";
				self.items	= [];
			}
			var str = "",
				sep = false,
				tmp;

			if(is_callback) { str += "<"+"ul>"; }
			langx.each(o, function (i, val) {
				if(!val) { return true; }
				self.items.push(val);
				if(!sep && val.separator_before) {
					str += "<"+"li class='vakata-context-separator'><"+"a href='#' " + (self._options.icons ? '' : 'style="margin-left:0px;"') + ">&#160;<"+"/a><"+"/li>";
				}
				sep = false;
				str += "<"+"li class='" + (val._class || "") + (val._disabled === true || (langx.isFunction(val._disabled) && val._disabled({ "item" : val, "reference" : reference, "element" : self.$el })) ? " vakata-contextmenu-disabled " : "") + "' "+(val.shortcut?" data-shortcut='"+val.shortcut+"' ":'')+">";
				str += "<"+"a href='#' rel='" + (self.items.length - 1) + "' " + (val.title ? "title='" + val.title + "'" : "") + ">";
				if(self._options.icons) {
					str += "<"+"i ";
					if(val.icon) {
						if(val.icon.indexOf("/") !== -1 || val.icon.indexOf(".") !== -1) { str += " style='background:url(\"" + val.icon + "\") center center no-repeat' "; }
						else { str += " class='" + val.icon + "' "; }
					}
					str += "><"+"/i><"+"span class='vakata-contextmenu-sep'>&#160;<"+"/span>";
				}
				str += (langx.isFunction(val.label) ? val.label({ "item" : i, "reference" : reference, "element" : self.$el }) : val.label) + (val.shortcut?' <span class="vakata-contextmenu-shortcut vakata-contextmenu-shortcut-'+val.shortcut+'">'+ (val.shortcut_label || '') +'</span>':'') + "<"+"/a>";
				if(val.submenu) {
					tmp = self._parse(val.submenu, true);
					if(tmp) { str += tmp; }
				}
				str += "<"+"/li>";
				if(val.separator_after) {
					str += "<"+"li class='vakata-context-separator'><"+"a href='#' " + (self._options.icons ? '' : 'style="margin-left:0px;"') + ">&#160;<"+"/a><"+"/li>";
					sep = true;
				}
			});
			str  = str.replace(/<li class\='vakata-context-separator'\><\/li\>$/,"");
			if(is_callback) { str += "</ul>"; }
			/**
			 * triggered on the document when the contextmenu is parsed (HTML is built)
			 * @event
			 * @plugin contextmenu
			 * @name context_parse.vakata
			 * @param {jQuery} reference the element that was right clicked
			 * @param {jQuery} element the DOM element of the menu itself
			 * @param {Object} position the x & y coordinates of the menu
			 */
			if(!is_callback) { self.html = str; self._trigger("parse"); }
			return str.length > 10 ? str : false;
		},
		_show_submenu : function (o) {
			o = $(o);
			if(!o.length || !o.children("ul").length) { return; }
			var e = o.children("ul"),
				xl = o.offset().left,
				x = xl + o.outerWidth(),
				y = o.offset().top,
				w = e.width(),
				h = e.height(),
				dw = $(window).width() + $(window).scrollLeft(),
				dh = $(window).height() + $(window).scrollTop();
			// може да се спести е една проверка - дали няма някой от класовете вече нагоре
			if(right_to_left) {
				o[x - (w + 10 + o.outerWidth()) < 0 ? "addClass" : "removeClass"]("vakata-context-left");
			}
			else {
				o[x + w > dw  && xl > dw - x ? "addClass" : "removeClass"]("vakata-context-right");
			}
			if(y + h + 10 > dh) {
				e.css("bottom","-1px");
			}

			//if does not fit - stick it to the side
			if (o.hasClass('vakata-context-right')) {
				if (xl < w) {
					e.css("margin-right", xl - w);
				}
			} else {
				if (dw - x < w) {
					e.css("margin-left", dw - x - w);
				}
			}

			e.show();
		},
		show : function (reference, position, data) {
			var o, e, x, y, w, h, dw, dh, cond = true;
			switch(cond) {
				case (!position && !reference):
					return false;
				case (!!position && !!reference):
					this.reference	= reference;
					this.position_x	= position.x;
					this.position_y	= position.y;
					break;
				case (!position && !!reference):
					this.reference	= reference;
					o = reference.offset();
					this.position_x	= o.left + reference.outerHeight();
					this.position_y	= o.top;
					break;
				case (!!position && !reference):
					this.position_x	= position.x;
					this.position_y	= position.y;
					break;
			}
			if(!!reference && !data && $(reference).data('vakata_contextmenu')) {
				data = $(reference).data('vakata_contextmenu');
			}

			if(this.items.length) {
				this.$el.appendTo(document.body);
				e = this.$el;
				x = this.position_x;
				y = this.position_y;
				w = e.width();
				h = e.height();
				dw = $(window).width() + $(window).scrollLeft();
				dh = $(window).height() + $(window).scrollTop();
				if(right_to_left) {
					x -= (e.outerWidth() - $(reference).outerWidth());
					if(x < $(window).scrollLeft() + 20) {
						x = $(window).scrollLeft() + 20;
					}
				}
				if(x + w + 20 > dw) {
					x = dw - (w + 20);
				}
				if(y + h + 20 > dh) {
					y = dh - (h + 20);
				}

				this.$el
					.css({ "left" : x, "top" : y })
					.show()
					.find('a').first().focus().parent().addClass("vakata-context-hover");
				this.is_visible = true;

				popup = this;

				/**
				 * triggered on the document when the contextmenu is shown
				 * @event
				 * @plugin contextmenu
				 * @name context_show.vakata
				 * @param {jQuery} reference the element that was right clicked
				 * @param {jQuery} element the DOM element of the menu itself
				 * @param {Object} position the x & y coordinates of the menu
				 */
				this._trigger("show");
			}
		},
		hide : function () {
			if(this.is_visible) {
				this.$el.hide().find("ul").hide().end().find(':focus').blur().end().detach();
				this.is_visible = false;
				popup = null;
				/**
				 * triggered on the document when the contextmenu is hidden
				 * @event
				 * @plugin contextmenu
				 * @name context_hide.vakata
				 * @param {jQuery} reference the element that was right clicked
				 * @param {jQuery} element the DOM element of the menu itself
				 * @param {Object} position the x & y coordinates of the menu
				 */
				this._trigger("hide");
			}
		}

    });	

	$(function () {
		right_to_left = $(document.body).css("direction") === "rtl";

		$(document)
			.on("mousedown.sbswt.popup", function (e) {
				if(popup && popup.$el[0] !== e.target  && !noder.contains(popup.$el[0], e.target)) {
					popup.hide();
				}
			})
			.on("context_show.sbswt.popup", function (e, data) {
				popup.$el.find("li:has(ul)").children("a").addClass("vakata-context-parent");
				if(right_to_left) {
					popup.$el.addClass("vakata-context-rtl").css("direction", "rtl");
				}
				// also apply a RTL class?
				popup.$el.find("ul").hide().end();
			});
	});

	Menu.popup = function (reference, position, data) {
		var m = new Menu({
			reference : reference,
			items : data
		});
		m.show(reference,position);
	};

	Menu.hide = function() {
		if (popup) {
			popup.hide();
		}
	}

	return Menu;

});

define('skylark-swt/picker',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */
	var old = $.fn.picker;

	// PLACARD CONSTRUCTOR AND PROTOTYPE


	var Picker = sbswt.Picker = sbswt.WidgetBase.inherit({
		klassName: "Picker",

		init : function(element,options) {
			var self = this;
			this.$element = $(element);
			this.options = langx.mixin({}, $.fn.picker.defaults, options);

			this.$accept = this.$element.find('.picker-accept');
			this.$cancel = this.$element.find('.picker-cancel');
			this.$trigger = this.$element.find('.picker-trigger');
			this.$footer = this.$element.find('.picker-footer');
			this.$header = this.$element.find('.picker-header');
			this.$popup = this.$element.find('.picker-popup');
			this.$body = this.$element.find('.picker-body');

			this.clickStamp = '_';

			this.isInput = this.$trigger.is('input');

			this.$trigger.on('keydown.fu.picker', langx.proxy(this.keyComplete, this));
			this.$trigger.on('focus.fu.picker', langx.proxy(function inputFocus(e){
				if(typeof e === "undefined" || $(e.target).is('input[type=text]')){
					langx.proxy(this.show(), this);
				}
			}, this));
			this.$trigger.on('click.fu.picker', langx.proxy(function triggerClick(e){
				if(!$(e.target).is('input[type=text]')){
					langx.proxy(this.toggle(), this);
				}else{
					langx.proxy(this.show(), this);
				}
			}, this));
			this.$accept.on('click.fu.picker', langx.proxy(this.complete, this, 'accepted'));
			this.$cancel.on('click.fu.picker', function (e) {
				e.preventDefault(); self.complete('cancelled');
			});
		},

		complete: function complete(action) {
			var EVENT_CALLBACK_MAP = {
				'accepted': 'onAccept',
				'cancelled': 'onCancel',
				'exited': 'onExit'
			};
			var func = this.options[ EVENT_CALLBACK_MAP[action] ];

			var obj = {
				contents: this.$body
			};

			if (func) {
				func(obj);
				this.$element.trigger(action + '.fu.picker', obj);
			} else {
				this.$element.trigger(action + '.fu.picker', obj);
				this.hide();
			}
		},

		keyComplete: function keyComplete(e) {
			if (this.isInput && e.keyCode === 13) {
				this.complete('accepted');
				this.$trigger.blur();
			} else if (e.keyCode === 27) {
				this.complete('exited');
				this.$trigger.blur();
			}
		},

		destroy: function destroy() {
			this.$element.remove();
			// remove any external bindings
			$(document).off('click.fu.picker.externalClick.' + this.clickStamp);
			// empty elements to return to original markup
			// [none]
			// return string of markup
			return this.$element[0].outerHTML;
		},

		disable: function disable() {
			this.$element.addClass('disabled');
			this.$trigger.attr('disabled', 'disabled');
		},

		enable: function enable() {
			this.$element.removeClass('disabled');
			this.$trigger.removeAttr('disabled');
		},

		toggle: function toggle() {
			if (this.$element.hasClass('showing')) {
				this.hide();
			}else{
				this.show();
			}
		},

		hide: function hide() {
			if (!this.$element.hasClass('showing')) {
				return;
			}

			this.$element.removeClass('showing');
			$(document).off('click.fu.picker.externalClick.' + this.clickStamp);
			this.$element.trigger('hidden.fu.picker');
		},

		externalClickListener: function externalClickListener(e, force) {
			if (force === true || this.isExternalClick(e)) {
				this.complete('exited');
			}
		},

		isExternalClick: function isExternalClick(e) {
			var el = this.$element.get(0);
			var exceptions = this.options.externalClickExceptions || [];
			var $originEl = $(e.target);
			var i, l;

			if (e.target === el || $originEl.parents('.picker').get(0) === el) {
				return false;
			} else {
				for (i = 0, l = exceptions.length; i < l; i++) {
					if ($originEl.is(exceptions[i]) || $originEl.parents(exceptions[i]).length > 0) {
						return false;
					}

				}
			}

			return true;
		},

		show: function show() {
			var other;

			other = $(document).find('.picker.showing');
			if (other.length > 0) {
				if (other.data('fu.picker') && other.data('fu.picker').options.explicit) {
					return;
				}

				other.picker('externalClickListener', {}, true);
			}

			this.$element.addClass('showing');

			_display(this);

			this.$element.trigger('shown.fu.picker');

			this.clickStamp = new Date().getTime() + (Math.floor(Math.random() * 100) + 1);
			if (!this.options.explicit) {
				$(document).on('click.fu.picker.externalClick.' + this.clickStamp, langx.proxy(this.externalClickListener, this));
			}
		}
	});

	var _isOffscreen = function _isOffscreen(picker) {
		var windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		var scrollTop = $(document).scrollTop();
		var popupTop = picker.$popup.offset();
		var popupBottom = popupTop.top + picker.$popup.outerHeight(true);

		//if the bottom of the popup goes off the page, but the top does not, dropup.
		if (popupBottom > windowHeight + scrollTop || popupTop.top < scrollTop){
			return true;
		}else{//otherwise, prefer showing the top of the popup only vs the bottom
			return false;
		}
	};

	var _display = function _display(picker) {
		picker.$popup.css('visibility', 'hidden');

		_showBelow(picker);

		//if part of the popup is offscreen try to show it above
		if(_isOffscreen(picker)){
			_showAbove(picker);

			//if part of the popup is still offscreen, prefer cutting off the bottom
			if(_isOffscreen(picker)){
				_showBelow(picker);
			}
		}

		picker.$popup.css('visibility', 'visible');
	};

	var _showAbove = function _showAbove(picker) {
		picker.$popup.css('top', - picker.$popup.outerHeight(true) + 'px');
	};

	var _showBelow = function _showBelow(picker) {
		picker.$popup.css('top', picker.$trigger.outerHeight(true) + 'px');
	};


	// PLACARD PLUGIN DEFINITION

	$.fn.picker = function picker(option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.picker');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.picker', (data = new Picker(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.picker.defaults = {
		onAccept: undefined,
		onCancel: undefined,
		onExit: undefined,
		externalClickExceptions: [],
		explicit: false
	};

	$.fn.picker.Constructor = Picker;

	$.fn.picker.noConflict = function noConflict() {
		$.fn.picker = old;
		return this;
	};

	// DATA-API

	/*
	$(document).on('focus.fu.picker.data-api', '[data-initialize=picker]', function (e) {
		var $control = $(e.target).closest('.picker');
		if (!$control.data('fu.picker')) {
			$control.picker($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=picker]').each(function () {
			var $this = $(this);
			if ($this.data('fu.picker')) return;
			$this.picker($this.data());
		});
	});
	*/

	return $.fn.picker;
});

define('skylark-swt/pillbox',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt",
  "./dropdown-autoflip"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	// -- END UMD WRAPPER PREFACE --

	// -- BEGIN MODULE CODE HERE --

	var old = $.fn.pillbox;

	var CONST = sbswt.CONST;
	var COMMA_KEYCODE = CONST.COMMA_KEYCODE;
	var ENTER_KEYCODE = CONST.ENTER_KEYCODE;
	var isBackspaceKey = sbswt.isBackspaceKey;
	var isDeleteKey = sbswt.isDeleteKey;
	var isTabKey = sbswt.isTabKey;
	var isUpArrow = sbswt.isUpArrow;
	var isDownArrow = sbswt.isDownArrow;
	var cleanInput = sbswt.cleanInput;
	var isShiftHeld = sbswt.isShiftHeld;

	// PILLBOX CONSTRUCTOR AND PROTOTYPE

	var Pillbox = sbswt.Pillbox = sbswt.WidgetBase.inherit({
		klassName: "Pillbox",

		init : function(element,options) {
			this.$element = $(element);
			this.$moreCount = this.$element.find('.pillbox-more-count');
			this.$pillGroup = this.$element.find('.pill-group');
			this.$addItem = this.$element.find('.pillbox-add-item');
			this.$addItemWrap = this.$addItem.parent();
			this.$suggest = this.$element.find('.suggest');
			this.$pillHTML = '<li class="btn btn-default pill">' +
			'	<span></span>' +
			'	<span class="glyphicon glyphicon-close">' +
			'		<span class="sr-only">Remove</span>' +
			'	</span>' +
			'</li>';

			this.options = langx.mixin({}, $.fn.pillbox.defaults, options);

			if (this.options.readonly === -1) {
				if (this.$element.attr('data-readonly') !== undefined) {
					this.readonly(true);
				}
			} else if (this.options.readonly) {
				this.readonly(true);
			}

			// EVENTS
			this.acceptKeyCodes = this._generateObject(this.options.acceptKeyCodes);
			// Create an object out of the key code array, so we don't have to loop through it on every key stroke

			this.$element.on('click.fu.pillbox', '.pill-group > .pill', langx.proxy(this.itemClicked, this));
			this.$element.on('click.fu.pillbox', langx.proxy(this.inputFocus, this));
			this.$element.on('keydown.fu.pillbox', '.pillbox-add-item', langx.proxy(this.inputEvent, this));
			if (this.options.onKeyDown) {
				this.$element.on('mousedown.fu.pillbox', '.suggest > li', langx.proxy(this.suggestionClick, this));
			}

			if (this.options.edit) {
				this.$element.addClass('pills-editable');
				this.$element.on('blur.fu.pillbox', '.pillbox-add-item', langx.proxy(this.cancelEdit, this));
			}
			this.$element.on('blur.fu.pillbox', '.pillbox-add-item', langx.proxy(this.inputEvent, this));
		},

		destroy: function destroy () {
			this.$element.remove();
			// any external bindings
			// [none]
			// empty elements to return to original markup
			// [none]
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		items: function items () {
			var self = this;

			return this.$pillGroup.children('.pill').map(function getItemsData () {
				return self.getItemData($(this));
			}).get();
		},

		itemClicked: function itemClicked (e) {
			var $target = $(e.target);
			var $item;

			e.preventDefault();
			e.stopPropagation();
			this._closeSuggestions();

			if (!$target.hasClass('pill')) {
				$item = $target.parent();
				if (this.$element.attr('data-readonly') === undefined) {
					if ($target.hasClass('glyphicon-close')) {
						if (this.options.onRemove) {
							this.options.onRemove(this.getItemData($item, {
								el: $item
							}), langx.proxy(this._removeElement, this));
						} else {
							this._removeElement(this.getItemData($item, {
								el: $item
							}));
						}

						return false;
					} else if (this.options.edit) {
						if ($item.find('.pillbox-list-edit').length) {
							return false;
						}

						this.openEdit($item);
					}
				}
			} else {
				$item = $target;
			}

			this.$element.trigger('clicked.fu.pillbox', this.getItemData($item));

			return true;
		},

		readonly: function readonly (enable) {
			if (enable) {
				this.$element.attr('data-readonly', 'readonly');
			} else {
				this.$element.removeAttr('data-readonly');
			}

			if (this.options.truncate) {
				this.truncate(enable);
			}
		},

		suggestionClick: function suggestionClick (e) {
			var $item = $(e.currentTarget);
			var item = {
				text: $item.html(),
				value: $item.data('value')
			};

			e.preventDefault();
			this.$addItem.val('');

			if ($item.data('attr')) {
				item.attr = JSON.parse($item.data('attr'));
			}

			item.data = $item.data('data');

			this.addItems(item, true);

			// needs to be after addItems for IE
			this._closeSuggestions();
		},

		itemCount: function itemCount () {
			return this.$pillGroup.children('.pill').length;
		},

		// First parameter is 1 based index (optional, if index is not passed all new items will be appended)
		// Second parameter can be array of objects [{ ... }, { ... }] or you can pass n additional objects as args
		// object structure is as follows (attr and value are optional): { text: '', value: '', attr: {}, data: {} }
		addItems: function addItems () {
			var self = this;
			var items;
			var index;
			var isInternal;

			if (isFinite(String(arguments[0])) && !(arguments[0] instanceof Array)) {
				items = [].slice.call(arguments).slice(1);
				index = arguments[0];
			} else {
				items = [].slice.call(arguments).slice(0);
				isInternal = items[1] && !items[1].text;
			}

			// If first argument is an array, use that, otherwise they probably passed each thing through as a separate arg, so use items as-is
			if (items[0] instanceof Array) {
				items = items[0];
			}

			if (items.length) {
				langx.each(items, function normalizeItemsObject (i, value) {
					var data = {
						text: value.text,
						value: (value.value ? value.value : value.text),
						el: self.$pillHTML
					};

					if (value.attr) {
						data.attr = value.attr;
					}

					if (value.data) {
						data.data = value.data;
					}

					items[i] = data;
				});

				if (this.options.edit && this.currentEdit) {
					items[0].el = this.currentEdit.wrap('<div></div>').parent().html();
				}

				if (isInternal) {
					items.pop(1);
				}

				if (self.options.onAdd && isInternal) {
					if (this.options.edit && this.currentEdit) {
						self.options.onAdd(items[0], langx.proxy(self.saveEdit, this));
					} else {
						self.options.onAdd(items[0], langx.proxy(self.placeItems, this));
					}
				} else if (this.options.edit && this.currentEdit) {
					self.saveEdit(items);
				} else if (index) {
					self.placeItems(index, items);
				} else {
					self.placeItems(items, isInternal);
				}
			}
		},

		// First parameter is the index (1 based) to start removing items
		// Second parameter is the number of items to be removed
		removeItems: function removeItems (index, howMany) {
			var self = this;

			if (!index) {
				this.$pillGroup.find('.pill').remove();
				this._removePillTrigger({
					method: 'removeAll'
				});
			} else {
				var itemsToRemove = howMany ? howMany : 1;

				for (var item = 0; item < itemsToRemove; item++) {
					var $currentItem = self.$pillGroup.find('> .pill:nth-child(' + index + ')');

					if ($currentItem) {
						$currentItem.remove();
					} else {
						break;
					}
				}
			}
		},

		// First parameter is index (optional)
		// Second parameter is new arguments
		placeItems: function placeItems () {
			var items;
			var index;
			var $neighbor;
			var isInternal;

			if (isFinite(String(arguments[0])) && !(arguments[0] instanceof Array)) {
				items = [].slice.call(arguments).slice(1);
				index = arguments[0];
			} else {
				items = [].slice.call(arguments).slice(0);
				isInternal = items[1] && !items[1].text;
			}

			if (items[0] instanceof Array) {
				items = items[0];
			}

			if (items.length) {
				var newItems = [];
				langx.each(items, function prepareItemForAdd (i, item) {
					var $item = $(item.el);

					$item.attr('data-value', item.value);
					$item.find('span:first').html(item.text);

					// DOM attributes
					if (item.attr) {
						langx.each(item.attr, function handleDOMAttributes (key, value) {
							if (key === 'cssClass' || key === 'class') {
								$item.addClass(value);
							} else {
								$item.attr(key, value);
							}
						});
					}

					if (item.data) {
						$item.data('data', item.data);
					}

					newItems.push($item);
				});

				if (this.$pillGroup.children('.pill').length > 0) {
					if (index) {
						$neighbor = this.$pillGroup.find('.pill').eq(index);

						if ($neighbor.length) {
							$neighbor.before(newItems);
						} else {
							this.$pillGroup.children('.pill').last().after(newItems);
						}
					} else {
						this.$pillGroup.children('.pill').last().after(newItems);
					}
				} else {
					this.$pillGroup.prepend(newItems);
				}

				if (isInternal) {
					this.$element.trigger('added.fu.pillbox', {
						text: items[0].text,
						value: items[0].value
					});
				}
			}
		},

		inputEvent: function inputEvent (e) {
			var self = this;
			var text = self.options.cleanInput(this.$addItem.val());
			var isFocusOutEvent = e.type === 'focusout';
			var blurredAfterInput = (isFocusOutEvent && text.length > 0);
			// If we test for keycode only, it will match for `<` & `,` instead of just `,`
			// This way users can type `<3` and `1 < 3`, etc...
			var acceptKeyPressed = (this.acceptKeyCodes[e.keyCode] && !isShiftHeld(e));

			if (acceptKeyPressed || blurredAfterInput) {
				var attr;
				var value;

				if (this.options.onKeyDown && this._isSuggestionsOpen()) {
					var $selection = this.$suggest.find('.pillbox-suggest-sel');

					if ($selection.length) {
						text = self.options.cleanInput($selection.html());
						value = self.options.cleanInput($selection.data('value'));
						attr = $selection.data('attr');
					}
				}

				// ignore comma and make sure text that has been entered (protects against " ,". https://github.com/ExactTarget/fuelux/issues/593), unless allowEmptyPills is true.
				if (text.replace(/[ ]*\,[ ]*/, '').match(/\S/) || (this.options.allowEmptyPills && text.length)) {
					this._closeSuggestions();
					this.$addItem.val('').hide();

					if (attr) {
						this.addItems({
							text: text,
							value: value,
							attr: JSON.parse(attr)
						}, true);
					} else {
						this.addItems({
							text: text,
							value: value
						}, true);
					}

					setTimeout(function clearAddItemInput () {
						self.$addItem.show().attr({
							size: 10
						}).focus();
					}, 0);
				}

				e.preventDefault();
				return true;
			} else if (isBackspaceKey(e) || isDeleteKey(e)) {
				if (!text.length) {
					e.preventDefault();

					if (this.options.edit && this.currentEdit) {
						this.cancelEdit();
						return true;
					}

					this._closeSuggestions();
					var $lastItem = this.$pillGroup.children('.pill:last');

					if ($lastItem.hasClass('pillbox-highlight')) {
						this._removeElement(this.getItemData($lastItem, {
							el: $lastItem
						}));
					} else {
						$lastItem.addClass('pillbox-highlight');
					}

					return true;
				}
			} else if (text.length > 10) {
				if (this.$addItem.width() < (this.$pillGroup.width() - 6)) {
					this.$addItem.attr({
						size: text.length + 3
					});
				}
			}

			this.$pillGroup.find('.pill').removeClass('pillbox-highlight');

			if (this.options.onKeyDown && !isFocusOutEvent) {
				if (
					isTabKey(e) ||
					isUpArrow(e) ||
					isDownArrow(e)
				) {
					if (this._isSuggestionsOpen()) {
						this._keySuggestions(e);
					}

					return true;
				}

				// only allowing most recent event callback to register
				this.callbackId = e.timeStamp;
				this.options.onKeyDown({
					event: e,
					value: text
				}, function callOpenSuggestions (data) {
					self._openSuggestions(e, data);
				});
			}

			return true;
		},

		openEdit: function openEdit (el) {
			var targetChildIndex = el.index() + 1;
			var $addItemWrap = this.$addItemWrap.detach().hide();

			this.$pillGroup.find('.pill:nth-child(' + targetChildIndex + ')').before($addItemWrap);
			this.currentEdit = el.detach();

			$addItemWrap.addClass('editing');
			this.$addItem.val(el.find('span:first').html());
			$addItemWrap.show();
			this.$addItem.focus().select();
		},

		cancelEdit: function cancelEdit (e) {
			var $addItemWrap;
			if (!this.currentEdit) {
				return false;
			}

			this._closeSuggestions();
			if (e) {
				this.$addItemWrap.before(this.currentEdit);
			}

			this.currentEdit = false;

			$addItemWrap = this.$addItemWrap.detach();
			$addItemWrap.removeClass('editing');
			this.$addItem.val('');
			this.$pillGroup.append($addItemWrap);

			return true;
		},

		// Must match syntax of placeItem so addItem callback is called when an item is edited
		// expecting to receive an array back from the callback containing edited items
		saveEdit: function saveEdit () {
			var item = arguments[0][0] ? arguments[0][0] : arguments[0];

			this.currentEdit = $(item.el);
			this.currentEdit.data('value', item.value);
			this.currentEdit.find('span:first').html(item.text);

			this.$addItemWrap.hide();
			this.$addItemWrap.before(this.currentEdit);
			this.currentEdit = false;

			this.$addItem.val('');
			this.$addItemWrap.removeClass('editing');
			this.$pillGroup.append(this.$addItemWrap.detach().show());
			this.$element.trigger('edited.fu.pillbox', {
				value: item.value,
				text: item.text
			});
		},

		removeBySelector: function removeBySelector () {
			var selectors = [].slice.call(arguments).slice(0);
			var self = this;

			langx.each(selectors, function doRemove (i, sel) {
				self.$pillGroup.find(sel).remove();
			});

			this._removePillTrigger({
				method: 'removeBySelector',
				removedSelectors: selectors
			});
		},

		removeByValue: function removeByValue () {
			var values = [].slice.call(arguments).slice(0);
			var self = this;

			langx.each(values, function doRemove (i, val) {
				self.$pillGroup.find('> .pill[data-value="' + val + '"]').remove();
			});

			this._removePillTrigger({
				method: 'removeByValue',
				removedValues: values
			});
		},

		removeByText: function removeByText () {
			var text = [].slice.call(arguments).slice(0);
			var self = this;

			langx.each(text, function doRemove (i, matchingText) {
				self.$pillGroup.find('> .pill:contains("' + matchingText + '")').remove();
			});

			this._removePillTrigger({
				method: 'removeByText',
				removedText: text
			});
		},

		truncate: function truncate (enable) {
			var self = this;

			this.$element.removeClass('truncate');
			this.$addItemWrap.removeClass('truncated');
			this.$pillGroup.find('.pill').removeClass('truncated');

			if (enable) {
				this.$element.addClass('truncate');

				var availableWidth = this.$element.width();
				var containerFull = false;
				var processedPills = 0;
				var totalPills = this.$pillGroup.find('.pill').length;
				var widthUsed = 0;

				this.$pillGroup.find('.pill').each(function processPills () {
					var pill = $(this);
					if (!containerFull) {
						processedPills++;
						self.$moreCount.text(totalPills - processedPills);
						if ((widthUsed + pill.outerWidth(true) + self.$addItemWrap.outerWidth(true)) <= availableWidth) {
							widthUsed += pill.outerWidth(true);
						} else {
							self.$moreCount.text((totalPills - processedPills) + 1);
							pill.addClass('truncated');
							containerFull = true;
						}
					} else {
						pill.addClass('truncated');
					}
				});
				if (processedPills === totalPills) {
					this.$addItemWrap.addClass('truncated');
				}
			}
		},

		inputFocus: function inputFocus () {
			this.$element.find('.pillbox-add-item').focus();
		},

		getItemData: function getItemData (el, data) {
			return langx.mixin({
				text: el.find('span:first').html()
			}, el.data(), data);
		},

		_removeElement: function _removeElement (data) {
			data.el.remove();
			delete data.el;
			this.$element.trigger('removed.fu.pillbox', data);
		},

		_removePillTrigger: function _removePillTrigger (removedBy) {
			this.$element.trigger('removed.fu.pillbox', removedBy);
		},

		_generateObject: function _generateObject (data) {
			var obj = {};

			langx.each(data, function setObjectValue (index, value) {
				obj[value] = true;
			});

			return obj;
		},

		_openSuggestions: function _openSuggestions (e, data) {
			var $suggestionList = $('<ul>');

			if (this.callbackId !== e.timeStamp) {
				return false;
			}

			if (data.data && data.data.length) {
				langx.each(data.data, function appendSuggestions (index, value) {
					var val = value.value ? value.value : value.text;

					// markup concatentation is 10x faster, but does not allow data store
					var $suggestion = $('<li data-value="' + val + '">' + value.text + '</li>');

					if (value.attr) {
						$suggestion.data('attr', JSON.stringify(value.attr));
					}

					if (value.data) {
						$suggestion.data('data', value.data);
					}

					$suggestionList.append($suggestion);
				});

				// suggestion dropdown
				this.$suggest.html('').append($suggestionList.children());
				$(document).trigger('suggested.fu.pillbox', this.$suggest);
			}

			return true;
		},

		_closeSuggestions: function _closeSuggestions () {
			this.$suggest.html('').parent().removeClass('open');
		},

		_isSuggestionsOpen: function _isSuggestionsOpen () {
			return this.$suggest.parent().hasClass('open');
		},

		_keySuggestions: function _keySuggestions (e) {
			var $first = this.$suggest.find('li.pillbox-suggest-sel');
			var dir = isUpArrow(e);

			e.preventDefault();

			if (!$first.length) {
				$first = this.$suggest.find('li:first');
				$first.addClass('pillbox-suggest-sel');
			} else {
				var $next = dir ? $first.prev() : $first.next();

				if (!$next.length) {
					$next = dir ? this.$suggest.find('li:last') : this.$suggest.find('li:first');
				}

				if ($next) {
					$next.addClass('pillbox-suggest-sel');
					$first.removeClass('pillbox-suggest-sel');
				}
			}
		}
	});


	Pillbox.prototype.getValue = Pillbox.prototype.items;

	// PILLBOX PLUGIN DEFINITION

	$.fn.pillbox = function pillbox (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function set () {
			var $this = $(this);
			var data = $this.data('fu.pillbox');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.pillbox', (data = new Pillbox(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.pillbox.defaults = {
		edit: false,
		readonly: -1, // can be true or false. -1 means it will check for data-readonly="readonly"
		truncate: false,
		acceptKeyCodes: [
			ENTER_KEYCODE,
			COMMA_KEYCODE
		],
		allowEmptyPills: false,
		cleanInput: cleanInput

		// example on remove
		/* onRemove: function(data,callback){
			console.log('onRemove');
			callback(data);
		} */

		// example on key down
		/* onKeyDown: function(event, data, callback ){
			callback({data:[
				{text: Math.random(),value:'sdfsdfsdf'},
				{text: Math.random(),value:'sdfsdfsdf'}
			]});
		}
		*/
		// example onAdd
		/* onAdd: function( data, callback ){
			console.log(data, callback);
			callback(data);
		} */
	};

	$.fn.pillbox.Constructor = Pillbox;

	$.fn.pillbox.noConflict = function noConflict () {
		$.fn.pillbox = old;
		return this;
	};


	// DATA-API

	/*
	$(document).on('mousedown.fu.pillbox.data-api', '[data-initialize=pillbox]', function dataAPI (e) {
		var $control = $(e.target).closest('.pillbox');
		if (!$control.data('fu.pillbox')) {
			$control.pillbox($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function DOMReady () {
		$('[data-initialize=pillbox]').each(function init () {
			var $this = $(this);
			if ($this.data('fu.pillbox')) return;
			$this.pillbox($this.data());
		});
	});
	*/

	return $.fn.pillbox;
});

define('skylark-swt/placard',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.placard;
	var EVENT_CALLBACK_MAP = { 'accepted': 'onAccept', 'cancelled': 'onCancel' };


	// PLACARD CONSTRUCTOR AND PROTOTYPE

	var Placard = sbswt.Placard = sbswt.WidgetBase.inherit({
		klassName: "Placard",

		init : function(element,options) {
			var self = this;
			this.$element = $(element);
			this.options = langx.mixin({}, $.fn.placard.defaults, options);

			if(this.$element.attr('data-ellipsis') === 'true'){
				this.options.applyEllipsis = true;
			}

			this.$accept = this.$element.find('.placard-accept');
			this.$cancel = this.$element.find('.placard-cancel');
			this.$field = this.$element.find('.placard-field');
			this.$footer = this.$element.find('.placard-footer');
			this.$header = this.$element.find('.placard-header');
			this.$popup = this.$element.find('.placard-popup');

			this.actualValue = null;
			this.clickStamp = '_';
			this.previousValue = '';
			if (this.options.revertOnCancel === -1) {
				this.options.revertOnCancel = (this.$accept.length > 0);
			}

			// Placard supports inputs, textareas, or contenteditable divs. These checks determine which is being used
			this.isContentEditableDiv = this.$field.is('div');
			this.isInput = this.$field.is('input');
			this.divInTextareaMode = (this.isContentEditableDiv && this.$field.attr('data-textarea') === 'true');

			this.$field.on('focus.fu.placard', langx.proxy(this.show, this));
			this.$field.on('keydown.fu.placard', langx.proxy(this.keyComplete, this));
			this.$element.on('close.fu.placard', langx.proxy(this.hide, this));
			this.$accept.on('click.fu.placard', langx.proxy(this.complete, this, 'accepted'));
			this.$cancel.on('click.fu.placard', function (e) {
				e.preventDefault(); self.complete('cancelled');
			});

			this.applyEllipsis();
		},

		complete: function complete(action) {
			var func = this.options[ EVENT_CALLBACK_MAP[action] ];

			var obj = {
				previousValue: this.previousValue,
				value: this.getValue()
			};

			if (func) {
				func(obj);
				this.$element.trigger(action + '.fu.placard', obj);
			} else {
				if (action === 'cancelled' && this.options.revertOnCancel) {
					this.setValue(this.previousValue, true);
				}

				this.$element.trigger(action + '.fu.placard', obj);
				this.hide();
			}
		},

		keyComplete: function keyComplete(e) {
			if (((this.isContentEditableDiv && !this.divInTextareaMode) || this.isInput) && e.keyCode === 13) {
				this.complete('accepted');
				this.$field.blur();
			} else if (e.keyCode === 27) {
				this.complete('cancelled');
				this.$field.blur();
			}
		},

		destroy: function destroy() {
			this.$element.remove();
			// remove any external bindings
			$(document).off('click.fu.placard.externalClick.' + this.clickStamp);
			// set input value attribute
			this.$element.find('input').each(function () {
				$(this).attr('value', $(this).val());
			});
			// empty elements to return to original markup
			// [none]
			// return string of markup
			return this.$element[0].outerHTML;
		},

		disable: function disable() {
			this.$element.addClass('disabled');
			this.$field.attr('disabled', 'disabled');
			if (this.isContentEditableDiv) {
				this.$field.removeAttr('contenteditable');
			}
			this.hide();
		},

		applyEllipsis: function applyEllipsis() {
			var field, i, str;
			if (this.options.applyEllipsis) {
				field = this.$field.get(0);
				if ((this.isContentEditableDiv && !this.divInTextareaMode) || this.isInput) {
					field.scrollLeft = 0;
				} else {
					field.scrollTop = 0;
					if (field.clientHeight < field.scrollHeight) {
						this.actualValue = this.getValue();
						this.setValue('', true);
						str = '';
						i = 0;
						while (field.clientHeight >= field.scrollHeight) {
							str += this.actualValue[i];
							this.setValue(str + '...', true);
							i++;
						}
						str = (str.length > 0) ? str.substring(0, str.length - 1) : '';
						this.setValue(str + '...', true);
					}
				}

			}
		},

		enable: function enable() {
			this.$element.removeClass('disabled');
			this.$field.removeAttr('disabled');
			if (this.isContentEditableDiv) {
				this.$field.attr('contenteditable', 'true');
			}
		},

		externalClickListener: function externalClickListener(e, force) {
			if (force === true || this.isExternalClick(e)) {
				this.complete(this.options.externalClickAction);
			}
		},

		getValue: function getValue() {
			if (this.actualValue !== null) {
				return this.actualValue;
			} else if (this.isContentEditableDiv) {
				return this.$field.html();
			} else {
				return this.$field.val();
			}
		},

		hide: function hide() {
			if (!this.$element.hasClass('showing')) {
				return;
			}

			this.$element.removeClass('showing');
			this.applyEllipsis();
			$(document).off('click.fu.placard.externalClick.' + this.clickStamp);
			this.$element.trigger('hidden.fu.placard');
		},

		isExternalClick: function isExternalClick(e) {
			var el = this.$element.get(0);
			var exceptions = this.options.externalClickExceptions || [];
			var $originEl = $(e.target);
			var i, l;

			if (noder.contains(el,e.target)) {
				return false;
			} else {
				for (i = 0, l = exceptions.length; i < l; i++) {
					if ($originEl.is(exceptions[i]) || $originEl.parents(exceptions[i]).length > 0) {
						return false;
					}

				}
			}

			return true;
		},

		/**
		 * setValue() sets the Placard triggering DOM element's display value
		 *
		 * @param {String} the value to be displayed
		 * @param {Boolean} If you want to explicitly suppress the application
		 *					of ellipsis, pass `true`. This would typically only be
		 *					done from internal functions (like `applyEllipsis`)
		 *					that want to avoid circular logic. Otherwise, the
		 *					value of the option applyEllipsis will be used.
		 * @return {Object} jQuery object representing the DOM element whose
		 *					value was set
		 */
		setValue: function setValue(val, suppressEllipsis) {
			//if suppressEllipsis is undefined, check placards init settings
			if (typeof suppressEllipsis === 'undefined') {
				suppressEllipsis = !this.options.applyEllipsis;
			}

			if (this.isContentEditableDiv) {
				this.$field.empty().append(val);
			} else {
				this.$field.val(val);
			}

			if (!suppressEllipsis && !_isShown(this)) {
				this.applyEllipsis();
			}

			return this.$field;
		},

		show: function show() {
			if (_isShown(this)) { return; }
			if (!_closeOtherPlacards()) { return; }

			this.previousValue = (this.isContentEditableDiv) ? this.$field.html() : this.$field.val();

			if (this.actualValue !== null) {
				this.setValue(this.actualValue, true);
				this.actualValue = null;
			}

			this.showPlacard();
		},

		showPlacard: function showPlacard() {
			this.$element.addClass('showing');

			if (this.$header.length > 0) {
				this.$popup.css('top', '-' + this.$header.outerHeight(true) + 'px');
			}

			if (this.$footer.length > 0) {
				this.$popup.css('bottom', '-' + this.$footer.outerHeight(true) + 'px');
			}

			this.$element.trigger('shown.fu.placard');
			this.clickStamp = new Date().getTime() + (Math.floor(Math.random() * 100) + 1);
			if (!this.options.explicit) {
				$(document).on('click.fu.placard.externalClick.' + this.clickStamp, langx.proxy(this.externalClickListener, this));
			}
		}
		
	});

	var _isShown = function _isShown(placard) {
		return placard.$element.hasClass('showing');
	};

	var _closeOtherPlacards = function _closeOtherPlacards() {
		var otherPlacards;

		otherPlacards = $(document).find('.placard.showing');
		if (otherPlacards.length > 0) {
			if (otherPlacards.data('fu.placard') && otherPlacards.data('fu.placard').options.explicit) {
				return false;//failed
			}

			otherPlacards.placard('externalClickListener', {}, true);
		}

		return true;//succeeded
	};


	// PLACARD PLUGIN DEFINITION

	$.fn.placard = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.placard');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.placard', (data = new Placard(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.placard.defaults = {
		onAccept: undefined,
		onCancel: undefined,
		externalClickAction: 'cancelled',
		externalClickExceptions: [],
		explicit: false,
		revertOnCancel: -1,//negative 1 will check for an '.placard-accept' button. Also can be set to true or false
		applyEllipsis: false
	};

	$.fn.placard.Constructor = Placard;

	$.fn.placard.noConflict = function () {
		$.fn.placard = old;
		return this;
	};

	/*
	// DATA-API
	$(document).on('focus.fu.placard.data-api', '[data-initialize=placard]', function (e) {
		var $control = $(e.target).closest('.placard');
		if (!$control.data('fu.placard')) {
			$control.placard($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=placard]').each(function () {
			var $this = $(this);
			if ($this.data('fu.placard')) return;
			$this.placard($this.data());
		});
	});
	*/
});

define('skylark-swt/tooltip',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: tooltip.js v3.3.7
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = sbswt.Tooltip = sbswt.WidgetBase.inherit({
    klassName: "Tooltip",

    init : function(element,options) {
      this.type       = null
      this.options    = null
      this.enabled    = null
      this.timeout    = null
      this.hoverState = null
      this.$element   = null
      this.inState    = null

      this.enabled   = true;
      this.type      = 'tooltip';
      this.$element  = $(element)
      this.options   = this.getOptions(options)
      this.$viewport = this.options.viewport && $(langx.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : (this.options.viewport.selector || this.options.viewport))
      this.inState   = { click: false, hover: false, focus: false }

      if (this.$element[0] instanceof document.constructor && !this.options.selector) {
        throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
      }

      var triggers = this.options.trigger.split(' ')

      for (var i = triggers.length; i--;) {
        var trigger = triggers[i]

        if (trigger == 'click') {
          this.$element.on('click.' + this.type, this.options.selector, langx.proxy(this.toggle, this))
        } else if (trigger != 'manual') {
          var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
          var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

          this.$element.on(eventIn  + '.' + this.type, this.options.selector, langx.proxy(this.enter, this))
          this.$element.on(eventOut + '.' + this.type, this.options.selector, langx.proxy(this.leave, this))
        }
      }

      this.options.selector ?
        (this._options = langx.mixin({}, this.options, { trigger: 'manual', selector: '' })) :
        this.fixTitle()
    },

    getDefaults : function () {
      return Tooltip.DEFAULTS
    },

    getOptions : function (options) {
      options = langx.mixin({}, this.getDefaults(), this.$element.data(), options)

      if (options.delay && typeof options.delay == 'number') {
        options.delay = {
          show: options.delay,
          hide: options.delay
        }
      }

      return options
    },

    getDelegateOptions : function () {
      var options  = {}
      var defaults = this.getDefaults()

      this._options && langx.each(this._options, function (key, value) {
        if (defaults[key] != value) options[key] = value
      })

      return options
    },

    enter : function (obj) {
      var self = obj instanceof this.constructor ?
        obj : $(obj.currentTarget).data('bs.' + this.type)

      if (!self) {
        self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
        $(obj.currentTarget).data('bs.' + this.type, self)
      }

      if (obj instanceof eventer.create) {
        self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true
      }

      if (self.tip().hasClass('in') || self.hoverState == 'in') {
        self.hoverState = 'in'
        return
      }

      clearTimeout(self.timeout)

      self.hoverState = 'in'

      if (!self.options.delay || !self.options.delay.show) return self.show()

      self.timeout = setTimeout(function () {
        if (self.hoverState == 'in') self.show()
      }, self.options.delay.show)
    },

    isInStateTrue : function () {
      for (var key in this.inState) {
        if (this.inState[key]) return true
      }

      return false
    },

    leave : function (obj) {
      var self = obj instanceof this.constructor ?
        obj : $(obj.currentTarget).data('bs.' + this.type)

      if (!self) {
        self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
        $(obj.currentTarget).data('bs.' + this.type, self)
      }

      if (obj instanceof eventer.create) {
        self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false
      }

      if (self.isInStateTrue()) return

      clearTimeout(self.timeout)

      self.hoverState = 'out'

      if (!self.options.delay || !self.options.delay.hide) return self.hide()

      self.timeout = setTimeout(function () {
        if (self.hoverState == 'out') self.hide()
      }, self.options.delay.hide)
    },

    show : function () {
      var e = eventer.create('show.bs.' + this.type)

      if (this.hasContent() && this.enabled) {
        this.$element.trigger(e)

        var inDom = noder.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
        if (e.isDefaultPrevented() || !inDom) return
        var that = this

        var $tip = this.tip()

        var tipId = this.getUID(this.type)

        this.setContent()
        $tip.attr('id', tipId)
        this.$element.attr('aria-describedby', tipId)

        if (this.options.animation) $tip.addClass('fade')

        var placement = typeof this.options.placement == 'function' ?
          this.options.placement.call(this, $tip[0], this.$element[0]) :
          this.options.placement

        var autoToken = /\s?auto?\s?/i
        var autoPlace = autoToken.test(placement)
        if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

        $tip
          .detach()
          .css({ top: 0, left: 0, display: 'block' })
          .addClass(placement)
          .data('bs.' + this.type, this)

        this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)
        this.$element.trigger('inserted.bs.' + this.type)

        var pos          = this.getPosition()
        var actualWidth  = $tip[0].offsetWidth
        var actualHeight = $tip[0].offsetHeight

        if (autoPlace) {
          var orgPlacement = placement
          var viewportDim = this.getPosition(this.$viewport)

          placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top'    :
                      placement == 'top'    && pos.top    - actualHeight < viewportDim.top    ? 'bottom' :
                      placement == 'right'  && pos.right  + actualWidth  > viewportDim.width  ? 'left'   :
                      placement == 'left'   && pos.left   - actualWidth  < viewportDim.left   ? 'right'  :
                      placement

          $tip
            .removeClass(orgPlacement)
            .addClass(placement)
        }

        var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

        this.applyPlacement(calculatedOffset, placement)

        var complete = function () {
          var prevHoverState = that.hoverState
          that.$element.trigger('shown.bs.' + that.type)
          that.hoverState = null

          if (prevHoverState == 'out') that.leave(that)
        }

        browser.support.transition && this.$tip.hasClass('fade') ?
          $tip
            .one('bsTransitionEnd', complete)
            .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
          complete()
      }
    },

    applyPlacement : function (offset, placement) {
      var $tip   = this.tip()
      var width  = $tip[0].offsetWidth
      var height = $tip[0].offsetHeight

      // manually read margins because getBoundingClientRect includes difference
      var marginTop = parseInt($tip.css('margin-top'), 10)
      var marginLeft = parseInt($tip.css('margin-left'), 10)

      // we must check for NaN for ie 8/9
      if (isNaN(marginTop))  marginTop  = 0
      if (isNaN(marginLeft)) marginLeft = 0

      offset.top  += marginTop
      offset.left += marginLeft

      // $.fn.offset doesn't round pixel values
      // so we use setOffset directly with our own function B-0
      //$.offset.setOffset($tip[0], langx.mixin({
       // using: function (props) {
       //   $tip.css({
       //     top: Math.round(props.top),
       //     left: Math.round(props.left)
       //   })
       /// }
      //}, offset), 0);

      geom.pagePosition($tip[0],offset);
      

      $tip.addClass('in')

      // check to see if placing tip in new offset caused the tip to resize itself
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (placement == 'top' && actualHeight != height) {
        offset.top = offset.top + height - actualHeight
      }

      var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

      if (delta.left) offset.left += delta.left
      else offset.top += delta.top

      var isVertical          = /top|bottom/.test(placement)
      var arrowDelta          = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
      var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

      $tip.offset(offset)
      this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
    },

    replaceArrow : function (delta, dimension, isVertical) {
      this.arrow()
        .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
        .css(isVertical ? 'top' : 'left', '')
    },

    setContent : function () {
      var $tip  = this.tip()
      var title = this.getTitle()

      $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
      $tip.removeClass('fade in top bottom left right')
    },

    hide : function (callback) {
      var that = this
      var $tip = $(this.$tip)
      var e    = eventer.create('hide.bs.' + this.type)

      function complete() {
        if (that.hoverState != 'in') $tip.detach()
        if (that.$element) { // TODO: Check whether guarding this code with this `if` is really necessary.
          that.$element
            .removeAttr('aria-describedby')
            .trigger('hidden.bs.' + that.type)
        }
        callback && callback()
      }

      this.$element.trigger(e)

      if (e.isDefaultPrevented()) return

      $tip.removeClass('in')

      browser.support.transition && $tip.hasClass('fade') ?
        $tip
          .one('bsTransitionEnd', complete)
          .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
        complete()

      this.hoverState = null

      return this
    },

    fixTitle : function () {
      var $e = this.$element
      if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
        $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
      }
    },

    hasContent : function () {
      return this.getTitle()
    },

    getPosition : function ($element) {
      $element   = $element || this.$element

      var el     = $element[0]
      var isBody = el.tagName == 'BODY'

      var elRect    = el.getBoundingClientRect()
      if (elRect.width == null) {
        // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
        elRect = langx.mixin({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top })
      }
      var isSvg = window.SVGElement && el instanceof window.SVGElement
      // Avoid using $.offset() on SVGs since it gives incorrect results in jQuery 3.
      // See https://github.com/twbs/bootstrap/issues/20280
      var elOffset  = isBody ? { top: 0, left: 0 } : (isSvg ? null : $element.offset())
      var scroll    = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() }
      var outerDims = isBody ? { width: $(window).width(), height: $(window).height() } : null

      return langx.mixin({}, elRect, scroll, outerDims, elOffset)
    },

    getCalculatedOffset : function (placement, pos, actualWidth, actualHeight) {
      return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2 } :
             placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
             placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
          /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }

    },

    getViewportAdjustedDelta : function (placement, pos, actualWidth, actualHeight) {
      var delta = { top: 0, left: 0 }
      if (!this.$viewport) return delta

      var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
      var viewportDimensions = this.getPosition(this.$viewport)

      if (/right|left/.test(placement)) {
        var topEdgeOffset    = pos.top - viewportPadding - viewportDimensions.scroll
        var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
        if (topEdgeOffset < viewportDimensions.top) { // top overflow
          delta.top = viewportDimensions.top - topEdgeOffset
        } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
          delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
        }
      } else {
        var leftEdgeOffset  = pos.left - viewportPadding
        var rightEdgeOffset = pos.left + viewportPadding + actualWidth
        if (leftEdgeOffset < viewportDimensions.left) { // left overflow
          delta.left = viewportDimensions.left - leftEdgeOffset
        } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
          delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
        }
      }

      return delta
    },

    getTitle : function () {
      var title
      var $e = this.$element
      var o  = this.options

      title = $e.attr('data-original-title')
        || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

      return title
    },

    getUID : function (prefix) {
      do prefix += ~~(Math.random() * 1000000)
      while (document.getElementById(prefix))
      return prefix
    },

    tip : function () {
      if (!this.$tip) {
        this.$tip = $(this.options.template)
        if (this.$tip.length != 1) {
          throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!')
        }
      }
      return this.$tip
    },

    arrow : function () {
      return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
    },

    enable : function () {
      this.enabled = true
    },

    disable : function () {
      this.enabled = false
    },

    toggleEnabled : function () {
      this.enabled = !this.enabled
    },

    toggle : function (e) {
      var self = this
      if (e) {
        self = $(e.currentTarget).data('bs.' + this.type)
        if (!self) {
          self = new this.constructor(e.currentTarget, this.getDelegateOptions())
          $(e.currentTarget).data('bs.' + this.type, self)
        }
      }

      if (e) {
        self.inState.click = !self.inState.click
        if (self.isInStateTrue()) self.enter(self)
        else self.leave(self)
      } else {
        self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
      }
    },

    destroy : function () {
      var that = this
      clearTimeout(this.timeout)
      this.hide(function () {
        that.$element.off('.' + that.type).removeData('bs.' + that.type)
        if (that.$tip) {
          that.$tip.detach()
        }
        that.$tip = null
        that.$arrow = null
        that.$viewport = null
        that.$element = null
      })
    }

  }); 



  Tooltip.VERSION  = '3.3.7'

  Tooltip.TRANSITION_DURATION = 150

  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    }
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tooltip

  $.fn.tooltip             = Plugin;
  $.fn.tooltip.Constructor = Tooltip;


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old;
    return this;
  }

  return $.fn.tooltip;

});

define('skylark-swt/popover',[
  "skylark-utils/browser",
  "skylark-utils/langx",
  "skylark-utils/eventer",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt",
  "./tooltip" 
],function(browser,langx,eventer,velm,$,sbswt,tooltip){
/* ========================================================================
 * Bootstrap: popover.js v3.3.7
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = sbswt.Popover = tooltip.Constructor.inherit({
    klassName: "Popover",

    init : function(element,options) {
      this.overrided(element,options);
      this.type = "popover";
    },
    getDefaults : function () {
      return Popover.DEFAULTS
    },

    setContent : function () {
      var $tip    = this.tip()
      var title   = this.getTitle()
      var content = this.getContent()

      $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
      $tip.find('.popover-content').children().detach().end()[ // we use append for html objects to maintain js events
        this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
      ](content)

      $tip.removeClass('fade top bottom left right in')

      // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
      // this manually by checking the contents.
      if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
    },

    hasContent : function () {
      return this.getTitle() || this.getContent()
    },

    getContent : function () {
      var $e = this.$element
      var o  = this.options

      return $e.attr('data-content')
        || (typeof o.content == 'function' ?
              o.content.call($e[0]) :
              o.content)
    },

    arrow : function () {
      return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
    }

  });  

  Popover.VERSION  = '3.3.7'

  Popover.DEFAULTS = langx.mixin({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================


  // POPOVER PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.popover;

  $.fn.popover             = Plugin;
  $.fn.popover.Constructor = Popover;


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old
    return this
  };

  return $.fn.popover;
});

define('skylark-swt/radio',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.radio;

	// RADIO CONSTRUCTOR AND PROTOTYPE
	var logError = function logError (error) {
		if (window && window.console && window.console.error) {
			window.console.error(error);
		}
	};

	var Radio = sbswt.Radio = sbswt.WidgetBase.inherit({
		klassName: "Radio",

		init : function(element,options) {
			this.options = langx.mixin({}, $.fn.radio.defaults, options);

			if (element.tagName.toLowerCase() !== 'label') {
				logError('Radio must be initialized on the `label` that wraps the `input` element. See https://github.com/ExactTarget/fuelux/blob/master/reference/markup/radio.html for example of proper markup. Call `.radio()` on the `<label>` not the `<input>`');
				return;
			}

			// cache elements
			this.$label = $(element);
			this.$radio = this.$label.find('input[type="radio"]');
			this.groupName = this.$radio.attr('name'); // don't cache group itself since items can be added programmatically

			if (!this.options.ignoreVisibilityCheck && this.$radio.css('visibility').match(/hidden|collapse/)) {
				logError('For accessibility reasons, in order for tab and space to function on radio, `visibility` must not be set to `hidden` or `collapse`. See https://github.com/ExactTarget/fuelux/pull/1996 for more details.');
			}

			// determine if a toggle container is specified
			var containerSelector = this.$radio.attr('data-toggle');
			this.$toggleContainer = $(containerSelector);

			// handle internal events
			this.$radio.on('change', langx.proxy(this.itemchecked, this));

			// set default state
			this.setInitialState();
		},

		setInitialState: function setInitialState () {
			var $radio = this.$radio;

			// get current state of input
			var checked = $radio.prop('checked');
			var disabled = $radio.prop('disabled');

			// sync label class with input state
			this.setCheckedState($radio, checked);
			this.setDisabledState($radio, disabled);
		},

		resetGroup: function resetGroup () {
			var $radios = $('input[name="' + this.groupName + '"]');
			$radios.each(function resetRadio (index, item) {
				var $radio = $(item);
				var $lbl = $radio.parent();
				var containerSelector = $radio.attr('data-toggle');
				var $containerToggle = $(containerSelector);


				$lbl.removeClass('checked');
				$containerToggle.addClass('hidden');
			});
		},

		setCheckedState: function setCheckedState (element, checked) {
			var $radio = element;
			var $lbl = $radio.parent();
			var containerSelector = $radio.attr('data-toggle');
			var $containerToggle = $(containerSelector);

			if (checked) {
				// reset all items in group
				this.resetGroup();

				$radio.prop('checked', true);
				$lbl.addClass('checked');
				$containerToggle.removeClass('hide hidden');
				$lbl.trigger('checked.fu.radio');
			} else {
				$radio.prop('checked', false);
				$lbl.removeClass('checked');
				$containerToggle.addClass('hidden');
				$lbl.trigger('unchecked.fu.radio');
			}

			$lbl.trigger('changed.fu.radio', checked);
		},

		setDisabledState: function setDisabledState (element, disabled) {
			var $radio = $(element);
			var $lbl = this.$label;

			if (disabled) {
				$radio.prop('disabled', true);
				$lbl.addClass('disabled');
				$lbl.trigger('disabled.fu.radio');
			} else {
				$radio.prop('disabled', false);
				$lbl.removeClass('disabled');
				$lbl.trigger('enabled.fu.radio');
			}

			return $radio;
		},

		itemchecked: function itemchecked (evt) {
			var $radio = $(evt.target);
			this.setCheckedState($radio, true);
		},

		check: function check () {
			this.setCheckedState(this.$radio, true);
		},

		uncheck: function uncheck () {
			this.setCheckedState(this.$radio, false);
		},

		isChecked: function isChecked () {
			var checked = this.$radio.prop('checked');
			return checked;
		},

		enable: function enable () {
			this.setDisabledState(this.$radio, false);
		},

		disable: function disable () {
			this.setDisabledState(this.$radio, true);
		},

		destroy: function destroy () {
			this.$label.remove();
			return this.$label[0].outerHTML;
		}

	});


	Radio.prototype.getValue = Radio.prototype.isChecked;

	// RADIO PLUGIN DEFINITION

	$.fn.radio = function radio (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function applyData () {
			var $this = $(this);
			var data = $this.data('fu.radio');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.radio', (data = new Radio(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.radio.defaults = {
		ignoreVisibilityCheck: false
	};

	$.fn.radio.Constructor = Radio;

	$.fn.radio.noConflict = function noConflict () {
		$.fn.radio = old;
		return this;
	};


	// DATA-API
	/*
	$(document).on('mouseover.fu.radio.data-api', '[data-initialize=radio]', function initializeRadios (e) {
		var $control = $(e.target);
		if (!$control.data('fu.radio')) {
			$control.radio($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function onReadyInitializeRadios () {
		$('[data-initialize=radio]').each(function initializeRadio () {
			var $this = $(this);
			if (!$this.data('fu.radio')) {
				$this.radio($this.data());
			}
		});
	});
	*/

	return $.fn.radio;
});

define('skylark-swt/scrollspy',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: scrollspy.js v3.3.7
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // SCROLLSPY CLASS DEFINITION
  // ==========================

  var ScrollSpy = sbswt.ScrollSpy = sbswt.WidgetBase.inherit({
    klassName: "ScrollSpy",

    init : function(element,options) {
      this.$body          = $(document.body)
      this.$scrollElement = $(element).is(document.body) ? $(window) : $(element)
      this.options        = langx.mixin({}, ScrollSpy.DEFAULTS, options)
      this.selector       = (this.options.target || '') + ' .nav li > a'
      this.offsets        = []
      this.targets        = []
      this.activeTarget   = null
      this.scrollHeight   = 0

      this.$scrollElement.on('scroll.bs.scrollspy', langx.proxy(this.process, this))
      this.refresh()
      this.process()
    },

    getScrollHeight : function () {
      return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
    },

    refresh : function () {
      var that          = this
      var offsetMethod  = 'offset'
      var offsetBase    = 0

      this.offsets      = []
      this.targets      = []
      this.scrollHeight = this.getScrollHeight()

      if (!langx.isWindow(this.$scrollElement[0])) {
        offsetMethod = 'position'
        offsetBase   = this.$scrollElement.scrollTop()
      }

      this.$body
        .find(this.selector)
        .map(function () {
          var $el   = $(this)
          var href  = $el.data('target') || $el.attr('href')
          var $href = /^#./.test(href) && $(href)

          return ($href
            && $href.length
            && $href.is(':visible')
            && [[$href[offsetMethod]().top + offsetBase, href]]) || null
        })
        .sort(function (a, b) { return a[0] - b[0] })
        .each(function () {
          that.offsets.push(this[0])
          that.targets.push(this[1])
        })
    },

    process : function () {
      var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
      var scrollHeight = this.getScrollHeight()
      var maxScroll    = this.options.offset + scrollHeight - this.$scrollElement.height()
      var offsets      = this.offsets
      var targets      = this.targets
      var activeTarget = this.activeTarget
      var i

      if (this.scrollHeight != scrollHeight) {
        this.refresh()
      }

      if (scrollTop >= maxScroll) {
        return activeTarget != (i = targets[targets.length - 1]) && this.activate(i)
      }

      if (activeTarget && scrollTop < offsets[0]) {
        this.activeTarget = null
        return this.clear()
      }

      for (i = offsets.length; i--;) {
        activeTarget != targets[i]
          && scrollTop >= offsets[i]
          && (offsets[i + 1] === undefined || scrollTop < offsets[i + 1])
          && this.activate(targets[i])
      }
    },

    activate : function (target) {
      this.activeTarget = target

      this.clear()

      var selector = this.selector +
        '[data-target="' + target + '"],' +
        this.selector + '[href="' + target + '"]'

      var active = $(selector)
        .parents('li')
        .addClass('active')

      if (active.parent('.dropdown-menu').length) {
        active = active
          .closest('li.dropdown')
          .addClass('active')
      }

      active.trigger('activate.bs.scrollspy')
    },

    clear : function () {
      $(this.selector)
        .parentsUntil(this.options.target, '.active')
        .removeClass('active')
    }

  });

  ScrollSpy.VERSION  = '3.3.7'

  ScrollSpy.DEFAULTS = {
    offset: 10
  }

  // SCROLLSPY PLUGIN DEFINITION
  // ===========================
  var old = $.fn.scrollspy;

  $.fn.scrollspy = function scrollspy(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.scrollspy')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }


  $.fn.scrollspy.Constructor = ScrollSpy;


  // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old;
    return this;
  }


  // SCROLLSPY DATA-API
  // ==================
  /*
  $(window).on('load.bs.scrollspy.data-api', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      Plugin.call($spy, $spy.data())
    })
  })
  */

  return $.fn.scrollspy;

});

define('skylark-swt/search',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.search;

	// SEARCH CONSTRUCTOR AND PROTOTYPE

	var Search = sbswt.Search = sbswt.WidgetBase.inherit({
		klassName: "Search",

		init : function(element,options) {
			this.$element = $(element);
			this.$repeater = $(element).closest('.repeater');
			this.options = langx.mixin({}, $.fn.search.defaults, options);

			if (this.$element.attr('data-searchOnKeyPress') === 'true'){
				this.options.searchOnKeyPress = true;
			}

			this.$button = this.$element.find('button');
			this.$input = this.$element.find('input');
			this.$icon = this.$element.find('.glyphicon, .fuelux-icon');

			this.$button.on('click.fu.search', langx.proxy(this.buttonclicked, this));
			this.$input.on('keyup.fu.search', langx.proxy(this.keypress, this));

			if (this.$repeater.length > 0) {
				this.$repeater.on('rendered.fu.repeater', langx.proxy(this.clearPending, this));
			}

			this.activeSearch = '';
		},
		destroy: function () {
			this.$element.remove();
			// any external bindings
			// [none]
			// set input value attrbute
			this.$element.find('input').each(function () {
				$(this).attr('value', $(this).val());
			});
			// empty elements to return to original markup
			// [none]
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		search: function (searchText) {
			if (this.$icon.hasClass('glyphicon')) {
				this.$icon.removeClass('glyphicon-search').addClass('glyphicon-remove');
			}
			if (this.$icon.hasClass('fuelux-icon')) {
				this.$icon.removeClass('fuelux-icon-search').addClass('fuelux-icon-remove');
			}

			this.activeSearch = searchText;
			this.$element.addClass('searched pending');
			this.$element.trigger('searched.fu.search', searchText);
		},

		clear: function () {
			if (this.$icon.hasClass('glyphicon')) {
				this.$icon.removeClass('glyphicon-remove').addClass('glyphicon-search');
			}
			if (this.$icon.hasClass('fuelux-icon')) {
				this.$icon.removeClass('fuelux-icon-remove').addClass('fuelux-icon-search');
			}

			if (this.$element.hasClass('pending')) {
				this.$element.trigger('canceled.fu.search');
			}

			this.activeSearch = '';
			this.$input.val('');
			this.$element.trigger('cleared.fu.search');
			this.$element.removeClass('searched pending');
		},

		clearPending: function () {
			this.$element.removeClass('pending');
		},

		action: function () {
			var val = this.$input.val();

			if (val && val.length > 0) {
				this.search(val);
			} else {
				this.clear();
			}
		},

		buttonclicked: function (e) {
			e.preventDefault();
			if ($(e.currentTarget).is('.disabled, :disabled')) return;

			if (this.$element.hasClass('pending') || this.$element.hasClass('searched')) {
				this.clear();
			} else {
				this.action();
			}
		},

		keypress: function (e) {
			var ENTER_KEY_CODE = 13;
			var TAB_KEY_CODE = 9;
			var ESC_KEY_CODE = 27;

			if (e.which === ENTER_KEY_CODE) {
				e.preventDefault();
				this.action();
			} else if (e.which === TAB_KEY_CODE) {
				e.preventDefault();
			} else if (e.which === ESC_KEY_CODE) {
				e.preventDefault();
				this.clear();
			} else if (this.options.searchOnKeyPress) {
				// search on other keypress
				this.action();
			}
		},

		disable: function () {
			this.$element.addClass('disabled');
			this.$input.attr('disabled', 'disabled');

			if (!this.options.allowCancel) {
				this.$button.addClass('disabled');
			}
		},

		enable: function () {
			this.$element.removeClass('disabled');
			this.$input.removeAttr('disabled');
			this.$button.removeClass('disabled');
		}
	});

	// SEARCH PLUGIN DEFINITION

	$.fn.search = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.search');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.search', (data = new Search(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.search.defaults = {
		clearOnEmpty: false,
		searchOnKeyPress: false,
		allowCancel: false
	};

	$.fn.search.Constructor = Search;

	$.fn.search.noConflict = function () {
		$.fn.search = old;
		return this;
	};


	// DATA-API
	/*
	$(document).on('mousedown.fu.search.data-api', '[data-initialize=search]', function (e) {
		var $control = $(e.target).closest('.search');
		if (!$control.data('fu.search')) {
			$control.search($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=search]').each(function () {
			var $this = $(this);
			if ($this.data('fu.search')) return;
			$this.search($this.data());
		});
	});
	*/

	return 	$.fn.search;
});

define('skylark-swt/selectlist',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.selectlist;
	// SELECT CONSTRUCTOR AND PROTOTYPE

	var Selectlist = sbswt.Selectlist = sbswt.WidgetBase.inherit({
		klassName: "Selectlist",

		init : function(element,options) {
			this.$element = $(element);
			this.options = langx.mixin({}, $.fn.selectlist.defaults, options);


			this.$button = this.$element.find('.btn.dropdown-toggle');
			this.$hiddenField = this.$element.find('.hidden-field');
			this.$label = this.$element.find('.selected-label');
			this.$dropdownMenu = this.$element.find('.dropdown-menu');

			this.$button.dropdown();

			this.$element.on('click.fu.selectlist', '.dropdown-menu a', langx.proxy(this.itemClicked, this));
			this.setDefaultSelection();

			if (options.resize === 'auto' || this.$element.attr('data-resize') === 'auto') {
				this.resize();
			}

			// if selectlist is empty or is one item, disable it
			var items = this.$dropdownMenu.children('li');
			if( items.length === 0) {
				this.disable();
				this.doSelect( $(this.options.emptyLabelHTML));
			}

			// support jumping focus to first letter in dropdown when key is pressed
			this.$element.on('shown.bs.dropdown', function () {
					var $this = $(this);
					// attach key listener when dropdown is shown
					$(document).on('keypress.fu.selectlist', function(e){

						// get the key that was pressed
						var key = String.fromCharCode(e.which);
						// look the items to find the first item with the first character match and set focus
						$this.find("li").each(function(idx,item){
							if ($(item).text().charAt(0).toLowerCase() === key) {
								$(item).children('a').focus();
								return false;
							}
						});

				});
			});

			// unbind key event when dropdown is hidden
			this.$element.on('hide.bs.dropdown', function () {
					$(document).off('keypress.fu.selectlist');
			});
		},

		destroy: function () {
			this.$element.remove();
			// any external bindings
			// [none]
			// empty elements to return to original markup
			// [none]
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		doSelect: function ($item) {
			var $selectedItem;
			this.$selectedItem = $selectedItem = $item;

			this.$hiddenField.val(this.$selectedItem.attr('data-value'));
			this.$label.html($(this.$selectedItem.children()[0]).html());

			// clear and set selected item to allow declarative init state
			// unlike other controls, selectlist's value is stored internal, not in an input
			this.$element.find('li').each(function () {
				if ($selectedItem.is($(this))) {
					$(this).attr('data-selected', true);
				} else {
					$(this).removeData('selected').removeAttr('data-selected');
				}
			});
		},

		itemClicked: function (e) {
			this.$element.trigger('clicked.fu.selectlist', this.$selectedItem);

			e.preventDefault();
			// ignore if a disabled item is clicked
			if ($(e.currentTarget).parent('li').is('.disabled, :disabled')) { return; }

			// is clicked element different from currently selected element?
			if (!($(e.target).parent().is(this.$selectedItem))) {
				this.itemChanged(e);
			}

			// return focus to control after selecting an option
			this.$element.find('.dropdown-toggle').focus();
		},

		itemChanged: function (e) {
			//selectedItem needs to be <li> since the data is stored there, not in <a>
			this.doSelect($(e.target).closest('li'));

			// pass object including text and any data-attributes
			// to onchange event
			var data = this.selectedItem();
			// trigger changed event
			this.$element.trigger('changed.fu.selectlist', data);
		},

		resize: function () {
			var width = 0;
			var newWidth = 0;
			var sizer = $('<div/>').addClass('selectlist-sizer');


			if (Boolean($(document).find('html').hasClass('fuelux'))) {
				// default behavior for fuel ux setup. means fuelux was a class on the html tag
				$(document.body).append(sizer);
			} else {
				// fuelux is not a class on the html tag. So we'll look for the first one we find so the correct styles get applied to the sizer
				$('.fuelux:first').append(sizer);
			}

			sizer.append(this.$element.clone());

			this.$element.find('a').each(function () {
				sizer.find('.selected-label').text($(this).text());
				newWidth = sizer.find('.selectlist').outerWidth();
				newWidth = newWidth + sizer.find('.sr-only').outerWidth();
				if (newWidth > width) {
					width = newWidth;
				}
			});

			if (width <= 1) {
				return;
			}

			this.$button.css('width', width);
			this.$dropdownMenu.css('width', width);

			sizer.remove();
		},

		selectedItem: function () {
			var txt = this.$selectedItem.text();
			return langx.mixin({
				text: txt
			}, this.$selectedItem.data());
		},

		selectByText: function (text) {
			var $item = $([]);
			this.$element.find('li').each(function () {
				if ((this.textContent || this.innerText || $(this).text() || '').toLowerCase() === (text || '').toLowerCase()) {
					$item = $(this);
					return false;
				}
			});
			this.doSelect($item);
		},

		selectByValue: function (value) {
			var selector = 'li[data-value="' + value + '"]';
			this.selectBySelector(selector);
		},

		selectByIndex: function (index) {
			// zero-based index
			var selector = 'li:eq(' + index + ')';
			this.selectBySelector(selector);
		},

		selectBySelector: function (selector) {
			var $item = this.$element.find(selector);
			this.doSelect($item);
		},

		setDefaultSelection: function () {
			var $item = this.$element.find('li[data-selected=true]').eq(0);

			if ($item.length === 0) {
				$item = this.$element.find('li').has('a').eq(0);
			}

			this.doSelect($item);
		},

		enable: function () {
			this.$element.removeClass('disabled');
			this.$button.removeClass('disabled');
		},

		disable: function () {
			this.$element.addClass('disabled');
			this.$button.addClass('disabled');
		}

	});	


	Selectlist.prototype.getValue = Selectlist.prototype.selectedItem;


	// SELECT PLUGIN DEFINITION

	$.fn.selectlist = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.selectlist');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.selectlist', (data = new Selectlist(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.selectlist.defaults = {
		emptyLabelHTML: '<li data-value=""><a href="#">No items</a></li>'
	};

	$.fn.selectlist.Constructor = Selectlist;

	$.fn.selectlist.noConflict = function () {
		$.fn.selectlist = old;
		return this;
	};


	// DATA-API

	/*
	$(document).on('mousedown.fu.selectlist.data-api', '[data-initialize=selectlist]', function (e) {
		var $control = $(e.target).closest('.selectlist');
		if (!$control.data('fu.selectlist')) {
			$control.selectlist($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=selectlist]').each(function () {
			var $this = $(this);
			if (!$this.data('fu.selectlist')) {
				$this.selectlist($this.data());
			}
		});
	});

	*/

	return $.fn.selectlist;
});

define('skylark-swt/spinbox',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){


	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.spinbox;

	// SPINBOX CONSTRUCTOR AND PROTOTYPE

	var Spinbox = sbswt.Spinbox = sbswt.WidgetBase.inherit({
		klassName: "Spinbox",

		init : function(element,options) {
			this.$element = $(element);
			this.$element.find('.btn').on('click', function (e) {
				//keep spinbox from submitting if they forgot to say type="button" on their spinner buttons
				e.preventDefault();
			});
			this.options = langx.mixin({}, $.fn.spinbox.defaults, options);
			this.options.step = this.$element.data('step') || this.options.step;

			if (this.options.value < this.options.min) {
				this.options.value = this.options.min;
			} else if (this.options.max < this.options.value) {
				this.options.value = this.options.max;
			}

			this.$input = this.$element.find('.spinbox-input');
			this.$input.on('focusout.fu.spinbox', this.$input, langx.proxy(this.change, this));
			this.$element.on('keydown.fu.spinbox', this.$input, langx.proxy(this.keydown, this));
			this.$element.on('keyup.fu.spinbox', this.$input, langx.proxy(this.keyup, this));

			if (this.options.hold) {
				this.$element.on('mousedown.fu.spinbox', '.spinbox-up', langx.proxy(function () {
					this.startSpin(true);
				}, this));
				this.$element.on('mouseup.fu.spinbox', '.spinbox-up, .spinbox-down', langx.proxy(this.stopSpin, this));
				this.$element.on('mouseout.fu.spinbox', '.spinbox-up, .spinbox-down', langx.proxy(this.stopSpin, this));
				this.$element.on('mousedown.fu.spinbox', '.spinbox-down', langx.proxy(function () {
					this.startSpin(false);
				}, this));
			} else {
				this.$element.on('click.fu.spinbox', '.spinbox-up', langx.proxy(function () {
					this.step(true);
				}, this));
				this.$element.on('click.fu.spinbox', '.spinbox-down', langx.proxy(function () {
					this.step(false);
				}, this));
			}

			this.switches = {
				count: 1,
				enabled: true
			};

			if (this.options.speed === 'medium') {
				this.switches.speed = 300;
			} else if (this.options.speed === 'fast') {
				this.switches.speed = 100;
			} else {
				this.switches.speed = 500;
			}

			this.options.defaultUnit = _isUnitLegal(this.options.defaultUnit, this.options.units) ? this.options.defaultUnit : '';
			this.unit = this.options.defaultUnit;

			this.lastValue = this.options.value;

			this.render();

			if (this.options.disabled) {
				this.disable();
			}
		},

		destroy: function destroy() {
			this.$element.remove();
			// any external bindings
			// [none]
			// set input value attrbute
			this.$element.find('input').each(function () {
				$(this).attr('value', $(this).val());
			});
			// empty elements to return to original markup
			// [none]
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		render: function render() {
			this._setValue(this.getDisplayValue());
		},

		change: function change() {
			this._setValue(this.getDisplayValue());

			this.triggerChangedEvent();
		},

		stopSpin: function stopSpin() {
			if (this.switches.timeout !== undefined) {
				clearTimeout(this.switches.timeout);
				this.switches.count = 1;
				this.triggerChangedEvent();
			}
		},

		triggerChangedEvent: function triggerChangedEvent() {
			var currentValue = this.getValue();
			if (currentValue === this.lastValue) return;
			this.lastValue = currentValue;

			// Primary changed event
			this.$element.trigger('changed.fu.spinbox', currentValue);
		},

		startSpin: function startSpin(type) {
			if (!this.options.disabled) {
				var divisor = this.switches.count;

				if (divisor === 1) {
					this.step(type);
					divisor = 1;
				} else if (divisor < 3) {
					divisor = 1.5;
				} else if (divisor < 8) {
					divisor = 2.5;
				} else {
					divisor = 4;
				}

				this.switches.timeout = setTimeout(langx.proxy(function () {
					this.iterate(type);
				}, this), this.switches.speed / divisor);
				this.switches.count++;
			}
		},

		iterate: function iterate(type) {
			this.step(type);
			this.startSpin(type);
		},

		step: function step(isIncrease) {
			//refresh value from display before trying to increment in case they have just been typing before clicking the nubbins
			this._setValue(this.getDisplayValue());
			var newVal;

			if (isIncrease) {
				newVal = this.options.value + this.options.step;
			} else {
				newVal = this.options.value - this.options.step;
			}

			newVal = newVal.toFixed(5);

			this._setValue(newVal + this.unit);
		},

		getDisplayValue: function getDisplayValue() {
			var inputValue = this.parseInput(this.$input.val());
			var value = (!!inputValue) ? inputValue : this.options.value;
			return value;
		},

		setDisplayValue: function setDisplayValue(value) {
			this.$input.val(value);
		},

		getValue: function getValue() {
			var val = this.options.value;
			if (this.options.decimalMark !== '.'){
				val = (val + '').split('.').join(this.options.decimalMark);
			}
			return val + this.unit;
		},

		setValue: function setValue(val) {
			return this._setValue(val, true);
		},

		_setValue: function _setValue(val, shouldSetLastValue) {
			//remove any i18n on the number
			if (this.options.decimalMark !== '.') {
				val = this.parseInput(val);
			}

			//are we dealing with united numbers?
			if(typeof val !== "number"){
				var potentialUnit = val.replace(/[0-9.-]/g, '');
				//make sure unit is valid, or else drop it in favor of current unit, or default unit (potentially nothing)
				this.unit = _isUnitLegal(potentialUnit, this.options.units) ? potentialUnit : this.options.defaultUnit;
			}

			var intVal = this.getIntValue(val);

			//make sure we are dealing with a number
			if (isNaN(intVal) && !isFinite(intVal)) {
				return this._setValue(this.options.value, shouldSetLastValue);
			}

			//conform
			intVal = _applyLimits.call(this, intVal);

			//cache the pure int value
			this.options.value = intVal;

			//prepare number for display
			val = intVal + this.unit;

			if (this.options.decimalMark !== '.'){
				val = (val + '').split('.').join(this.options.decimalMark);
			}

			//display number
			this.setDisplayValue(val);

			if (shouldSetLastValue) {
				this.lastValue = val;
			}

			return this;
		},

		value: function value(val) {
			if (val || val === 0) {
				return this.setValue(val);
			} else {
				return this.getValue();
			}
		},

		parseInput: function parseInput(value) {
			value = (value + '').split(this.options.decimalMark).join('.');

			return value;
		},

		getIntValue: function getIntValue(value) {
			//if they didn't pass in a number, try and get the number
			value = (typeof value === "undefined") ? this.getValue() : value;
			// if there still isn't a number, abort
			if(typeof value === "undefined"){return;}

			if (typeof value === 'string'){
				value = this.parseInput(value);
			}

			value = parseFloat(value, 10);

			return value;
		},

		disable: function disable() {
			this.options.disabled = true;
			this.$element.addClass('disabled');
			this.$input.attr('disabled', '');
			this.$element.find('button').addClass('disabled');
		},

		enable: function enable() {
			this.options.disabled = false;
			this.$element.removeClass('disabled');
			this.$input.removeAttr('disabled');
			this.$element.find('button').removeClass('disabled');
		},

		keydown: function keydown(event) {
			var keyCode = event.keyCode;
			if (keyCode === 38) {
				this.step(true);
			} else if (keyCode === 40) {
				this.step(false);
			} else if (keyCode === 13) {
				this.change();
			}
		},

		keyup: function keyup(event) {
			var keyCode = event.keyCode;

			if (keyCode === 38 || keyCode === 40) {
				this.triggerChangedEvent();
			}
		}

	});	

	// Truly private methods
	var _limitToStep = function _limitToStep(number, step) {
		return Math.round(number / step) * step;
	};

	var _isUnitLegal = function _isUnitLegal(unit, validUnits) {
		var legalUnit = false;
		var suspectUnit = unit.toLowerCase();

		langx.each(validUnits, function (i, validUnit) {
			validUnit = validUnit.toLowerCase();
			if (suspectUnit === validUnit) {
				legalUnit = true;
				return false;//break out of the loop
			}
		});

		return legalUnit;
	};

	var _applyLimits = function _applyLimits(value) {
		// if unreadable
		if (isNaN(parseFloat(value))) {
			return value;
		}

		// if not within range return the limit
		if (value > this.options.max) {
			if (this.options.cycle) {
				value = this.options.min;
			} else {
				value = this.options.max;
			}
		} else if (value < this.options.min) {
			if (this.options.cycle) {
				value = this.options.max;
			} else {
				value = this.options.min;
			}
		}

		if (this.options.limitToStep && this.options.step) {
			value = _limitToStep(value, this.options.step);

			//force round direction so that it stays within bounds
			if(value > this.options.max){
				value = value - this.options.step;
			} else if(value < this.options.min) {
				value = value + this.options.step;
			}
		}

		return value;
	};

	// SPINBOX PLUGIN DEFINITION

	$.fn.spinbox = function spinbox(option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.spinbox');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.spinbox', (data = new Spinbox(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	// value needs to be 0 for this.render();
	$.fn.spinbox.defaults = {
		value: 0,
		min: 0,
		max: 999,
		step: 1,
		hold: true,
		speed: 'medium',
		disabled: false,
		cycle: false,
		units: [],
		decimalMark: '.',
		defaultUnit: '',
		limitToStep: false
	};

	$.fn.spinbox.Constructor = Spinbox;

	$.fn.spinbox.noConflict = function noConflict() {
		$.fn.spinbox = old;
		return this;
	};


	// DATA-API

	/*
	$(document).on('mousedown.fu.spinbox.data-api', '[data-initialize=spinbox]', function (e) {
		var $control = $(e.target).closest('.spinbox');
		if (!$control.data('fu.spinbox')) {
			$control.spinbox($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=spinbox]').each(function () {
			var $this = $(this);
			if (!$this.data('fu.spinbox')) {
				$this.spinbox($this.data());
			}
		});
	});
	*/

	return $.fn.spinbox;
});

define('skylark-swt/tab',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: tab.js v3.3.7
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // TAB CLASS DEFINITION
  // ====================


  var Tab = sbswt.Tab = sbswt.WidgetBase.inherit({
    klassName: "Tab",

    init : function(element,options) {
      // jscs:disable requireDollarBeforejQueryAssignment
      this.element = $(element)
      // jscs:enable requireDollarBeforejQueryAssignment
      this.element.on("click.bs.tab.data-api",langx.proxy(function(e){
        e.preventDefault()
        this.show();
      },this));    
    },

    show : function () {
      var $this    = this.element
      var $ul      = $this.closest('ul:not(.dropdown-menu)')
      var selector = $this.data('target')

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
      }

      if ($this.parent('li').hasClass('active')) return

      var $previous = $ul.find('.active:last a')
      var hideEvent = eventer.create('hide.bs.tab', {
        relatedTarget: $this[0]
      })
      var showEvent = eventer.create('show.bs.tab', {
        relatedTarget: $previous[0]
      })

      $previous.trigger(hideEvent)
      $this.trigger(showEvent)

      if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return

      var $target = $(selector)

      this.activate($this.closest('li'), $ul)
      this.activate($target, $target.parent(), function () {
        $previous.trigger({
          type: 'hidden.bs.tab',
          relatedTarget: $this[0]
        })
        $this.trigger({
          type: 'shown.bs.tab',
          relatedTarget: $previous[0]
        })
      })
    },

    activate : function (element, container, callback) {
      var $active    = container.find('> .active')
      var transition = callback
        && browser.support.transition
        && ($active.length && $active.hasClass('fade') || !!container.find('> .fade').length)

      function next() {
        $active
          .removeClass('active')
          .find('> .dropdown-menu > .active')
            .removeClass('active')
          .end()
          .find('[data-toggle="tab"]')
            .attr('aria-expanded', false)

        element
          .addClass('active')
          .find('[data-toggle="tab"]')
            .attr('aria-expanded', true)

        if (transition) {
          element[0].offsetWidth // reflow for transition
          element.addClass('in')
        } else {
          element.removeClass('fade')
        }

        if (element.parent('.dropdown-menu').length) {
          element
            .closest('li.dropdown')
              .addClass('active')
            .end()
            .find('[data-toggle="tab"]')
              .attr('aria-expanded', true)
        }

        callback && callback()
      }

      $active.length && transition ?
        $active
          .one('bsTransitionEnd', next)
          .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
        next()

      $active.removeClass('in')
    }


  });


  Tab.VERSION = '3.3.7'

  Tab.TRANSITION_DURATION = 150

  // TAB PLUGIN DEFINITION
  // =====================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab

  $.fn.tab             = Plugin
  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  /*
  var clickHandler = function (e) {
    e.preventDefault()
    Plugin.call($(this), 'show')
  }

  $(document)
    .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
    .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)
  */
});

define('skylark-swt/toolbar',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

	var Toolbar = sbswt.Toolbar = sbswt.WidgetBase.inherit({
        klassName: "Toolbar",

        init : function(elm,options) {
			var self = this;
			this._options = langx.mixin({
					autoredraw: true,
					buttons: {},
					context: {},
					list: [],
					show: true,
			},options);


			this.$container = $('<nav class="navbar"/>');
			this.$el = $(elm).append(this.$container);

			this.$container.on('mousedown.bs.dropdown.data-api', '[data-toggle="dropdown"]',function(e) {
				$(this).dropdown();
			}); 

			this.render();
        },


		render : function () {
			function createToolbarItems(items,container) {
				langx.each(items,function(i,item)  {
					var type = item.type;
					if (!type) {
						type = "button";
					}
					switch (type) {
						case "buttongroup":
							// Create an element with the HTML
							createButtonGroup(item,container);
							break;
						case "button":
							createButton(item,container)
							break;
						case "dropdown":
						case "dropup":
							createDrop(item,container)
							break;
						case "input":
							createInput(item,container)
							break;
						default:
							throw "Wrong widget button type";
					}
				});

			}

			function createButtonGroup(item,container) {
				var  group = $("<div/>", { class: "btn-group", role: "group" });
				container.append(group);
				createToolbarItems(item.items,group);
				return group;
			}

			function createButton(item,container) {
				// Create button
				var button = $('<button type="button" class="btn btn-default"/>'),
					attrs = langx.mixin({},item);

				// If has icon
				if ("icon" in item) {
					button.append($("<span/>", { class: item.icon }));
					delete attrs.icon;
				}
				// If has text
				if ("text" in attrs) {
					button.append(" " + item.text);
					delete attrs.text;
				}

				button.attr(attrs);

				// Add button to the group
				container.append(button);

			}

			function createDrop(item,container) {
				// Create button
				var dropdown_group = $('<div class="btn-group" role="group"/>');
				var dropdown_button = $('<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"/>');
				var dropdown_list = $('<ul class="dropdown-menu"/>');

				var	attrs = langx.mixin({},item);

				if(item.type === "dropup") {
					dropdown_group.addClass("dropup");
				}

				// If has icon
				if ("icon" in item) {
					dropdown_button.append($("<span/>", { class: item.icon }));
					delete attrs.icon;
				}
				// If has text
				if ("text" in item) {
					dropdown_button.append(" " + item.text);
					delete attrs.text;
				}
				// Add caret
				dropdown_button.append(' <span class="caret"/>');

				// Add list of options
				for(var i in item.list) {
					var dropdown_option = item.list[i];
					var dropdown_option_li = $('<li/>');

					// If has icon
					if ("icon" in dropdown_option) {
						dropdown_option_li.append($("<span/>", { class: dropdown_option.icon }));
					}

					// If has text
					if ("text" in dropdown_option) {
						dropdown_option_li.append(" " + dropdown_option.text);
					}
					// Set attributes
					dropdown_option_li.attr(dropdown_option);

					// Add to dropdown list
					dropdown_list.append(dropdown_option_li);
				}
				
				// Set attributes
				dropdown_group.attr(attrs);

				dropdown_group.append(dropdown_button);
				dropdown_group.append(dropdown_list);
				container.append(dropdown_group);

			}

			function createInput(item,container) {
				var input_group = $('<div class="input-group"/>');
				var input_element = $('<input class="form-control"/>');
				
				var	attrs = langx.mixin({},item);

				// Add prefix addon
				if("prefix" in item) {
					var input_prefix = $('<span class="input-group-addon"/>');
					input_prefix.html(item.prefix);
					input_group.append(input_prefix);

					delete attrs.prefix;
				}
				
				// Add input
				input_group.append(input_element);

				// Add sufix addon
				if("sufix" in item) {
					var input_sufix = $('<span class="input-group-addon"/>');
					input_sufix.html(item.sufix);
					input_group.append(input_sufix);

					delete attrs.sufix;
				}

				attrs.type = attrs.inputType;

				delete attrs.inputType;

				// Set attributes
				input_element.attr(attrs);

				container.append(input_group);

			}

			var items = this._options.items;
			if (items) {
				createToolbarItems(items,this.$container);
			}
		}

	});


	$.fn.toolbar = function (options) {
		options = options || {};

		return this.each(function () {
			return new Toolbar(this, langx.mixin({}, options,true));
		});
	};

	return Toolbar;

});

define('skylark-swt/transition',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

/* ========================================================================
 * Bootstrap: transition.js v3.3.7
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

  'use strict';

  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      WebkitTransition : 'webkitTransitionEnd',
      MozTransition    : 'transitionend',
      OTransition      : 'oTransitionEnd otransitionend',
      transition       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }

    return false // explicit for ie8 (  ._.)
  }

  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false
    var $el = this
    $(this).one('bsTransitionEnd', function () { called = true })
    var callback = function () { if (!called) $($el).trigger(browser.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    browser.support.transition = transitionEnd()

    if (!browser.support.transition) return

    eventer.special.bsTransitionEnd = {
      bindType: browser.support.transition.end,
      delegateType: browser.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
      }
    }
  })
});

define('skylark-swt/wizard',[
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "./sbswt"
],function(langx,browser,eventer,noder,geom,velm,$,sbswt){

	/*
	 * Fuel UX Checkbox
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */

	var old = $.fn.wizard;

	// WIZARD CONSTRUCTOR AND PROTOTYPE

	var Wizard = sbswt.Wizard = sbswt.WidgetBase.inherit({
		klassName: "Wizard",

		init : function(element,options) {
			this.$element = $(element);
			this.options = langx.mixin({}, $.fn.wizard.defaults, options);
			this.options.disablePreviousStep = (this.$element.attr('data-restrict') === 'previous') ? true : this.options.disablePreviousStep;
			this.currentStep = this.options.selectedItem.step;
			this.numSteps = this.$element.find('.steps li').length;
			this.$prevBtn = this.$element.find('button.btn-prev');
			this.$nextBtn = this.$element.find('button.btn-next');

			var kids = this.$nextBtn.children().detach();
			this.nextText = langx.trim(this.$nextBtn.text());
			this.$nextBtn.append(kids);

			var steps = this.$element.children('.steps-container');
			// maintains backwards compatibility with < 3.8, will be removed in the future
			if (steps.length === 0) {
				steps = this.$element;
				this.$element.addClass('no-steps-container');
				if (window && window.console && window.console.warn) {
					window.console.warn('please update your wizard markup to include ".steps-container" as seen in http://getfuelux.com/javascript.html#wizard-usage-markup');
				}
			}
			steps = steps.find('.steps');

			// handle events
			this.$prevBtn.on('click.fu.wizard', langx.proxy(this.previous, this));
			this.$nextBtn.on('click.fu.wizard', langx.proxy(this.next, this));
			steps.on('click.fu.wizard', 'li.complete', langx.proxy(this.stepclicked, this));

			this.selectedItem(this.options.selectedItem);

			if (this.options.disablePreviousStep) {
				this.$prevBtn.attr('disabled', true);
				this.$element.find('.steps').addClass('previous-disabled');
			}
		},

		destroy: function () {
			this.$element.remove();
			// any external bindings [none]
			// empty elements to return to original markup [none]
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		//index is 1 based
		//second parameter can be array of objects [{ ... }, { ... }] or you can pass n additional objects as args
		//object structure is as follows (all params are optional): { badge: '', label: '', pane: '' }
		addSteps: function (index) {
			var items = [].slice.call(arguments).slice(1);
			var $steps = this.$element.find('.steps');
			var $stepContent = this.$element.find('.step-content');
			var i, l, $pane, $startPane, $startStep, $step;

			index = (index === -1 || (index > (this.numSteps + 1))) ? this.numSteps + 1 : index;
			if (items[0] instanceof Array) {
				items = items[0];
			}

			$startStep = $steps.find('li:nth-child(' + index + ')');
			$startPane = $stepContent.find('.step-pane:nth-child(' + index + ')');
			if ($startStep.length < 1) {
				$startStep = null;
			}

			for (i = 0, l = items.length; i < l; i++) {
				$step = $('<li data-step="' + index + '"><span class="badge badge-info"></span></li>');
				$step.append(items[i].label || '').append('<span class="chevron"></span>');
				$step.find('.badge').append(items[i].badge || index);

				$pane = $('<div class="step-pane" data-step="' + index + '"></div>');
				$pane.append(items[i].pane || '');

				if (!$startStep) {
					$steps.append($step);
					$stepContent.append($pane);
				} else {
					$startStep.before($step);
					$startPane.before($pane);
				}

				index++;
			}

			this.syncSteps();
			this.numSteps = $steps.find('li').length;
			this.setState();
		},

		//index is 1 based, howMany is number to remove
		removeSteps: function (index, howMany) {
			var action = 'nextAll';
			var i = 0;
			var $steps = this.$element.find('.steps');
			var $stepContent = this.$element.find('.step-content');
			var $start;

			howMany = (howMany !== undefined) ? howMany : 1;

			if (index > $steps.find('li').length) {
				$start = $steps.find('li:last');
			} else {
				$start = $steps.find('li:nth-child(' + index + ')').prev();
				if ($start.length < 1) {
					action = 'children';
					$start = $steps;
				}

			}

			$start[action]().each(function () {
				var item = $(this);
				var step = item.attr('data-step');
				if (i < howMany) {
					item.remove();
					$stepContent.find('.step-pane[data-step="' + step + '"]:first').remove();
				} else {
					return false;
				}

				i++;
			});

			this.syncSteps();
			this.numSteps = $steps.find('li').length;
			this.setState();
		},

		setState: function () {
			var canMovePrev = (this.currentStep > 1);//remember, steps index is 1 based...
			var isFirstStep = (this.currentStep === 1);
			var isLastStep = (this.currentStep === this.numSteps);

			// disable buttons based on current step
			if (!this.options.disablePreviousStep) {
				this.$prevBtn.attr('disabled', (isFirstStep === true || canMovePrev === false));
			}

			// change button text of last step, if specified
			var last = this.$nextBtn.attr('data-last');
			if (last) {
				this.lastText = last;
				// replace text
				var text = this.nextText;
				if (isLastStep === true) {
					text = this.lastText;
					// add status class to wizard
					this.$element.addClass('complete');
				} else {
					this.$element.removeClass('complete');
				}

				var kids = this.$nextBtn.children().detach();
				this.$nextBtn.text(text).append(kids);
			}

			// reset classes for all steps
			var $steps = this.$element.find('.steps li');
			$steps.removeClass('active').removeClass('complete');
			$steps.find('span.badge').removeClass('badge-info').removeClass('badge-success');

			// set class for all previous steps
			var prevSelector = '.steps li:lt(' + (this.currentStep - 1) + ')';
			var $prevSteps = this.$element.find(prevSelector);
			$prevSteps.addClass('complete');
			$prevSteps.find('span.badge').addClass('badge-success');

			// set class for current step
			var currentSelector = '.steps li:eq(' + (this.currentStep - 1) + ')';
			var $currentStep = this.$element.find(currentSelector);
			$currentStep.addClass('active');
			$currentStep.find('span.badge').addClass('badge-info');

			// set display of target element
			var $stepContent = this.$element.find('.step-content');
			var target = $currentStep.attr('data-step');
			$stepContent.find('.step-pane').removeClass('active');
			$stepContent.find('.step-pane[data-step="' + target + '"]:first').addClass('active');

			// reset the wizard position to the left
			this.$element.find('.steps').first().attr('style', 'margin-left: 0');

			// check if the steps are wider than the container div
			var totalWidth = 0;
			this.$element.find('.steps > li').each(function () {
				totalWidth += $(this).outerWidth();
			});
			var containerWidth = 0;
			if (this.$element.find('.actions').length) {
				containerWidth = this.$element.width() - this.$element.find('.actions').first().outerWidth();
			} else {
				containerWidth = this.$element.width();
			}

			if (totalWidth > containerWidth) {
				// set the position so that the last step is on the right
				var newMargin = totalWidth - containerWidth;
				this.$element.find('.steps').first().attr('style', 'margin-left: -' + newMargin + 'px');

				// set the position so that the active step is in a good
				// position if it has been moved out of view
				if (this.$element.find('li.active').first().position().left < 200) {
					newMargin += this.$element.find('li.active').first().position().left - 200;
					if (newMargin < 1) {
						this.$element.find('.steps').first().attr('style', 'margin-left: 0');
					} else {
						this.$element.find('.steps').first().attr('style', 'margin-left: -' + newMargin + 'px');
					}

				}

			}

			// only fire changed event after initializing
			if (typeof (this.initialized) !== 'undefined') {
				var e = eventer.create('changed.fu.wizard');
				this.$element.trigger(e, {
					step: this.currentStep
				});
			}

			this.initialized = true;
		},

		stepclicked: function (e) {
			var li = $(e.currentTarget);
			var index = this.$element.find('.steps li').index(li);

			if (index < this.currentStep && this.options.disablePreviousStep) {//enforce restrictions
				return;
			} else {
				var evt = eventer.create('stepclicked.fu.wizard');
				this.$element.trigger(evt, {
					step: index + 1
				});
				if (evt.isDefaultPrevented()) {
					return;
				}

				this.currentStep = (index + 1);
				this.setState();
			}
		},

		syncSteps: function () {
			var i = 1;
			var $steps = this.$element.find('.steps');
			var $stepContent = this.$element.find('.step-content');

			$steps.children().each(function () {
				var item = $(this);
				var badge = item.find('.badge');
				var step = item.attr('data-step');

				if (!isNaN(parseInt(badge.html(), 10))) {
					badge.html(i);
				}

				item.attr('data-step', i);
				$stepContent.find('.step-pane[data-step="' + step + '"]:last').attr('data-step', i);
				i++;
			});
		},

		previous: function () {
			if (this.options.disablePreviousStep || this.currentStep === 1) {
				return;
			}

			var e = eventer.create('actionclicked.fu.wizard');
			this.$element.trigger(e, {
				step: this.currentStep,
				direction: 'previous'
			});
			if (e.isDefaultPrevented()) {
				return;
			}// don't increment ...what? Why?

			this.currentStep -= 1;
			this.setState();

			// only set focus if focus is still on the $nextBtn (avoid stomping on a focus set programmatically in actionclicked callback)
			if (this.$prevBtn.is(':focus')) {
				var firstFormField = this.$element.find('.active').find('input, select, textarea')[0];

				if (typeof firstFormField !== 'undefined') {
					// allow user to start typing immediately instead of having to click on the form field.
					$(firstFormField).focus();
				} else if (this.$element.find('.active input:first').length === 0 && this.$prevBtn.is(':disabled')) {
					//only set focus on a button as the last resort if no form fields exist and the just clicked button is now disabled
					this.$nextBtn.focus();
				}

			}
		},

		next: function () {
			var e = eventer.create('actionclicked.fu.wizard');
			this.$element.trigger(e, {
				step: this.currentStep,
				direction: 'next'
			});
			if (e.isDefaultPrevented()) {
				return;
			}// respect preventDefault in case dev has attached validation to step and wants to stop propagation based on it.

			if (this.currentStep < this.numSteps) {
				this.currentStep += 1;
				this.setState();
			} else {//is last step
				this.$element.trigger('finished.fu.wizard');
			}

			// only set focus if focus is still on the $nextBtn (avoid stomping on a focus set programmatically in actionclicked callback)
			if (this.$nextBtn.is(':focus')) {
				var firstFormField = this.$element.find('.active').find('input, select, textarea')[0];

				if (typeof firstFormField !== 'undefined') {
					// allow user to start typing immediately instead of having to click on the form field.
					$(firstFormField).focus();
				} else if (this.$element.find('.active input:first').length === 0 && this.$nextBtn.is(':disabled')) {
					//only set focus on a button as the last resort if no form fields exist and the just clicked button is now disabled
					this.$prevBtn.focus();
				}

			}
		},

		selectedItem: function (selectedItem) {
			var retVal, step;

			if (selectedItem) {
				step = selectedItem.step || -1;
				//allow selection of step by data-name
				step = Number(this.$element.find('.steps li[data-name="' + step + '"]').first().attr('data-step')) || Number(step);

				if (1 <= step && step <= this.numSteps) {
					this.currentStep = step;
					this.setState();
				} else {
					step = this.$element.find('.steps li.active:first').attr('data-step');
					if (!isNaN(step)) {
						this.currentStep = parseInt(step, 10);
						this.setState();
					}

				}

				retVal = this;
			} else {
				retVal = {
					step: this.currentStep
				};
				if (this.$element.find('.steps li.active:first[data-name]').length) {
					retVal.stepname = this.$element.find('.steps li.active:first').attr('data-name');
				}

			}

			return retVal;
		}

	});


	// WIZARD PLUGIN DEFINITION

	$.fn.wizard = function (option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.wizard');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.wizard', (data = new Wizard(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.wizard.defaults = {
		disablePreviousStep: false,
		selectedItem: {
			step: -1
		}//-1 means it will attempt to look for "active" class in order to set the step
	};

	$.fn.wizard.Constructor = Wizard;

	$.fn.wizard.noConflict = function () {
		$.fn.wizard = old;
		return this;
	};


	// DATA-API

	/*
	$(document).on('mouseover.fu.wizard.data-api', '[data-initialize=wizard]', function (e) {
		var $control = $(e.target).closest('.wizard');
		if (!$control.data('fu.wizard')) {
			$control.wizard($control.data());
		}
	});

	// Must be domReady for AMD compatibility
	$(function () {
		$('[data-initialize=wizard]').each(function () {
			var $this = $(this);
			if ($this.data('fu.wizard')) return;
			$this.wizard($this.data());
		});
	});
	*/

	return $.fn.wizard ;

});

define('skylark-swt/main',[
    "skylark-utils/query",
    "./affix",
    "./alert",
    "./button",
    "./carousel",
    "./checkbox",
    "./collapse",
    "./combobox",
    "./dropdown",
    "./dropdown-autoflip",
    "./infinite-scroll",
    "./loader",
    "./modal",
    "./menu",
    "./picker",
    "./pillbox",
    "./placard",
    "./popover",
    "./radio",
    "./scrollspy",
    "./search",
    "./selectlist",
    "./spinbox",
    "./tab",
    "./toolbar",
    "./tooltip",
    "./transition",
    "./wizard"
], function($) {
    return $;
});
define('skylark-swt', ['skylark-swt/main'], function (main) { return main; });


},this);