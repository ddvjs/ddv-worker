'use strict'
const debug = require('debug')('ddv-worker:master:api:error')
const master = require('ddv-worker')
/**
 * [masterError 主线程错误]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-11-14T14:39:39+0800
 * @param    {string}                 message [description]
 * @param    {string}                 stack   [description]
 * @return   {error}                          [description]
*/
master.MasterError = class MasterError extends Error {
    // 构造函数
  constructor (message, stack, name, type) {
    debug('constructor')
      // 调用父类构造函数
    super(message)
    this.name = name || this.name || 'Error'
    this.type = type || this.type || 'MasterError'
    this.stack += stack ? ('\n' + stack) : ''
    message = stack = void 0
  }
}

