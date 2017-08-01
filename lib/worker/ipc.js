'use strict'
const util = require('ddv-worker/util')
// 子进程模块
const worker = require('ddv-worker')
// 发信息个主进程的结果回调存储容器
const processCallback = require('./processCallback')
const onMasterCalls = require('./onMasterCalls')

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

  return new Promise((resolve, reject) => {
    var id = util.createNewPid()
    processCallback[id] = [resolve, reject, this]
    // 判断是否为相同进程的数据交互
    // if (!true) {

    // } else {
    if (!worker.sendToMaster('workerSendToWorker', { id, type, message, fromWorkerId: worker.id, toWorkerId: workerId }, handle, options)) {
      delete processCallback[id]
      let e = new worker.WorkerError('worker send worker fail')
      e.type = 'sendToWorker'
      e.name = 'WORKER_SEND_WORKER_FAIL'
      reject(e)
    }
    // }
    type = message = handle = options = void 0
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
  return new Promise((resolve, reject) => {
    var id = util.createNewPid()
    processCallback[id] = [resolve, reject, this]
    if (!process.send({ id, type, message }, handle, options)) {
      delete processCallback[id]
      let e = new worker.WorkerError('worker send master fail')
      e.type = 'sendToMaster'
      e.name = 'WORKER_SEND_MASTER_FAIL'
      reject(e)
    }
    type = message = handle = options = void 0
  }).catch(e => {
    if (e.message && e.message.indexOf('channel close') > -1 && e.stack.indexOf('child_process') > -1) {
      return Promise.reject(new worker.WorkerError('master channel closed', e.stack, 'MASTER_CHANNEL_CLOSED', 'sendToMaster'))
    } else {
      return Promise.reject(e)
    }
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
 * 发送信息到 调用
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2017-01-22T18:56:14+0800
 * @param    {[type]}                 name     [description]
 * @param    {[type]}                 data     [description]
 * @param    {[type]}                 handle   [description]
 * @param    {Function}               callback [description]
 * @return   {[type]}                          [description]
 */
worker.callMaster = function (name, data, handle, options, callback) {
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
    processCallback[id] = [resolve, reject, this]
    worker.sendToMaster('callMaster', { id, name, data }, handle).catch(e => {
      if (processCallback[id] && util.isFunction(processCallback[id][1])) {
        processCallback[id][1].call(processCallback[id][2] || this, e)
        delete processCallback[id]
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
// 主进程对子进程的调用事件监听
worker.onMasterCall = function onMasterCall (name, listener) {
  onMasterCalls[name] = listener
}

// worker进程 对 master进程调用 - 回调结果事件
worker.on('master::event::callMasterRes', function callMasterRes (res, handle) {
  if (processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new worker.WorkerError(res.message || 'worker call master fail')
        e.stack = (res.errorStack || '') + '\n\n' + e.stack
        e.type = res.errorType || 'callMaster'
        e.name = res.errorName || 'WORKER_CALL_MASTER_FAIL'
        e.id = res.id
        e.handle = handle
        processCallback[res.id][1].call(processCallback[res.id][2], e)
      }
    } else {
      if (util.isFunction(processCallback[res.id][0])) {
        processCallback[res.id][0].call(processCallback[res.id][2], {
          id: res.id,
          data: res.data,
          handle
        })
      }
    }
  }
  res = handle = void 0
})
// 管理进程发来信息，是worker发送结果的回调
worker.on('master::event::workerSendToWorkerCallback', function workerSendToWorkerCallback (res, handle) {
  if (res.isCallback && processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new worker.WorkerError(res.message || 'worker send worker fail')
        e.stack = (res.errorStack || '') + '\n\n' + e.stack
        e.fromWorkerId = res.fromWorkerId
        e.type = res.errorType || 'sendToWorker'
        e.name = res.errorName || 'WORKER_CALL_WORKER_FAIL'
        e.id = res.id
        e.handle = handle
        processCallback[res.id][1].call(processCallback[res.id][2], e)
      }
    } else {
      if (util.isFunction(processCallback[res.id][0])) {
        processCallback[res.id][0].call(processCallback[res.id][2], {
          id: res.id,
          message: res.message,
          fromWorkerId: res.fromWorkerId,
          handle
        })
      }
    }
  }
})
worker.onMasterCall('workerSendToWorker', function (res, handle) {
  return new Promise(function (resolve, reject) {
    if (!res) {
      return
    }
    if (res.type && res.id) {
      if (worker.emit(('worker::event::' + res.type), res.message, handle, res.fromWorkerId, res.toWorkerId)) {
        resolve({data: {
          isCallback: true,
          id: res.id,
          state: true,
          message: 'OK'
        }})
      } else {
        let e = new worker.WorkerError('worker not find event form worker')
        resolve({data: {
          isCallback: true,
          id: res.id,
          state: false,
          message: e.message,
          errorStack: e.stack,
          errorType: e.type || 'WORKER_EVENT',
          errorName: e.name || 'WORKER_NOT_FIND_EVENT_FORM_WORKER'
        }})
      }
    }
  })
})

// master进程 对 worker进程 - 回调结果事件
worker.on('master::event::callWorker', function (res, handle) {
  if (!(res.name && res.id)) {
    // 阻止非正常调用
    return
  }
  Promise.resolve().then(() => {
    if (!onMasterCalls[res.name]) {
      let e = new worker.WorkerError('worker not find form master call')
      e.type = 'callWorker'
      e.name = 'WORKER_NOT_FIND_FORM_MASTER_CALL'
      e.id = res.id
      e.handle = res.handle
      return Promise.reject(e)
    }
    if (!util.isFunction(onMasterCalls[res.name])) {
      let e = new worker.WorkerError('worker not function form master call')
      e.type = 'callWorker'
      e.name = 'WORKER_NOT_FN_FORM_MASTER_CALL'
      e.id = res.id
      e.handle = res.handle
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
    let t = onMasterCalls[res.name](res.data, handle, callback)
    if (t instanceof Promise) {
      PromiseRes.push(t)
    }
    callback = t = void 0
    return Promise.race(PromiseRes)
  }).then(({id, data, handle, options}) => {
    worker.sendToMaster('callWorkerRes', { id: res.id, data }, handle, options).catch(e => worker.logError(e))
  }, e => {
    worker.sendToMaster('callWorkerRes', {
      id: res.id,
      message: e.message || 'master call worker fail',
      errorStack: e.stack,
      errorType: e.type || 'callMaster',
      errorName: e.name || 'MASTER_CALL_WORKER_FAIL'
    }, e.handle, e.options).catch(e => worker.logError(e))
  })
})

// 绑定进程消息，master 发来的信息
process.on('message', function onMasterMessage (res, handle) {
  if (!res) {
    return
  }
  if (res.type && res.id) {
    if (worker.emit(('master::event::' + res.type), res.message, handle, res.fromWorkerId, res.toWorkerId)) {
      process.send({
        isCallback: true,
        id: res.id,
        state: true,
        message: 'OK'
      })
    } else {
      let e = new worker.WorkerError('worker not find event form master')
      process.send({
        isCallback: true,
        id: res.id,
        state: false,
        message: e.message,
        errorStack: e.stack,
        errorType: e.type || 'MASTER_EVENT',
        errorName: e.name || 'WORKER_NOT_FIND_EVENT_FORM_MASTER'
      })
    }
  } else if (res.isCallback === true && res.id && processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new worker.WorkerError(res.message || 'unknown error')
        e.stack = (res.errorStack || '') + '\n\n' + e.stack
        e.type = res.errorType || 'unknownError'
        e.name = res.errorName || 'UNKNOWN_ERROR'
        e.id = res.id
        e.handle = handle
        processCallback[res.id][1].call(processCallback[res.id][2], e)
      }
    } else {
      if (util.isFunction(processCallback[res.id][0])) {
        processCallback[res.id][0].call(processCallback[res.id][2], {
          id: res.id,
          message: res.message,
          handle
        })
      }
    }
  }
})
process.nextTick(() => {
  worker.isHasMaster && worker.sendToMaster('isForkInitEnd')
})
