'use strict'
// 作用域
const domain = require('domain')
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
  // 判断是否为DdvWorker实例化的
  isDdvWorker (o) {
    return o && (o instanceof DdvWorker)
  }
}
module.exports = DdvWorker
