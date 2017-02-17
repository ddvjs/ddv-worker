'use strict'
require('./ipc.js')
require('./api.js')
require('./server.js')
require('./debug.js')
require('./sys.js')
const worker = require('ddv-worker')
worker.workerInit = function workerInit () {
  worker.serverListenInit()
  worker.workerSysInit()
}
