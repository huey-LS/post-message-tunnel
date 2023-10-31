# PostMessageTunnel

## 简介

使用`PostMessage`搭建便捷的跨域消息通信，解决跨域问题。

是本人从业务中剥离出来的框架。希望能帮助到大家。

## USAGE

#### 主窗口
```js
var messageTunnel = new PostMessageTunnel({
  whiteList: ['xxx.com'],
  origin: '*',
  target: '/child.html'
})

messageTunnel.ready(function () {
  messageTunnel.post('getUser', function ({ message }) {
    console.log(message.content.name)
    // 输出： 张三
  })
})
```

#### 子窗口
```js
var messageTunnel = new PostMessageTunnel({
  whiteList: ['xxx.com'],
  origin: '*',
  isServer: true
})

messageTunnel.ready(function () {
  messageTunnel.subscribe(function ({ message, receipt }) {
    var name = message.name;
    if (name === 'getUser') {
      receipt({ name: '张三' })
    }
  })
})
```

## TODO
1. 完善测试用例
