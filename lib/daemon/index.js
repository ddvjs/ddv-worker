require('./api.js')
require('./daemon.js')
require('./fork.js')
require('./ipc.js')
require('./sys.js')
Object.assign(require('ddv-worker').prototype, {
  /**
   * 实例化后的初始化
   */
  __construct () {
    this.__ddvIndexInit()
    this.__ddvForkInit()
    this.__ddvApiInit()
    this.__ddvIpcInit()
    this.__ddvSysInit()
    this.__ddvDaemonInit()
    process.nextTick(() => {
      this.emit('loadend')
    })
    // 一定要返回实例化的对象
    return this
  },
  __ddvIndexInit () {
    // 设置子进程总个数 默认一个子进程
    this.options = Object.create(null)
    this.options.args = []
    this.options.execArgv = process.execArgv
    this.options.env = process.env
    this.master = null
    this.masterFile = process.argv[1]
    this.sys = Object.create(null)
    this._processCallback = this._processCallback || Object.create(null)
    if (this.options.args.indexOf('--color') < 0) {
      this.options.args.push('--color')
    }
    if (this.options.args.indexOf('--expose-gc') < 0) {
      this.options.args.push('--expose-gc')
    }
  }

})
