const debug = require('debug')('ddv-worker/master/ipc')
const master = require('ddv-worker')
const util = require('ddv-worker/util')
// 发信息个子进程的结果回调存储容器
const processCallback = master._processCallback = Object.create(null)
const processPromise = master._processPromise = Object.create(null)
/**
 * [sendToWorker 发送子进程]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-11-14T14:16:23+0800
 * @param    {string|object}          worker   [worker|workerId]
 * @param    {string}                 type     [类型]
 * @param    {object}                 message  [description]
 * @param    {handle}                 handle   [description]
 * @param    {object}                 options  [参数]
 * @param    {Function}               callback [回调]
 * @return   {boolean}                         [发送成功与否]
 */
master.sendToWorker = function masterSendToWorker (worker, type, message, handle, options, callback) {
  debug('sendToWorker', type, message)
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
    if (worker && (util.type(worker, 'number') || util.type(worker, 'string'))) {
      worker = (master && master.workers[worker]) || worker
    }
    if (!(worker && util.type(worker, 'object') && util.type(worker.send, 'function'))) {
      let e = new master.MasterError('master send worker fail')
      e.type = 'sendToWorker'
      e.name = 'MASTER_SEND_WORKER_FAIL'
      reject(e)
      worker = type = message = handle = options = void 0
      return
    }
    if (worker.send({
      id: util.createNewPid(),
      type,
      message
    }, handle, options)) {
      resolve()
    } else {
      let e = new master.MasterError('master send worker fail')
      e.type = 'sendToWorker'
      e.name = 'MASTER_SEND_WORKER_FAIL'
      reject(e)
    }
    worker = type = message = handle = options = void 0
  }).then(res => {
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
}
  /**
   * [sendToDaemon 发送守护进程]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T14:19:19+0800
   * @param    {string}                 type     [description]
   * @param    {object}                 message  [description]
   * @param    {handle}                 handle   [description]
   * @param    {object}                 options  [description]
   * @param    {Function}               callback [description]
   * @return   {boolean}                         [description]
   */
master.sendToDaemon = function masterSendToDaemon (type, message, handle, options, callback) {
  debug('sendToDaemon', type, message)
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
    if (process.send({
      id: util.createNewPid(),
      type,
      message
    }, handle, options)) {
      resolve()
    } else {
      let e = new master.MasterError('master send worker fail')
      e.type = 'sendToDaemon'
      e.name = 'MASTER_SEND_WORKER_FAIL'
      reject(e)
    }
    type = message = handle = options = callback = void 0
  }).then(res => {
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
}
  /**
   * [callDaemon 调用守护线程]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T14:20:08+0800
   * @param    {string}                 name     [description]
   * @param    {object}                 data     [description]
   * @param    {handle}                 handle   [description]
   * @param    {object}                 options  [description]
   * @param    {Function}               callback [description]
   * @return   {boolean}                         [description]
   */
master.callDaemon = function (name, data, handle, options, callback) {
  debug('callDaemon', name, data)
  if (callback === undefined && util.isFunction(options)) {
    callback = options
    options = undefined
  }
  if (callback === undefined && util.isFunction(handle)) {
    callback = handle
    options = handle = undefined
  }
  if (callback === undefined && util.isFunction(data)) {
    callback = data
    options = data = undefined
  }
  return new Promise((resolve, reject) => {
    let id = util.createNewPid()
    processPromise[id] = [resolve, reject, this]
    // 发送
    master.sendToDaemon('callDaemon', {id, name, data}, handle, options).catch(e => {
      if (processPromise[id] && util.isFunction(processPromise[id][1])) {
        processPromise[id][1].call(processPromise[id][2] || this, e)
        delete processPromise[id]
      }
    })
    name = data = handle = options = void 0
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
}
  /**
   * [callWorker 调用子进程]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T14:20:53+0800
   * @param    {[type]}                 worker   [description]
   * @param    {string}                 name     [description]
   * @param    {object}                 data     [description]
   * @param    {handle}                 handle   [description]
   * @param    {object}                 options  [description]
   * @param    {Function}               callback [description]
   * @return   {boolean}                         [description]
   */
master.callWorker = function (worker, name, data, handle, options, callback) {
  debug('callWorker', worker && worker.id || worker || '0', name, data)
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
    let id = util.createNewPid()
    processPromise[id] = [resolve, reject, this]
    master.sendToWorker(worker, 'callWorker', {id, name, data}, handle).catch(e => {
      if (processPromise[id] && util.isFunction(processPromise[id][1])) {
        processPromise[id][1].call(processPromise[id][2] || this, e)
        delete processPromise[id]
      }
    })
    worker = name = data = handle = options = void 0
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
}
// 绑定主进程对守护进程调用的结果回调事件
master.on('daemon::event::callDaemonRes', function callDaemonRes (res, handle) {
  if (processPromise && processPromise[res.id]) {
    if (res.state || false) {
      if (util.isFunction(processPromise[res.id][0])) {
        processPromise[res.id][0].call(processPromise[res.id][2], {
          id: res.id,
          message: res.message,
          handle
        })
      }
    } else {
      if (util.isFunction(processPromise[res.id][1])) {
        let e = new master.MasterError(res.message || 'master call daemon fail')
        e.stack = res.errorStack || e.stack
        e.type = res.errorType || 'callDaemon'
        e.name = res.errorName || 'MASTER_CALL_DAEMON_FAIL'
        e.id = res.id
        e.handle = res.handle
        processPromise[res.id][1].call(processPromise[res.id][2], e)
      }
    }
  }
  res = handle = void 0
})
// 绑定主进程对子进程调用的结果回调事件
master.on('worker::event::callWorkerRes', function callWorkerRes (res, handle, worker) {
  if (processPromise && processPromise[res.id]) {
    if (res.state || false) {
      if (util.isFunction(processPromise[res.id][0])) {
        processPromise[res.id][0].call(processPromise[res.id][2], {
          id: res.id,
          message: res.message,
          handle
        })
      }
    } else {
      if (util.isFunction(processPromise[res.id][1])) {
        let e = new master.MasterError(res.message || 'master call worker fail')
        e.stack = res.errorStack || e.stack
        e.type = res.errorType || 'callDaemon'
        e.name = res.errorName || 'MASTER_CALL_WORKER_FAIL'
        e.id = res.id
        e.handle = res.handle
        processPromise[res.id][1].call(processPromise[res.id][2], e)
      }
    }
  }
  res = handle = worker = void 0
})

// /**************************** 子进程对管理进程调用开始 ****************************/
// 子进程中转-转发子进程数据到子进程
master.on('worker::event::workerSendToWorker', function workerSendToWorker (body, handle, worker) {
  master.sendToWorker(body.toWorkerId, body.type, body.message, (state, message) => {
    master.sendToWorker(worker.id, 'workerSendToWorkerCallback', {
      id: body.id,
      state: state,
      message: message
    })
  })
})

// 守护进程对主进程的调用事件监听
master.on('daemon::event::callMaster', (res, handle) => {
  if (!master.emit(('daemon::call::' + res.name), res.data, handle, (state, message, handle, options) => {
    if (!res) return
    master.sendToDaemon('callMasterRes', {
      id: res.id,
      state: state,
      message: message
    }, handle, options)
    state = message = handle = options = res = void 0
  })) {
    if (!res) return
    master.sendToDaemon('callMasterRes', {
      id: res.id,
      state: false,
      message: 'MASTER_NOT_FIND_CALL_FORM_DAEMON'
    })
    res = void 0
  }
  handle = void 0
})
master.on('worker::event::callMaster', (res, handle, worker) => {
  if (!master.emit(('worker::call::' + res.name), res.data, handle, (state, message, handle, options) => {
    if (!res) return
    master.sendToWorker(worker, 'callMasterRes', {
      id: res.id,
      state: state,
      message: message
    }, handle, options)
    state = message = handle = options = res = worker = void 0
  }, worker)) {
    if (!res) return
    master.sendToWorker(worker, 'callMasterRes', {
      id: res.id,
      state: false,
      message: 'MASTER_NOT_FIND_CALL_FORM_WORKER'
    })
    res = worker = void 0
  }
  handle = void 0
})

// 绑定 daemon 进程发来的信息
process.on('message', function (res, handle) {
  if (!res) return
  if (res.type && res.id) {
    if (master.emit(('daemon::event::' + res.type), res.message, handle)) {
      process.send({
        isCallback: true,
        id: res.id,
        state: true,
        message: 'OK'
      })
    } else {
      process.send({
        isCallback: true,
        id: res.id,
        state: false,
        message: 'MASTER_NOT_FIND_EVENT_FORM_DAEMON'
      })
    }
  } else if (res.isCallback === true && res.id) {
    if (processCallback && processCallback[res.id] && util.isFunction(processCallback[res.id])) {
      processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
    }
  }
})
