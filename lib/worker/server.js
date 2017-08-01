'use strict'
// 工具
const util = require('ddv-worker/util')
// worker
const worker = require('ddv-worker')
// domain模块
const domain = require('domain')
// Domain模块
const Domain = domain.Domain
// 长连接总数
worker.socketSum = 0
// webSocket 长连接总数
worker.webSocketSum = 0
// http 连接总数
worker.httpSum = 0
// socketTimeout超时时间
worker.socketTimeout = 120000
// 服务器头
worker.headersServer = 'ddv ' + process.platform

worker.serverListenInit = function server () {
  worker.on('master::event::socket::handle', function socketHandleCb (res, socket) {
    worker._serverSocketEmit(res, socket)
  })
}
worker.serverListenPort = function serverListenPort () {
  var argv, portIndex
  if (worker.isHasMaster) {
    return Promise.reject(new Error('Master can not listen on its own port'))
  } else {
    worker.notMasterListen = worker.notMasterListen || Object.create(null)
    Object.keys(worker.notMasterListen).forEach(key => {
      if (typeof worker.notMasterListen[key] === 'undefined') {
        delete worker.notMasterListen[key]
      }
    })
    argv = process.argv
    portIndex = argv.indexOf('--port')
    worker.notMasterListen.port = worker.notMasterListen.port || (portIndex > -1 ? (parseInt(argv[portIndex + 1]) || 80) : 80)
    return new Promise((resolve, reject) => {
      worker.server.listen(worker.notMasterListen, function () {
        resolve()
      })
    })
  }
}
worker.socketEchoError = function socketEchoError (socket, e) {
  try {
    let status = e.status || '501 Not Implemented'
    socket.write('HTTP/1.1 ' + status + '\r\n')
    socket.write('Date: ' + (new Date()).toGMTString() + '\r\n')
    socket.write('Server: ' + worker.headersServer + '\r\n')
    socket.write('Last-Modified: ' + (new Date()).toGMTString() + '\r\n')
    socket.write('Connection: close\r\nContent-Type: text/html')
    socket.write('\r\n\r\n<pre>' + (e.message + '\r\n' + e.stack) + '</pre>')
    socket.end()
  } catch (e) {}
}

worker.socketDomainRun = void 0
// 通过 socket 触发服务
worker._serverSocketEmit = function serverSocketEmit (message, socket) {
  process.nextTick(function socketEmitNextTick () {
    // 判断是否存在运行域
    if (!(worker.socketDomainRun && util.isFunction(worker.socketDomainRun))) {
      if (worker.server instanceof Domain) {
        // 如果这个服务是继承Domain，直接使用这个Domain下面的run
        worker.socketDomainRun = worker.server.run
      } else if (worker.server.domain instanceof Domain) {
        // 如果这个服务下面有一个Domain对象，直接使用这个Domain下面的run
        worker.socketDomainRun = worker.server.domain.run
      } else {
        // 否则只能创建一个Domain来运行捕获错误了
        worker._worker_domain = domain.create()
        worker._worker_domain.add(worker.server)
        worker.socketDomainRun = worker._worker_domain.run
      }
    }
    // 使用运行Domain来运行
    worker.socketDomainRun(function socketEmitDomainRun () {
      // 运行
      worker._serverSocketEmitRun(message, socket)
      message = socket = void 0
    })
  })
}
// 运行
worker._serverSocketEmitRun = function serverSocketEmitRun (message, socket) {
  var data
  if (!worker.server) {
    // 找不到服务对象，只能稍后再试了
    worker.socketEchoError(socket, new Error('The plugin service is temporarily unavailable. Please try again later'))
    return
  } else if (socket) {
    // 把base64的data还原为Buffer
    data = new Buffer(message.data_by_base64, 'base64')
    socket.info = message.info
    socket.readable = socket.writable = true
    socket.server = worker.server
    socket.isSocketNotEnd = true
    socket.on('socketSum::remove', function socketSumRemove () {
      if (this.isSocketNotEnd === true) {
        // 统计-1
        worker.socketSum--
        delete this.isSocketNotEnd
      }
    })
    // 在长连接错误的时候
    socket.on('error', function onErrorSocketSumRemove () {
      if (this.isSocketNotEnd) {
        this.emit('socketSum::remove')
      }
    })
    // 在长连接结束的时候
    socket.on('end', function onEndSocketSumRemove () {
      if (this.isSocketNotEnd) {
        this.emit('socketSum::remove')
      }
    })
    // 统计+1
    worker.socketSum++
    worker.server.emit('connection', socket)
    socket.emit('connect')
    socket.emit('data', data)
    worker.socketTimeout !== void 0 && socket.setTimeout(worker.socketTimeout)
    socket.resume()
  }
  message = socket = data = void 0
}
