const util = require('ddv-worker/util')
Object.assign(require('ddv-worker').prototype, {
  __ddvIpcInit () {
    this._processCallback = Object.create(null)
    this.__ddvEventInit()
  },
  __ddvEventInit  () {
    // 绑定守护进程对主进程调用的结果回调事件
    this.on('master::event::callMasterRes', (res, handle) => {
      if (this._processCallback && this._processCallback[res.id] && util.isFunction(this._processCallback[res.id])) {
        this._processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
      }
    })
    // 主进程对守护进程的调用事件监听
    this.on('master::event::callDaemon', (res, handle) => {
      if (!this.emit(('master::call::' + res.name), res.data, handle, (state, message, handle, options) => {
        if (!res) return
        this.sendToMaster('callDaemonRes', {
          id: res.id,
          state: state,
          message: message
        }, handle, options)
        state = message = handle = options = res = undefined
      })) {
        if (!res) return
        this.sendToMaster('callDaemonRes', {
          id: res.id,
          state: false,
          message: 'DAEMON_NOT_FIND_CALL_FORM_MASTER'
        })
        res = undefined
      }
      handle = undefined
    })
  },
  /**
   * 调用 master
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2017-01-22T20:00:25+0800
   * @param    {[type]}                 name     [description]
   * @param    {[type]}                 data     [description]
   * @param    {[type]}                 handle   [description]
   * @param    {Function}               callback [description]
   * @return   {[type]}                          [description]
   */
  callMaster (name, data, handle, callback) {
    if (callback === undefined && util.isFunction(handle)) {
      callback = handle
      handle = undefined
    }
    if (callback === undefined && util.isFunction(data)) {
      callback = data
      data = undefined
    }
    var body
    body = Object.create(null)
    body.id = util.createNewPid()
    body.name = name
    body.data = data
    this._processCallback[body.id] = callback
    this.sendToMaster('callMaster', body, handle, (state, message) => {
      if (state !== true && this._processCallback[body.id] &&
      util.isFunction(this._processCallback[body.id])) {
        this._processCallback[body.id](state, message)
        delete this._processCallback[body.id]
      }
      body = undefined
    })
  },
  /**
   * 发送 master
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2017-01-22T20:00:46+0800
   * @param    {[type]}                 type     [description]
   * @param    {[type]}                 message  [description]
   * @param    {[type]}                 handle   [description]
   * @param    {[type]}                 options  [description]
   * @param    {Function}               callback [description]
   * @return   {[type]}                          [description]
   */
  sendToMaster (type, message, handle, options, callback) {
    if (callback === void 0 && util.isFunction(options)) {
      callback = options
      options = void 0
    }
    if (callback === void 0 && util.isFunction(handle)) {
      callback = handle
      options = handle = void 0
    }
    if (callback === void 0 && util.isFunction(message)) {
      callback = message
      options = message = void 0
    }
    var body, r
    body = Object.create(null)
    body.message = message
    body.id = util.createNewPid()
    body.type = type
    this._processCallback[body.id] = callback
    r = this.master.send(body, handle, options)
    if (r !== true) {
      delete this._processCallback[body.id]
      if (util.isFunction(callback)) {
        callback(false, 'DAEMON_SEND_TO_MASTER_FAIL')
      }
    }
    body = type = message = handle = options = callback = void 0
    return r
  }
})
