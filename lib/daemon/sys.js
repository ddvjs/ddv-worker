const debug = require('debug')('ddv-worker/daemon/fork')
Object.assign(require('ddv-worker').prototype, {
  __ddvSysInit () {
    this.__ddvSysEventInit()
  },
  __ddvSysEventInit () {
    this.on('master::call::ping', (data, handle, callback) => {
      debug('master::call::ping', data)
      callback(true, true)
    })
  }
})
require('ddv-worker').DaemonError = require('ddv-worker').prototype.DaemonError = class DaemonError extends Error {
    // 构造函数
  constructor (message, stack) {
    debug('constructor')
      // 调用父类构造函数
    super(message)
    this.name = this.name || 'Error'
    this.type = this.type || 'DaemonError'
    this.stack += stack ? ('\n' + stack) : ''
    message = stack = void 0
  }
}
