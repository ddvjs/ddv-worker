const debug = require('debug')('ddv-worker/daemon/fork')
Object.assign(require('ddv-worker').prototype, {
  __ddvSysInit () {
    this.__ddvSysEventInit()
  },
  __ddvSysEventInit () {
    // ping 子进程ping
    this.onMasterCall('ping', (data, handle) => {
      debug('onMasterCall::ping', data)
      return Promise.resolve(true)
    })
  },
  logError (e) {
    console.log('ddv-worker:daemon', e)
  }
})
require('ddv-worker').DaemonError = require('ddv-worker').prototype.DaemonError = class DaemonError extends Error {
    // 构造函数
  constructor (message, stack, name, type) {
    debug('constructor')
      // 调用父类构造函数
    super(message)
    this.name = name || this.name || 'Error'
    this.type = type || this.type || 'DaemonError'
    this.stack += stack ? ('\n' + stack) : ''
    message = stack = void 0
  }
}
