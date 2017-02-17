'use strict'
const debug = require('debug')('ddv-worker:master:oncall')
const master = require('ddv-worker')

// 子进程查询服务器配置信息
master.onWorkerCall('getServerConf', function getServerConfCb (data, handle, worker) {
  debug('onWorkerCall::getServerConf', data)
  master.getServerConfByWorker(worker).then(data => ({data}))
})

// 更新服务监听信息
master.onWorkerCall('updateServerConf', function onUpdateServerConf (serverConfNew, handle, worker) {
  debug('onWorkerCall::updateServerConf', serverConfNew)
  master.updateServerConfByWorker(serverConfNew, worker).then(data => ({data}))
})

// ping 子进程ping
master.onWorkerCall('ping', function pingCb (data, handle, worker) {
  if (master.workers[worker.id]) {
    master.workers[worker.id].socketSum = data.socketSum
    master.workers[worker.id].webSocketSum = data.webSocketSum
    master.workers[worker.id].httpSum = data.httpSum
  }
  return Promise.resolve(true)
})

// 进程信息
master.onDaemonCall('getProcessInfo', function getProcessInfoRun (data, handle) {
  return master.getProcessInfo().then(data => ({data}))
})
// 守护进程要杀掉所以进程
master.onDaemonCall('kill', function KillRun (data, handle) {
  debug('onDaemonCall::kill', data)
  return master.kill().then(data => ({data}))
})
