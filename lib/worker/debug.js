'use strict'
// 工具
const util = require('ddv-worker/util')
// worker
const worker = require('ddv-worker')
worker._debug = worker._debug === void 0 ? false : worker._debug
// 获取调试模式
worker._debugGetter = () => {
  return Boolean(worker._debug)
}
// 设置调试模式
worker._debugSetter = (isDebug) => {
  worker._debug = Boolean(isDebug)
}
util.defineGetter(worker, 'debug', worker._debugGetter)
util.defineSetter(worker, 'debug', worker._debugSetter)
util.defineGetter(worker, 'DEBUG', worker._debugGetter)
util.defineSetter(worker, 'DEBUG', worker._debugSetter)
