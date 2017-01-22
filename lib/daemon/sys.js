Object.assign(require('ddv-worker').prototype, {
  __ddvSysInit () {
    this.__ddvSysEventInit()
  },
  __ddvSysEventInit () {
    this.on('master::call::ping', (data, handle, callback) => {
      callback(true, true)
    })
  }
})
