'use strict'
const debug = require('debug')('ddv-worker:master:ipc')
const master = require('ddv-worker')
const util = require('ddv-worker/util')
const processCallback = require('./processCallback')
const onDaemonCalls = require('./onDaemonCalls')
const onWorkerCalls = require('./onWorkerCalls')
// 发信息个子进程的结果回调存储容器
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
      reject(new master.MasterError('master send worker fail', null, 'MASTER_SEND_WORKER_FAIL', 'sendToWorker'))
      worker = type = message = handle = options = void 0
      return
    }
    if (worker.isForkInitEnd) {
      resolve()
    } else {
      var timeout = setTimeout(() => {
        master.removeListener('worker::event::isForkInitEnd', evnetFn)
        worker.isForkInitEnd ? resolve() : reject(new master.MasterError('master wait worker timeout', null, 'MASTER_WAIT_WORKER_TIMEOUT', 'sendToWorker'))
      }, 10 * 1000)
      var evnetFn = (res, handle, fromWorker) => {
        var fromWorkerId = fromWorker.id || fromWorker.workerId
        var workerId = worker.id || worker.workerId
        if (workerId !== void 0 && fromWorkerId === workerId) {
          clearTimeout(timeout)
          master.removeListener('worker::event::isForkInitEnd', evnetFn)
          process.nextTick(() => resolve())
        }
      }
      master.on('worker::event::isForkInitEnd', evnetFn)
    }
  }).then(res => {
    return new Promise((resolve, reject) => {
      var id = util.createNewPid()
      processCallback[id] = [resolve, reject, this]
      if (!worker.send({ id, type, message }, handle, options)) {
        delete processCallback[id]
        reject(new master.MasterError('master send worker fail', null, 'MASTER_SEND_WORKER_FAIL', 'sendToWorker'))
      }
      worker = type = message = handle = options = void 0
    }).catch(e => {
      if (e.message && e.message.indexOf('channel close') > -1 && e.stack.indexOf('child_process') > -1) {
        return Promise.reject(new master.MasterError('worker channel closed', e.stack, 'WORKER_CHANNEL_CLOSED', 'sendToWorker'))
      } else {
        return Promise.reject(e)
      }
    })
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
    var id = util.createNewPid()
    processCallback[id] = [resolve, reject, this]
    if (!process.send({ id, type, message }, handle, options)) {
      delete processCallback[id]
      reject(new master.MasterError('master send daemon fail', null, 'MASTER_SEND_DAEMON_FAIL', 'sendToDaemon'))
    }
    type = message = handle = options = void 0
  }).catch(e => {
    if (e.message && e.message.indexOf('channel close') > -1 && e.stack.indexOf('child_process') > -1) {
      return Promise.reject(new master.MasterError('master channel closed', e.stack, 'DAEMON_CHANNEL_CLOSED', 'sendToDaemon'))
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
    // 发送
    master.sendToDaemon('callDaemon', { id, name, data }, handle, options).catch(e => {
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
    var id = util.createNewPid()
    processCallback[id] = [resolve, reject, this]
    master.sendToWorker(worker, 'callWorker', { id, name, data }, handle).catch(e => {
      if (processCallback[id] && util.isFunction(processCallback[id][1])) {
        processCallback[id][1].call(processCallback[id][2] || this, e)
        delete processCallback[id]
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
// 守护进程对主进程的调用事件监听
master.onDaemonCall = function onDaemonCall (name, listener) {
  onDaemonCalls[name] = listener
}
// 子进程对主进程的调用事件监听
master.onWorkerCall = function onWorkerCall (name, listener) {
  onWorkerCalls[name] = listener
}

master.on('worker::event::isForkInitEnd', (res, handle, worker) => {
  worker.isForkInitEnd = true
})
// 绑定主进程对守护进程调用的结果回调事件
master.on('daemon::event::callDaemonRes', function callDaemonRes (res, handle) {
  if (processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new master.MasterError(res.message || 'master call daemon fail')
        e.stack = (res.errorStack || '') + '\n\n' + e.stack
        e.type = res.errorType || 'callDaemon'
        e.name = res.errorName || 'MASTER_CALL_DAEMON_FAIL'
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
// 绑定主进程对子进程调用的结果回调事件
master.on('worker::event::callWorkerRes', function callWorkerRes (res, handle, worker) {
  if (processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new master.MasterError(res.message || 'master call worker fail')
        e.stack = (res.errorStack || '') + '\n\n' + e.stack
        e.type = res.errorType || 'callDaemon'
        e.name = res.errorName || 'MASTER_CALL_WORKER_FAIL'
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
  res = handle = worker = void 0
})

// /**************************** 子进程对管理进程调用开始 ****************************/
// 子进程中转-转发子进程数据到子进程
master.on('worker::event::workerSendToWorker', function workerSendToWorker (body, handle, worker) {
  master.callWorker(body.toWorkerId, 'workerSendToWorker', body)
  .then((res) => {
    if (res.data.state) {
      master.sendToWorker(worker.id, 'workerSendToWorkerCallback', {
        id: body.id, fromWorkerId: worker.id, message: res.data.message, isCallback: res.data.isCallback
      }, handle).catch(e => master.logError(e))
    } else {
      master.sendToWorker(worker.id, 'workerSendToWorkerCallback', {id: body.id, fromWorkerId: worker.id, errorName: res.data.errorName, errorType: res.data.errorType, errorStack: res.data.errorStack, isCallback: res.data.isCallback}, handle).catch(e => master.logError(e))
    }
  }, ({name, type, stack, handle}) => {
    master.sendToWorker(worker.id, 'workerSendToWorkerCallback', {id: body.id, fromWorkerId: worker.id, errorName: name, errorType: type, errorStack: stack, isCallback: true}, handle).catch(e => master.logError(e))
  })
})

master.on('daemon::event::callMaster', (res, handle) => {
  if (!(res.name && res.id)) {
    // 阻止非正常调用
    return
  }
  Promise.resolve().then(() => {
    if (!onDaemonCalls[res.name]) {
      let e = new master.MasterError('master not find form daemon call')
      e.type = 'callMaster'
      e.name = 'MASTER_NOT_FIND_FORM_DAEMON_CALL'
      e.id = res.id
      e.handle = handle
      return Promise.reject(e)
    }
    if (!util.isFunction(onDaemonCalls[res.name])) {
      let e = new master.MasterError('master not function form daemon call')
      e.type = 'callMaster'
      e.name = 'MASTER_NOT_FN_FORM_DAEMON_CALL'
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
    let t = onDaemonCalls[res.name](res.data, handle, callback)
    if (t instanceof Promise) {
      PromiseRes.push(t)
    }
    callback = t = void 0
    return Promise.race(PromiseRes)
  }).then(({id, data, handle, options}) => {
    master.sendToDaemon('callMasterRes', { id: res.id, data }, handle, options).catch(e => master.logError(e))
  }, e => {
    master.sendToDaemon('callMasterRes', {
      id: res.id,
      message: e.message || 'daemon call master fail',
      errorStack: e.stack,
      errorType: e.type || 'callMaster',
      errorName: e.name || 'DAEMON_CALL_MASTER_FAIL'
    }, e.handle, e.options).catch(e => master.logError(e))
  })
})
master.on('worker::event::callMaster', (res, handle, worker) => {
  if (!(res.name && res.id)) {
    // 阻止非正常调用
    return
  }
  Promise.resolve().then(() => {
    if (!onWorkerCalls[res.name]) {
      let e = new master.MasterError('master not find form worker call')
      e.type = 'callMaster'
      e.name = 'MASTER_NOT_FIND_FORM_WORKER_CALL'
      e.id = res.id
      e.handle = handle
      return Promise.reject(e)
    }
    if (!util.isFunction(onWorkerCalls[res.name])) {
      let e = new master.MasterError('master not function form worker call')
      e.type = 'callMaster'
      e.name = 'MASTER_NOT_FN_FORM_WORKER_CALL'
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
    let t = onWorkerCalls[res.name](res.data, handle, worker, callback)
    if (t instanceof Promise) {
      PromiseRes.push(t)
    }
    callback = t = void 0
    return Promise.race(PromiseRes)
  }).then(({id, data, handle, options}) => {
    master.sendToWorker(worker, 'callMasterRes', { id: res.id, data }, handle, options).catch(e => master.logError(e))
  }, e => {
    master.sendToWorker(worker, 'callMasterRes', {
      id: res.id,
      message: e.message || 'worker call master fail',
      errorStack: e.stack,
      errorType: e.type || 'callMaster',
      errorName: e.name || 'WORKER_CALL_MASTER_FAIL'
    }, e.handle, e.options).catch(e => master.logError(e))
  })
})

// 绑定 daemon 进程发来的信息
process.on('message', function (res, handle) {
  if (!res) return
  if (res.type && res.id) {
    if (master.emit(('daemon::event::' + res.type), res.message, handle)) {
      process.send({
        isCallback: true,
        id: res.id,
        message: 'OK'
      })
    } else {
      let e = new master.MasterError('master not find event form daemon')
      process.send({
        isCallback: true,
        id: res.id,
        message: e.message,
        errorStack: e.stack,
        errorType: e.type || 'DAEMON_EVENT',
        errorName: e.name || 'MASTER_NOT_FIND_EVENT_FORM_DAEMON'
      })
    }
  } else if (res.isCallback === true && res.id && processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new master.MasterError(res.message || 'unknown error')
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
  master.sendToDaemon('isForkInitEnd').catch(e => master.logError(e))
})
