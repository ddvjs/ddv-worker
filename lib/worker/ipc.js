const util = require('ddv-worker/util')
// 子进程模块
const worker = require('ddv-worker')
// 发信息个主进程的结果回调存储容器
const processCallback = worker._processCallback = Object.create(null)

/**
 * 发送信息到 worker
 * @param    {[type]}                 workerId [description]
 * @param    {[type]}                 type     [description]
 * @param    {[type]}                 message  [description]
 * @param    {[type]}                 handle   [description]
 * @param    {[type]}                 options  [description]
 * @param    {Function}               callback [description]
 * @return   {[type]}                          [description]
 */
worker.sendToWorker = function workerSendToWorker (workerId, type, message, handle, options, callback) {
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
  var body
  body = Object.create(null)
  body.message = message
  body.toWorkerId = workerId
  body.id = util.createNewPid()
  body.type = type
  processCallback[body.id] = callback

  // 判断是否为相同进程的数据交互
  // if (!true) {

  // } else {
  worker.sendToMaster('workerSendToWorker', body, handle, options, function sendToMasterCb (state, message) {
    if (state !== true) {
      delete processCallback[body.id]
      if (util.isFunction(callback)) {
        callback(state, message)
      }
    }
    state = message = void 0
  })
  // }
}

/**
 * 发送信息到 master
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2017-01-22T18:56:03+0800
 * @param    {[type]}                 type     [description]
 * @param    {[type]}                 message  [description]
 * @param    {[type]}                 handle   [description]
 * @param    {[type]}                 options  [description]
 * @param    {Function}               callback [description]
 * @return   {[type]}                          [description]
 */
worker.sendToMaster = function workerSendToMaster (type, message, handle, options, callback) {
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
  body = type = message = handle = options = void 0
  if (r !== true) {
    delete processCallback[body.id]
    if (util.isFunction(callback)) {
      callback(false, 'WORKER_NOT_FIND_EVENT_FORM_MASTER')
    }
  }
  return r
}

/**
 * 发送信息到 调用
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2017-01-22T18:56:14+0800
 * @param    {[type]}                 name     [description]
 * @param    {[type]}                 data     [description]
 * @param    {[type]}                 handle   [description]
 * @param    {Function}               callback [description]
 * @return   {[type]}                          [description]
 */
worker.callMaster = function (name, data, handle, callback) {
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
  processCallback[body.id] = callback
  worker.sendToMaster('callMaster', body, handle, function (state, message) {
    if (state !== true && processCallback[body.id] &&
        util.isFunction(processCallback[body.id])) {
      processCallback[body.id](state, message)
      delete processCallback[body.id]
    }
    body = undefined
  })
}

// 管理进程发来信息，是worker发送结果的回调
worker.on('master::event::workerSendToWorkerCallback', function workerSendToWorkerCallback (res) {
  if (processCallback && processCallback[res.id] && util.isFunction(processCallback[res.id])) {
    processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
    delete processCallback[res.id]
  }
})
// worker进程 对 master进程调用 - 回调结果事件
worker.on('master::event::callMasterRes', function callMasterRes (res) {
  if (processCallback && processCallback[res.id] && util.isFunction(processCallback[res.id])) {
    processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
  }
})
// master进程 对 worker进程 - 回调结果事件
worker.on('master::event::callWorker', function (res, handle) {
  if (!worker.emit(('master::call::' + res.name), res.data, handle, function callCallback (state, message, handle, options) {
    if (!res) return
    worker.sendToMaster('callWorkerRes', {
      id: res.id,
      state: state,
      message: message
    }, handle, options)
    state = message = handle = options = res = void 0
  })) {
    if (!res) return
    worker.sendToMaster('callWorkerRes', {
      id: res.id,
      state: false,
      message: 'WORKER_NOT_FIND_FN_FORM_MASTER'
    })
    res = void 0
  }
  handle = void 0
})

// 绑定进程消息，master 发来的信息
process.on('message', function onMasterMessage (res, handle) {
  if (!res) {
    return
  }
  if (res.type && res.id) {
    if (worker.emit(('master::event::' + res.type), res.message, handle)) {
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
        message: 'WORKER_NOT_FIND_EVENT_FORM_MASTER'
      })
    }
  } else if (res.isCallback === true && res.id) {
    if (processCallback && processCallback[res.id] && util.isFunction(processCallback[res.id])) {
      processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
    }
  }
})
