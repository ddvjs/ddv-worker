const master = require('ddv-worker')
const util = require('ddv-worker/util')
// 发信息个子进程的结果回调存储容器
const processCallback = master._processCallback = Object.create(null)
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
  if (worker && (util.type(worker, 'number') || util.type(worker, 'string'))) {
    worker = (master && master.workers[worker]) || worker
  }
  if (!(worker && util.type(worker, 'object') && util.type(worker.send, 'function'))) {
    if (util.isFunction(callback)) {
      callback(false, 'MASTER_NOT_FIND_WORKER')
    }
    worker = type = message = handle = options = callback = void 0
    return false
  }
  var body, r
  body = Object.create(null)
  body.message = message
  body.id = util.createNewPid()
  body.type = type
  processCallback[body.id] = callback
  r = worker.send(body, handle, options)
  if (r !== true) {
    delete processCallback[body.id]
    if (util.isFunction(callback)) {
      callback(false, 'MASTER_SEND_WORKER_FAIL')
    }
  }
  body = worker = type = message = handle = options = callback = void 0
  return r
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
  processCallback[body.id] = callback
  r = process.send(body, handle, options)
  if (r !== true) {
    delete processCallback[body.id]
    if (util.isFunction(callback)) {
      callback(false, 'MASTER_SEND_WORKER_FAIL')
    }
  }
  body = type = message = handle = options = callback = void 0
  return r
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
  var body
  body = Object.create(null)
  body.id = util.createNewPid()
  body.name = name
  body.data = data
  processCallback[body.id] = callback
  master.sendToDaemon('callDaemon', body, handle, options, (state, message, handle) => {
    if (state !== true && processCallback[body.id] && util.isFunction(processCallback[body.id])) {
      processCallback[body.id](state, message)
      delete processCallback[body.id]
    }
    body = undefined
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
  var body
  body = Object.create(null)
  body.id = util.createNewPid()
  body.name = name
  body.data = data
  processCallback[body.id] = callback
  master.sendToWorker(worker, 'callWorker', body, handle, function (state, message, handle) {
    if (state !== true && processCallback[body.id] &&
        util.isFunction(processCallback[body.id])) {
      processCallback[body.id](state, message)
      delete processCallback[body.id]
    }
    body = void 0
  })
}

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

// 绑定主进程对守护进程调用的结果回调事件
master.on('daemon::event::callDaemonRes', function callDaemonRes (res, handle) {
  if (processCallback && processCallback[res.id] && util.isFunction(processCallback[res.id])) {
    processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
  }
  res = handle = void 0
})
// 绑定主进程对子进程调用的结果回调事件
master.on('worker::event::callWorkerRes', function callWorkerRes (res, handle, worker) {
  if (processCallback && processCallback[res.id] && util.isFunction(processCallback[res.id])) {
    processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
  }
  res = handle = worker = void 0
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
