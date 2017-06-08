// 方法的字符串
const functionStr = typeof function () {}
// 类型
const class2type = (function () {
  var t = {}
  // Populate the class2type map
  'Boolean Number String Function Array Date RegExp Object Error'.split(' ').forEach(function (name) {
    t[ '[object ' + name + ']' ] = name.toLowerCase()
  })
  return t
}())

// 导出模块
const util = module.exports = {
  // 获取当前时间开始
  now () {
    return (new Date()).getTime()
  },
  // 获取php的时间戳
  time () {
    return parseInt(util.now() / 1000)
  },
  // 创建唯一pid
  createNewPid (is10) {
    var r
    if (util._createNewidTimeLast !== this.time()) {
      util._createNewidTimeLast = this.time()
      util._createNewidSumLast = 0
    }
    r = (++util._createNewidSumLast).toString() + util._createNewidTimeLast.toString()
    // 使用36进制
    if (!is10) {
      r = parseInt(r, 10).toString(36)
    }
    return r
  },
  // 生成guid
  createGuid (s) {
    return (s || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  },
  // 生成请求id
  createRequestId () {
    var pid, rid, ridLen, ridT, ridNew, i
      // 获取16进制的 pid
    pid = Number(util.createNewPid(true)).toString(16)
      // 种子
    rid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    ridNew = ''
    for (i = rid.length - 1; i >= 0; i--) {
      ridT = rid[i]
      if (ridT === 'x') {
        ridLen = pid.length
        ridT = pid ? pid.charAt(ridLen - 1) : 'x'
        pid = pid.substr(0, ridLen - 1)
      }
      ridNew = ridT + ridNew
    }
    rid = util.createGuid(ridNew)
    i = ridNew = ridT = ridLen = pid = undefined
    return rid
  },
  getServerGuid (guid) {
    return guid || '2cb47a70-90d6-5df9-9416-84fa3b2da5d4'
  },
  type (obj, isType) {
    if (isType !== void 0) {
      return isType === util.type(obj)
    }
    if (obj === void 0) {
      return obj + ''
    }
    // Support: Android<4.0, iOS<6 (functionish RegExp)
    return (typeof obj === 'object' || typeof obj === 'function') ? class2type[ class2type.toString.call(obj) ] || 'object' : typeof obj
  },
  // 参数强转数组
  argsToArray (args) {
    return Array.prototype.slice.call(args)
  },
  // 绑定获取
  defineGetter () {
    var args = util.argsToArray(arguments)
    var _this = this
    if (args.length === 3) {
      _this = args.shift() || _this
    }
    Object.__defineGetter__.apply(_this, args)
  },
  // 绑定设置
  defineSetter () {
    var args = util.argsToArray(arguments)
    var _this = this
    if (args.length === 3) {
      _this = args.shift() || _this
    }
    Object.__defineSetter__.apply(_this, args)
  },
  // 判断是否为一个方法
  isFunction (fn) {
    return Boolean(typeof fn === functionStr)
  },
  // 判断是否为一个数组
  isArray () {
    return Array.isArray.apply(this, arguments)
  },
  isNumber (obj) {
    return (typeof obj === 'string' || typeof obj === 'number') && (!util.isArray(obj) && (obj - parseFloat(obj) >= 0))
  },
  // 判断是否一个标准的global
  isGlobal (obj) {
    return obj !== void 0 && obj === obj.global
  },
  isPlainObject (obj) {
    // Not plain objects:
    // - Any object or value whose internal [[Class]] property is not "[object Object]"
    // - DOM nodes
    // - window
    if (util.type(obj) !== 'object' || obj.nodeType || util.isGlobal(obj)) {
      return false
    }

    if (obj.constructor && !Object.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf')) {
      return false
    }

    // If the function hasn't returned already, we're confident that
    // |obj| is a plain object, created by {} or constructed with new Object
    return true
  },
  extend () {
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
    if (typeof target !== 'object' && !util.isFunction(target)) {
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
          if (deep && copy && (util.isPlainObject(copy) || (copyIsArray = util.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false
              clone = src && util.isArray(src) ? src : []
            } else {
              clone = src && util.isPlainObject(src) ? src : Object.create(null)
            }

            // Never move original objects, clone them
            target[name] = util.extend(deep, clone, copy)

          // Don't bring in undefined values
          } else if (copy !== undefined) {
            target[name] = copy
          }
        }
      }
    }

    // Return the modified object
    return target
  },
  each (obj, callback, args, thisObj) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
      return
    }
    var value
    var i = 0
    var length = obj.length
    var isArray = util.type(obj, 'array')
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
  },
  // 总数
  _createNewidSumLast: 0,
  // 最后时间
  _createNewidTimeLast: 0
}
