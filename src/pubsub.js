function PubSub () {
  this._listeners = []
}

PubSub.prototype.publish = function (data) {
  var listeners = this._listeners;
  var i = 0;
  var len = listeners.length;
  for (; i < len; i++) {
    listeners[i](data);
  }
}

PubSub.prototype.subscribe = function (listener) {
  var _self = this;
  if (typeof listener === 'function') {
    this._listeners.push(listener);
  }
  return function () {
    _self.unsubscribe(listener);
  }
}

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
}

export default PubSub;
