'use strict';
let type = (process.env.DDV_WORKER_PROCESS_TYPE||'worker');

//转小写
type = (type || 'daemon').toString().toLowerCase();
//强制是以下类型
type = ['master', 'worker', 'daemon'].indexOf(type)>-1 ? type : 'daemon';
//引入实例化基础类
const DdvWorker = require('./lib/DdvWorker.js');
//设定类型
DdvWorker.DDV_WORKER_PROCESS_TYPE = type ;

if (['master', 'worker'].indexOf(type)>-1) {
	module.exports = new DdvWorker();
}else{
	module.exports = DdvWorker;
}
//暴露实例化对象
module.exports.DdvWorker = DdvWorker;
module.exports.now = DdvWorker.prototype.now;
module.exports.time = DdvWorker.prototype.time;
module.exports.createNewid = DdvWorker.prototype.createNewid;
module.exports.type = DdvWorker.prototype.type;
module.exports.isFunction = DdvWorker.prototype.isFunction;
module.exports.isArray = DdvWorker.prototype.isArray;
module.exports.deepClone = DdvWorker.prototype.deepClone;
module.exports.argsToArray = DdvWorker.prototype.argsToArray;
module.exports.defineGetter = DdvWorker.prototype.defineGetter;
module.exports.defineSetter = DdvWorker.prototype.defineSetter;
