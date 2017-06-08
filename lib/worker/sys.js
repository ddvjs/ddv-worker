'use strict'
const util = require('ddv-worker/util')
const worker = require('ddv-worker')
// 初始状态
worker.status = 'Runing'
// 是否有管理进程
worker.isHasMaster = false
// ping管理进程多久没有回应算超时
worker.masterPingTimeOut = 30 * 1000

var isMasterPingInit = false
var masterPingLastTime = util.now()
var setIntervalHandle = 0
Object.assign(worker, {
  workerSysInit () {
    worker._workerSysEventInit()
    worker._workerSysBaseInit()
    // ping 管理进程是否通讯正常
    worker._workerSysPingMasterInit()
  },
  _workerSysEventInit () {
    process.on('unhandledRejection', (reason, p) => {
      console.error('Unhandled Rejection at: Promise ')
      console.error(p)
      console.error(' reason: ')
      console.error(reason)
      // application specific logging, throwing an error, or other logic here
    })
  },
  _workerSysBaseInit () {
    // guid
    worker.serverGuid = util.getServerGuid(process.env.DDV_WORKER_SERVER_GUID)
    // worker id
    worker.id = worker.workerId = process.env.DDV_WORKER_PROCESS_WORKER_ID || 0
    // site id
    worker.siteId = process.env.DDV_WORKER_PROCESS_SITE_ID || 0
    // Determine whether there is master
    worker.isHasMaster = (typeof process !== 'undefined' && util.isFunction(process.send))
    // 调试变量
    worker._debug = false || worker._debug
  },
  _workerSysPingMasterInit () {
    if (isMasterPingInit || !worker.isHasMaster) {
      return
    }
    isMasterPingInit = true
    masterPingLastTime = util.now()
    clearInterval(setIntervalHandle)
    setIntervalHandle = setInterval(worker._workerSysPingMaster, worker.masterPingTimeOut)
  },
  _workerSysPingMaster () {
    // 如果没有主进程
    if (!worker.isHasMaster) {
      clearInterval(setIntervalHandle)
      return
    }
    if ((util.now() - (masterPingLastTime || 0)) > (worker.masterPingTimeOut * 2)) {
      console.error('Because the long-term master process of ping did not respond to automatic exit')
      process.exit(1)
      return
    }
    try {
      // 和主进程ping
      worker.callMaster('ping', {
        'socketSum': worker.socketSum,
        'webSocketSum': worker.webSocketSum,
        'httpSum': worker.httpSum
      }).then(() => {
        // 更新最后的时间
        masterPingLastTime = util.now()
      }, e => {
        console.error(e)
        process.exit(1)
      })
    } catch (e) {
      // 设定过去
      masterPingLastTime = 0
      // 设定ping
      worker._workerSysPingMaster()
    }
  },

  logError (e) {
    console.log('ddv-worker:worker', e)
  }
})
