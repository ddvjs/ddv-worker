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
