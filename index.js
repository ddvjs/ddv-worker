'use strict'
// 工具
const util = require('ddv-worker/util')
// 域
const domain = require('domain')
// 类型
var type = (process.env.DDV_WORKER_PROCESS_TYPE || 'worker')
// 转小写
type = (type || 'daemon').toString().toLowerCase()
// 强制是以下类型
type = ['master', 'worker', 'daemon'].indexOf(type) > -1 ? type : 'daemon'

class DdvWorker extends domain.Domain {
  // 构造函数
  constructor () {
    // 调用父类构造函数
    super()
    // 时间
    this.startTimeStamp = util.now() / 1000
    // 判断是否存在构造函数 - 调用构造函数
    return util.isFunction(this.__construct) && this.__construct() || this
  }
  // 判断是否为DdvWorker实例化的
  isDdvWorker (o) {
    return o && (o instanceof DdvWorker)
  }
}
// 导出模块
module.exports = type === 'daemon' ? DdvWorker : new DdvWorker()
module.exports.now = util.now
module.exports.time = util.time
module.exports.createNewid = util.createNewid
module.exports.type = util.type
module.exports.isFunction = util.isFunction
module.exports.isArray = util.isArray
// module.exports.deepClone = DdvWorker.prototype.deepClone
module.exports.argsToArray = util.argsToArray
module.exports.defineGetter = util.defineGetter
module.exports.defineSetter = util.defineSetter
module.exports.isDdvWorker = DdvWorker.prototype.isDdvWorker

// 引入扩展模块
require('ddv-worker/lib/' + type)
util.isFunction(module.exports.workerInit) && module.exports.workerInit()
