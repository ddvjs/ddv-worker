const util = require('ddv-worker/util')
const debug = require('debug')('ddv-worker/daemon/ipc')
Object.assign(require('ddv-worker').prototype, {
  __ddvIpcInit () {
    debug('__ddvIpcInit')
    this._processCallback = this._processCallback || Object.create(null)
    this._onMasterCalls = this._onMasterCalls || Object.create(null)
    this.__ddvEventInit()
  },
  __ddvEventInit  () {
    debug('__ddvEventInit')
    this.on('master::event::isForkInitEnd', (res, handle) => {
      this.isForkInitEnd = true
    })
    // 绑定守护进程对主进程调用的结果回调事件
    this.on('master::event::callMasterRes', (res, handle) => {
      if (this._processCallback && this._processCallback[res.id]) {
        if (res.errorStack) {
          if (util.isFunction(this._processCallback[res.id][1])) {
            let e = new this.DaemonError(res.message || 'master call daemon fail')
            e.stack = (res.errorStack || '') + e.stack
            e.type = res.errorType || 'callMaster'
            e.name = res.errorName || 'MASTER_CALL_DAEMON_FAIL'
            e.id = res.id
            e.handle = handle
            this._processCallback[res.id][1].call(this._processCallback[res.id][2], e)
          }
        } else {
          if (util.isFunction(this._processCallback[res.id][0])) {
            this._processCallback[res.id][0].call(this._processCallback[res.id][2], {
              id: res.id,
              data: res.data,
              handle
            })
          }
        }
      }
    })
    // 主进程对守护进程的调用事件监听
    this.on('master::event::callDaemon', (res, handle) => {
      if (!(res.name && res.id)) {
        // 阻止非正常调用
        return
      }
      Promise.resolve().then(() => {
        if (!this._onMasterCalls[res.name]) {
          let e = new this.DaemonError('daemon not find form master call')
          e.type = 'callDaemon'
          e.name = 'DAEMON_NOT_FIND_FORM_MASTER_CALL'
          e.id = res.id
          e.handle = handle
          return Promise.reject(e)
        }
        if (!util.isFunction(this._onMasterCalls[res.name])) {
          let e = new this.DaemonError('daemon not function form master call')
          e.type = 'callDaemon'
          e.name = 'DAEMON_NOT_FN_FORM_MASTER_CALL'
          e.id = res.id
          e.handle = handle
          return Promise.reject(e)
        }
      }).then(() => {
        let PromiseRes = []
        let callback
        PromiseRes.push(new Promise((resolve, reject) => {
          callback = (e, res) => {
            e ? reject(e) : resolve(res)
          }
        }))
        let t = this._onMasterCalls[res.name](res.data, handle, callback)
        if (t instanceof Promise) {
          PromiseRes.push(t)
        }
        // 回收
        callback = t = void 0
        return Promise.race(PromiseRes)
      }).then(({id, data, handle, options}) => {
        this.sendToMaster('callDaemonRes', { id: res.id, data }, handle, options).catch(e => this.logError(e))
      }, e => {
        this.sendToMaster('callDaemonRes', {
          id: res.id,
          message: e.message || 'master call daemon fail',
          errorStack: e.stack,
          errorType: e.type || 'callDaemon',
          errorName: e.name || 'MASTER_CALL_DAEMON_FAIL'
        }, e.handle, e.options).catch(e => this.logError(e))
      })
    })
    // 系统信息
    this.on('master::message', (res, handle) => {
      if (!res) {
        return
      }
      if (res.type && res.id) {
        if (this.emit(('master::event::' + res.type), res.message, handle)) {
          this.master.send({
            isCallback: true,
            id: res.id,
            message: 'OK'
          })
        } else {
          let e = new this.DaemonError('daemon not find event form master')
          this.send({
            isCallback: true,
            id: res.id,
            message: e.message,
            errorStack: e.stack,
            errorType: e.type || 'MASTER_EVENT',
            errorName: e.name || 'DAEMON_NOT_FIND_EVENT_FORM_MASTER'
          })
        }
      } else if (res.isCallback === true && res.id && this._processCallback && this._processCallback[res.id]) {
        if (res.errorStack) {
          if (util.isFunction(this._processCallback[res.id][1])) {
            let e = new this.DaemonError(res.message || 'unknown error')
            e.stack = res.errorStack || e.stack
            e.type = res.errorType || 'unknownError'
            e.name = res.errorName || 'UNKNOWN_ERROR'
            e.id = res.id
            e.handle = handle
            this._processCallback[res.id][1].call(this._processCallback[res.id][2], e)
          }
        } else {
          if (util.isFunction(this._processCallback[res.id][0])) {
            this._processCallback[res.id][0].call(this._processCallback[res.id][2], {
              id: res.id,
              message: res.message,
              handle
            })
          }
        }
      }
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
  callMaster (name, data, handle, options, callback) {
    debug('callMaster', name, data)
    if (callback === void 0 && util.isFunction(options)) {
      callback = options
      options = void 0
    }
    if (callback === void 0 && util.isFunction(handle)) {
      callback = handle
      options = handle = void 0
    }
    if (callback === void 0 && util.isFunction(data)) {
      callback = data
      options = data = void 0
    }
    return new Promise((resolve, reject) => {
      var id = util.createNewPid()
      this._processCallback[id] = [resolve, reject, this]
      this.sendToMaster('callMaster', { id, name, data }, handle).catch(e => {
        if (this._processCallback[id] && util.isFunction(this._processCallback[id][1])) {
          this._processCallback[id][1].call(this._processCallback[id][2] || this, e)
          delete this._processCallback[id]
        }
      })
    }).then((res) => {
      util.isFunction(callback) && callback(null, res)
      callback = void 0
      return res
    }, e => {
      if (util.isFunction(callback)) {
        callback(e, null)
        callback = void 0
      } else {
        return Promise.reject(e)
      }
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
    debug('sendToMaster', type, message)
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
    return new Promise((resolve, reject) => {
      if (this.isForkInitEnd) {
        resolve()
      } else {
        var timeout = setTimeout(() => {
          this.removeListener('master::event::isForkInitEnd', evnetFn)
          this.isForkInitEnd ? resolve() : reject(new this.DaemonError('daemon wait master timeout', null, 'DAEMON_WAIT_MASTER_TIMEOUT', 'sendToMaster'))
        }, 10 * 1000)
        var evnetFn = (res, handle) => {
          clearTimeout(timeout)
          this.removeListener('master::event::isForkInitEnd', evnetFn)
          process.nextTick(() => resolve())
        }
        this.on('master::event::isForkInitEnd', evnetFn)
      }
    }).then(res => {
      return new Promise((resolve, reject) => {
        var id = util.createNewPid()
        this._processCallback[id] = [resolve, reject, this]
        if (!this.master.send({ id, type, message }, handle, options)) {
          delete this._processCallback[id]
          let e = new this.DaemonError('daemon send master fail')
          e.type = 'sendToMaster'
          e.name = 'DAEMON_SEND_TO_MASTER_FAIL'
          reject(e)
        }
        type = message = handle = options = void 0
      }).catch(e => {
        if (e.message && e.message.indexOf('channel close') > -1 && e.stack.indexOf('child_process') > -1) {
          return Promise.reject(new this.DaemonError('master channel closed', e.stack, 'MASTER_CHANNEL_CLOSED', 'sendToMaster'))
        } else {
          return Promise.reject(e)
        }
      })
    })
    .then(res => {
      util.isFunction(callback) && callback(null, res)
      callback = void 0
      return res
    }, e => {
      if (util.isFunction(callback)) {
        callback(e, null)
        callback = void 0
      } else {
        return Promise.reject(e)
      }
    })
  },
  // 主进程对守护进程的调用事件监听
  onMasterCall (name, listener) {
    this._onMasterCalls[name] = listener
  }
})
