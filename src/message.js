
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
var idCreator = function () {
  return uuidPrefix.toString() + '_' + (++uuid).toString();
}

function Message (messageString) {
  if (typeof messageString === 'string') {
    // 从传入的 messageString 初始化消息对象
    this.parse(messageString);
  } else {
    // 创建一个新的消息对象
    this.autoCreate()
  }
}

Message.prototype.autoCreate = function () {
  // 简易的递增策略创建id
  this.id = idCreator();
  this.content = {};
}

Message.prototype.setOriginMessage = function (message) {
  this.originId = message.id;
  this.source = message.source;
  this.origin = message.origin || '*';
}

Message.prototype.setName = function (name) {
  this.name = name;
}

Message.prototype.setContent = function (content) {
  this.content = content;
}

Message.prototype.setSource = function (source) {
  this.source = source;
}

Message.prototype.setOrigin = function (origin) {
  this.origin = origin || '*';
}

Message.prototype.parse = function (messageString) {
  var originMessage;
  try {
    originMessage = JSON.parse(messageString)
    this.name = originMessage.name;
    this.id = originMessage.id;
    this.content = originMessage.content;
    this.originId = originMessage.originId;
  } catch (e) {}
}

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
}

export default Message;
