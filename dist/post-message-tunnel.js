(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.PostMessageTunnel = factory());
}(this, function () { 'use strict';

  /**
   * Message Scheme
   * @attribute name {string} - message name
   * @attribute id {string} - message id
   * @attribute content {string}
   * @attribute originId {string} - for receipt
   */
  var uuidPrefix = 1;

  if (typeof window !== 'undefined') {
    if (window.POST_MESSAGE_ID_PREFIX) {
      uuidPrefix = window.POST_MESSAGE_ID_PREFIX + 1;
    }

    window.POST_MESSAGE_ID_PREFIX = uuidPrefix;
  }

  var uuid = 0;

  var idCreator = function idCreator() {
    return uuidPrefix.toString() + '_' + (++uuid).toString();
  };

  function Message(messageString) {
    if (typeof messageString === 'string') {
      // 从传入的 messageString 初始化消息对象
      this.parse(messageString);
    } else {
      // 创建一个新的消息对象
      this.autoCreate();
    }
  }

  Message.prototype.autoCreate = function () {
    // 简易的递增策略创建id
    this.id = idCreator();
    this.content = {};
  };

  Message.prototype.setOriginMessage = function (message) {
    this.originId = message.id;
    this.source = message.source;
    this.origin = message.origin || '*';
  };

  Message.prototype.setName = function (name) {
    this.name = name;
  };

  Message.prototype.setContent = function (content) {
    this.content = content;
  };

  Message.prototype.setSource = function (source) {
    this.source = source;
  };

  Message.prototype.setOrigin = function (origin) {
    this.origin = origin || '*';
  };

  Message.prototype.parse = function (messageString) {
    var originMessage;

    try {
      originMessage = JSON.parse(messageString);
      this.name = originMessage.name;
      this.id = originMessage.id;
      this.content = originMessage.content;
      this.originId = originMessage.originId;
    } catch (e) {}
  };

  Message.prototype.format = function () {
    var json = {
      name: this.name,
      id: this.id,
      content: this.content
    };

    if (this.originId) {
      json.originId = this.originId;
    }

    return JSON.stringify(json);
  };

  function PubSub() {
    this._listeners = [];
  }

  PubSub.prototype.publish = function (data) {
    var listeners = this._listeners;
    var i = 0;
    var len = listeners.length;

    for (; i < len; i++) {
      listeners[i](data);
    }
  };

  PubSub.prototype.subscribe = function (listener) {
    var _self = this;

    if (typeof listener === 'function') {
      this._listeners.push(listener);
    }

    return function () {
      _self.unsubscribe(listener);
    };
  };

  PubSub.prototype.unsubscribe = function (listener) {
    var listeners, i, len;

    if (typeof listener === 'function') {
      listeners = this._listeners;
      i = 0;
      len = listeners.length;

      for (; i < len; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1);
          return listener;
        }
      }
    }
  };

  function log() {
    if (typeof console !== 'undefined' && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ;
  }
  function warn() {
    if (typeof console !== 'undefined' && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ;
  }
  function error() {
    if (typeof console !== 'undefined' && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ;
  }
  var logger = {
    log: log,
    warn: warn,
    error: error
  };

  var EVENT_NAME_CHECK_READY = '@message/check_ready';
  var EVENT_NAME_RECEIPT = '@message/receipt';

  var MessageTunnel = function MessageTunnel(options) {
    options = options || {};
    createFinishQueue(this);
    this.pubSub = new PubSub();
    this.maxCheckReady = options.maxCheckReady || 2;
    this.checkReadyTime = options.checkReadyTime || 1000;
    this.__checkReadyCount = 0;

    if (options.target) {
      this.createTarget(options.target, options.origin);
    } else if (!options.isServer) {
      logger.log('message: can not post without target');
    }

    if (!options.whiteList) {
      logger.warn('message: no whiteList is not safe. Will not start listening');
    } else {
      this.listenMessage();
    }

    this.__listeners = [];
    this.whiteList = options.whiteList || [];
    this._callbackWaitingReceipt = {};
  };

  MessageTunnel.prototype.listenMessage = function () {
    var _self = this;

    var callback = function callback(event) {
      event = event || window.event;
      var origin = event.origin;
      var source = event.source; // var originHostname = getHostname(origin);

      var data = event.data;
      if (!origin || origin === 'null') origin = '*';
      logger.log('message: receive unresolved message', data);

      if (isInWhiteList(origin, _self.whiteList)) {
        var message = new Message(data);
        message.setSource(source);
        message.setOrigin(origin);
        logger.log('message: receive', message);
        var receiptHasCalled = false;

        var receipt = function receipt(content) {
          if (receiptHasCalled) {
            logger.log('message: receipt cannot be called multiple times');
            return false;
          }

          receiptHasCalled = true;
          var receiptMessage = new Message();
          receiptMessage.setOriginMessage(message);
          receiptMessage.setName(EVENT_NAME_RECEIPT);
          receiptMessage.setContent(content);

          _self.postReceipt(receiptMessage);
        };

        if (message.name === EVENT_NAME_CHECK_READY) {
          // 如果是检测是否完成的消息
          // _self.postReceipt(message);
          _self.createTarget(source, origin);

          receipt();
        } else if (message.name === EVENT_NAME_RECEIPT) {
          // 如果是回执
          logger.log('message: goto do receipt');

          _self.doReceiptCallback(message);
        } else {
          // 只响应对应的目标的 message
          logger.log('message: goto custom action');

          if (!_self.target || source === _self.target) {
            logger.log('message: emit custom action');

            _self.emit(message, receipt);
          }
        }
      }
    };

    if (window.addEventListener) {
      logger.log('use window.addEventListener');
      window.addEventListener('message', callback, false);
    } else if (window.attachEvent) {
      logger.log('use window.attachEvent');
      window.attachEvent('message', callback);
    }
  };

  MessageTunnel.prototype.createTarget = function (target, origin) {
    var _self = this;

    logger.log('message: create target', target, origin);
    if (this.targetIframe || this._target) return false;

    if (typeof target === 'string') {
      this._targetOrigin = getOrigin(target);
      createIframe(target, function (iframe) {
        logger.log('message: iframe onload', target);
        _self.targetIframe = iframe;

        _self.checkTargetReady();
      });
    } else {
      _self.targetIframe = iframe;
      _self._targetOrigin = origin;

      _self.checkTargetReady();
    }
  };

  MessageTunnel.prototype.subscribe = function (fn) {
    this.pubSub.subscribe(fn);
  };

  MessageTunnel.prototype.emit = function (message, receipt) {
    this.pubSub.publish({
      message: message,
      receipt: receipt
    });
  };

  MessageTunnel.prototype.post = function (name, content, callback) {
    logger.log('message will set post', name, content, callback);

    var _self = this;

    if (typeof content === 'function') {
      callback = content;
      content = {};
    }

    var message = new Message();
    message.setName(name);
    message.setContent(content);
    logger.log('message set post', message, callback);
    this.ready(function () {
      _self.postMessage(message, callback);
    });
  };

  MessageTunnel.prototype.postMessage = function (message, callback) {
    logger.log('message: will post message', message);
    this.addCallbackWaitingReceipt(message, callback);
    this.target.postMessage(message.format(), this._targetOrigin);
  };

  MessageTunnel.prototype.checkTargetReady = function () {
    var message = new Message();

    var _self = this;

    message.setName(EVENT_NAME_CHECK_READY);
    this.addCallbackWaitingReceipt(message, function () {
      // target frame complete
      _self.target = _self.targetIframe.contentWindow;

      _self.doFinishQueue();
    });
    logger.log('message: will post check ready message');
    this.targetIframe.contentWindow.postMessage(message.format(), this._targetOrigin);
    this.__checkReadyCount = this.__checkReadyCount + 1;

    if (this.maxCheckReady > this.__checkReadyCount) {
      setTimeout(function () {
        if (!_self.isFinishQueueReady()) {
          _self.checkTargetReady();
        }
      }, this.checkReadyTime);
    }
  };

  MessageTunnel.prototype.ready = function (fn) {
    this.addFinishQueue(fn);
  };

  MessageTunnel.prototype.postReceipt = function (message) {
    logger.log('message: will post receipt', message);

    try {
      message.source.postMessage(message.format(), message.origin);
    } catch (e) {
      logger.error(e);
      logger.log(message.format(), message.origin);
    }
  };

  MessageTunnel.prototype.addCallbackWaitingReceipt = function (message, callback) {
    var id = message.id;
    this._callbackWaitingReceipt[id] = callback;
    logger.log('message add receipt callback', id, callback);
  };

  MessageTunnel.prototype.doReceiptCallback = function (message) {
    var id = message.originId;
    var callback = this._callbackWaitingReceipt[id];
    logger.log('message do receipt', id, callback);
    delete this._callbackWaitingReceipt[id];

    if (typeof callback === 'function') {
      logger.log('message do receipt callback', id, message);

      try {
        callback({
          message: message
        });
      } catch (e) {
        logger.error(e);
      }
    }
  };

  function createIframe(url, callback) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;

    iframe.onload = function () {
      if (typeof callback === 'function') {
        callback(iframe);
      }
    };

    document.body.appendChild(iframe);
    return iframe;
  }

  function getOrigin(url) {
    var reg = /^((.+\/\/)([\w.-]+)(:\d*)?).*$/;
    var origin, m;

    if (url) {
      m = url.match(reg);

      if (m) {
        origin = m[1];
      }
    }

    return origin || '*';
  }

  function isInWhiteList(origin, whiteList) {
    if (~whiteList.indexOf('*')) return true;
    var originWithoutPort = origin.replace(/\:[0-9]+$/, '');
    var i = 0;
    var len = whiteList.length;

    for (; i < len; i++) {
      var reg = new RegExp('(^|\\.|//)' + whiteList[i].replace('.', '\\.') + '$');

      if (reg.test(originWithoutPort)) {
        return true;
      }
    }
  }

  function createFinishQueue(o) {
    o.__finishQueueReady = false;
    o.__finishQueue = [];

    o.isFinishQueueReady = function () {
      return this.__finishQueueReady;
    };

    o.doFinishQueue = function (data) {
      this.__finishQueueReady = true;
      this.__finishQueueData = data;

      for (var i = 0; i < this.__finishQueue.length; i++) {
        this.__finishQueue[i](data);
      }

      this.clearFinishQueue();
    };

    o.clearFinishQueue = function () {
      this.__finishQueue = [];
    };

    o.addFinishQueue = function (fn) {
      if (this.__finishQueueReady) {
        fn(this.__finishQueueData);
      } else {
        this.__finishQueue.push(fn);
      }
    };
  }

  return MessageTunnel;

}));
