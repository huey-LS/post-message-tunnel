import Message from './message';
import PubSub from './pubsub';

var EVENT_NAME_CHECK_READY = '@message/check_ready';
var EVENT_NAME_RECEIPT = '@message/receipt';

var MessageTunnel = function (options) {
  options = options || {};
  createFinishQueue(this);
  this.pubSub = new PubSub();
  this.maxCheckReady = options.maxCheckReady || 2;
  this.checkReadyTime = options.checkReadyTime || 1000;
  this.__checkReadyCount = 0;

  if (options.target) {
    this.createTarget(options.target, options.origin)
  } else if (!options.isServer){
    console.log('message: can not post without target')
  }

  if (!options.whiteList) {
    console.warn('message: no whiteList is not safe. Will not start listening')
  } else {
    this.listenMessage();
  }

  this.__listeners = [];
  this.whiteList = options.whiteList || [];
  this._callbackWaitingReceipt = {};
}

MessageTunnel.prototype.listenMessage = function () {
  var _self = this;
  var callback = function (event) {
    event = event || window.event;
    var origin = event.origin;
    var source = event.source;
    // var originHostname = getHostname(origin);
    var data = event.data;

    if (isInWhiteList(origin, _self.whiteList)) {
      var message = new Message(data);
      message.setSource(source);
      message.setOrigin(origin);
      console.log(location.href, 'message: receive', message);
      var receiptHasCalled = false;
      var receipt = function (content) {
        if (receiptHasCalled) {
          console.log('message: receipt cannot be called multiple times');
          return false;
        }
        receiptHasCalled = true;
        var receiptMessage = new Message();
        receiptMessage.setOriginMessage(message);
        receiptMessage.setName(EVENT_NAME_RECEIPT);
        receiptMessage.setContent(content);
        _self.postReceipt(receiptMessage);
      }

      if (message.name === EVENT_NAME_CHECK_READY) {
        // 如果是检测是否完成的消息
        // _self.postReceipt(message);
        _self.createTarget(source, origin);
        receipt();
      } else if (message.name === EVENT_NAME_RECEIPT) {
        // 如果是回执
        _self.doReceiptCallback(message);
      } else {
        // 只响应对应的目标的 message
        if (!_self.target || source === _self.target) {
          _self.emit(message, receipt);
        }
      }
    }
  }

  if(window.addEventListener) {
    window.addEventListener('message', callback, false)
  } else if (window.attachEvent) {
    window.attachEvent('message', callback);
  }
}

MessageTunnel.prototype.createTarget = function (target, origin) {
  var _self = this;
  console.log('message: create target', target, origin)
  if (typeof target === 'string') {
    this._targetOrigin = getOrigin(target)
    createIframe(target, function (iframe) {
      console.log('message: iframe onload', target)
      _self.targetIframe = iframe;
      _self.checkTargetReady();
    });
  } else {
    _self.target = target;
    _self._targetOrigin = origin;
  }
}

MessageTunnel.prototype.subscribe = function (fn) {
  this.pubSub.subscribe(fn);
}

MessageTunnel.prototype.emit = function (message, receipt) {
  this.pubSub.publish({ message: message, receipt: receipt });
}

MessageTunnel.prototype.post = function (name, content, callback) {
  var _self = this;
  if (typeof content === 'function') {
    callback = content;
    content = {};
  }

  var message = new Message();
    message.setName(name);
    message.setContent(content);

  if (this.target) {
    this.postMessage(message, callback);
  } else {
    this.ready(function () {
      _self.postMessage(message, callback);
    })
  }
}

MessageTunnel.prototype.postMessage = function (message, callback) {
  console.log('message: will post message', message);
  this.addCallbackWaitingReceipt(message, callback);
  this.target.postMessage(message.format(), this._targetOrigin);
}

MessageTunnel.prototype.checkTargetReady = function () {
  var message = new Message();
  var _self = this;
  message.setName(EVENT_NAME_CHECK_READY);
  this.addCallbackWaitingReceipt(message, function () {
    // target frame complete
    _self.target = _self.targetIframe.contentWindow;
    _self.doFinishQueue();
  });
  this.targetIframe.contentWindow.postMessage(message.format(), this._targetOrigin);

  this.__checkReadyCount = this.__checkReadyCount + 1;
  if (this.maxCheckReady > this.__checkReadyCount) {
    setTimeout(function () {
      if (!_self.isFinishQueueReady()) {
        _self.checkTargetReady();
      }
    }, this.checkReadyTime);
  }
}

MessageTunnel.prototype.ready = function (fn) {
  this.addFinishQueue(fn);
}

MessageTunnel.prototype.postReceipt = function (message) {
  message.source.postMessage(message.format(), message.origin);
}

MessageTunnel.prototype.addCallbackWaitingReceipt = function (message, callback) {
  var id = message.id;
  this._callbackWaitingReceipt[id] = callback;
}

MessageTunnel.prototype.doReceiptCallback = function (message) {
  var id = message.originId;
  var callback = this._callbackWaitingReceipt[id];
  delete this._callbackWaitingReceipt[id];
  if (typeof callback === 'function') {
    callback({ message: message });
  }
}

export default MessageTunnel;

function createIframe (url, callback) {
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  iframe.onload = function () {
    if (typeof callback === 'function') {
      callback(iframe)
    }
  }
  document.body.appendChild(iframe);
  return iframe;
}


function getOrigin (url) {
  var reg = /^((.+\/\/)([\w.-]+)(:\d*)?).*$/;
  var origin, m;
  if (url) {
    m = url.match(reg);
    if (m) {
      origin = m[1];
    }
  }

  return origin;
}

function isInWhiteList (origin, whiteList) {
  var originWithoutPort = origin.replace(/\:[0-9]+$/, '')
  var i = 0;
  var len = whiteList.length;
  for(; i < len; i++) {
    var reg = new RegExp('(^|\\.|//)' + whiteList[i].replace('.', '\\.') + '$');
    if (reg.test(originWithoutPort)) {
      return true;
    }
  }
}

function getHostname (origin) {
  var hostnameReg = /^(.+\/\/)?([\w.-]*@)*([\w.-]+)(:\d*)?.*$/
  var hostname, m;
  if (origin) {
    m = origin.match(hostnameReg);
    if (m) {
      hostname = m[3];
    }
  }

  return hostname;
}

function createFinishQueue (o) {
  o.__finishQueueReady = false;
  o.__finishQueue = [];

  o.isFinishQueueReady = function () {
    return this.__finishQueueReady;
  }

  o.doFinishQueue = function (data) {
    this.__finishQueueReady = true;
    this.__finishQueueData = data;
    for (var i = 0; i < this.__finishQueue.length; i++) {
      this.__finishQueue[i](data);
    }
    this.clearFinishQueue()
  }

  o.clearFinishQueue = function () {
    this.__finishQueue = [];
  }

  o.addFinishQueue = function (fn) {
    if (this.__finishQueueReady) {
      fn(this.__finishQueueData);
    } else {
      this.__finishQueue.push(fn);
    }
  }
}
