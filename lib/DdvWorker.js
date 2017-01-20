'use strict'
// 总数
let createNewidSumLast = 0
// 最后时间
let createNewidTimeLast = 0
// 作用域
const domain = require('domain')
// 方法的字符串
const functionStr = typeof function () {}
const class2type = {}
// Populate the class2type map
'Boolean Number String Function Array Date RegExp Object Error'.split(' ').forEach(function (name) {
  class2type[ '[object ' + name + ']' ] = name.toLowerCase()
})
var isDaemonPrototype = false
// 线程基本类
class DdvWorker extends domain.Domain {
  // 构造函数
  constructor () {
    let type = DdvWorker.DDV_WORKER_PROCESS_TYPE
    // 调用父类构造函数
    super()
    // 时间
    this.startTimeStamp = (new Date()).getTime() / 1000
    if (['master', 'worker'].indexOf(type) > -1) {
      // 压入方法
      require('./' + type + '.js')(this)
    } else {
      if (!isDaemonPrototype) {
        // 锁定
        isDaemonPrototype = true
        // 继承
        let [proto, key] = [require('./daemon.js'), null]
          // 守护线程扩展
        for (key in proto) {
          DdvWorker.prototype[key] = proto[key]
        }
        proto = key = void 0
      }

      // 调用
      this.__construct()
    }
  }
  // 获取当前时间开始
  now () {
    return (new Date()).getTime()
  }
  // 获取php的时间戳
  time () {
    return parseInt(this.now() / 1000)
  }
  // 创建唯一pid
  createNewPid (is10) {
    var r
    if (createNewidTimeLast !== this.time()) {
      createNewidTimeLast = this.time()
      createNewidSumLast = 0
    }
    r = createNewidTimeLast.toString() + (++createNewidSumLast).toString()
    // 使用36进制
    if (!is10) {
      r = parseInt(r, 10).toString(36)
    }
    return r
  }
  // 判断是否为DdvWorker实例化的
  isDdvWorker (o) {
    return o && (o instanceof DdvWorker)
  }
  // 判断是否为一个方法
  isFunction (fn) {
    return Boolean(typeof fn === functionStr)
  }
  // 判断是否为一个数组
  isArray () {
    return Array.isArray.apply(this, arguments)
  }
  // 判断
  extend () {
    return extend.apply(this, arguments)
  }
  isGlobal (obj) {
    return obj !== void 0 && obj === obj.global
  }
  // 参数强转数组
  argsToArray (args) {
    return Array.prototype.slice.call(args)
  }
  type (obj, isType) {
    if (isType !== void 0) {
      return isType === p.type(obj)
    }
    if (obj === void 0) {
      return obj + ''
    }
    // Support: Android<4.0, iOS<6 (functionish RegExp)
    return (typeof obj === 'object' || typeof obj === 'function') ? class2type[ class2type.toString.call(obj) ] || 'object' : typeof obj
  }
  defineGetter () {
    var args = p.argsToArray(arguments)
    var _this = this
    if (args.length === 3) {
      _this = args.shift() || _this
    }
    Object.__defineGetter__.apply(_this, args)
  }

  defineSetter () {
    var args = p.argsToArray(arguments)
    var _this = this
    if (args.length === 3) {
      _this = args.shift() || _this
    }
    Object.__defineSetter__.apply(_this, args)
  }
}
const each = function each (obj, callback, args, thisObj) {
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return
  }
  var value
  var i = 0
  var length = obj.length
  var isArray = p.type(obj, 'array')
  if (args === true) {
    if (isArray) {
      for (; i < length; i++) {
        value = callback.call(thisObj, i, obj[ i ])
        if (value === false) {
          return
        }
      }
    } else {
      for (i in obj) {
        value = callback.call(thisObj, i, obj[ i ])
        if (value === false) {
          return
        }
      }
    }
  } else if (args) {
    if (isArray) {
      for (; i < length; i++) {
        value = callback.apply(obj[ i ], args)
        if (value === false) {
          return
        }
      }
    } else {
      for (i in obj) {
        value = callback.apply(obj[ i ], args)
        if (value === false) {
          return
        }
      }
    }
  } else {
    if (isArray) {
      for (; i < length; i++) {
        value = callback.call(obj[ i ], i, obj[ i ])
        if (value === false) {
          return
        }
      }
    } else {
      for (i in obj) {
        value = callback.call(obj[ i ], i, obj[ i ])
        if (value === false) {
          return
        }
      }
    }
  }
  return obj
}
const isPlainObject = function isPlainObject (obj) {
  // Not plain objects:
  // - Any object or value whose internal [[Class]] property is not "[object Object]"
  // - DOM nodes
  // - window
  if (p.type(obj) !== 'object' || obj.nodeType || p.isGlobal(obj)) {
    return false
  }

  if (obj.constructor &&
      !Object.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf')) {
    return false
  }

  // If the function hasn't returned already, we're confident that
  // |obj| is a plain object, created by {} or constructed with new Object
  return true
}
const extend = function extend () {
  var options, name, src, copy, copyIsArray, clone
  var target = arguments[ 0 ] || {}
  var i = 1
  var length = arguments.length
  var deep = false
  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target

    // Skip the boolean and the target
    target = arguments[ i ] || {}
    i++
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !p.isFunction(target)) {
    target = {}
  }

  // Extend jQuery itself if only one argument is passed
  if (i === length) {
    target = this
    i--
  }

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== void 0) {
      // Extend the base object
      for (name in options) {
        src = target[ name ]
        copy = options[ name ]

        // Prevent never-ending loop
        if (target === copy) {
          continue
        }

        // Recurse if we're merging plain objects or arrays
        if (deep && copy && (isPlainObject(copy) || (copyIsArray = p.isArray(copy)))) {
          if (copyIsArray) {
            copyIsArray = false
            clone = src && p.isArray(src) ? src : []
          } else {
            clone = src && isPlainObject(src) ? src : Object.create(null)
          }

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy)

        // Don't bring in undefined values
        } else if (copy !== undefined) {
          target[name] = copy
        }
      }
    }
  }

  // Return the modified object
  return target
}
DdvWorker.prototype.each = each
const p = DdvWorker.prototype
module.exports = DdvWorker
