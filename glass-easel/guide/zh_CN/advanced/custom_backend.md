# 自定义后端

# 渲染后端

glass-easel 不仅可以用于 DOM 环境下，它还可以支持其他的 **渲染后端** 。

glass-easel 可以将它生成的节点树传递给渲染后端。最常见的渲染后端就是 DOM ： glass-easel 可以将节点树转换为一些 DOM 调用（如 `document.createElement` 等），然后在浏览器的页面上展示出来。除此之外，在非浏览器环境下，也可以自行实现一些其他渲染后端，接收 glass-easel 生成的节点树、展示界面。

渲染后端必须实现自定义后端协议。后端协议以 TypeScript 为基础语言，接口形式为面向对象形式。

这个协议有三种模式，支持其中任意一种即可：

1. __Composed Mode__
   * 主 TypeScript 接口：`glassEasel.composedBackend.Context`

   首选的协议，相对简单易用。在这个模式下，glass-easel 工作在 shadow tree 和 composed tree 上。

1. __Shadow Mode__
   * 主 TypeScript 接口：`glassEasel.backend.Context`

   针对 Shadow Tree 的协议，整体性能通常是最优的，但是协议本身比较复杂。在这个模式下，glass-easel 仅工作在 shadow tree 上，由后端完成 shadow tree 到 composed tree 的拼接。

1. __DOM-like Mode__
   * 主 TypeScript 接口：`glassEasel.domlikeBackend.Context`

   适用于 DOM 的协议，通常只应该用于适配 DOM 接口

实现渲染后端时，需要实现对应的 TypeScript 接口，例如：

```ts
// 一个渲染后端实现
class MyCustomBackend implements glassEasel.composedBackend.Context {
  // ...
}
```

# 使用自定义的渲染后端

要使用一个渲染后端，需要在根组件创建时传入对应的 `Context` 对象：

```js
// 创建后端实例
const myCustomBackend = new MyCustomBackend()

// 连接事件系统
backendContext.onEvent((target, type, detail, options) => {
  const ev = new glassEasel.Event(type, detail, options)
  glassEasel.Event.dispatchEvent(target, ev)
  return ev.defaultPrevented()
    ? glassEasel.EventBubbleStatus.NoDefault
    : glassEasel.EventBubbleStatus.Normal
})

// 创建根组件实例
const rootComponent = glassEasel.Component.createWithContext('body', helloWorld, myCustomBackend)

// 将组件插入到渲染后端的节点树中
const rootNode = myCustomBackend.getRootNode()
const placeholder = myCustomBackend.createElement('placeholder')
rootNode.appendChild(placeholder)
glassEasel.Element.replaceDocumentElement(rootComponent, rootNode, placeholder)
placeholder.release()
rootNode.release()
```

## 其他说明
* 后端节点分为以下类型：
  * 普通节点；
  * 文本节点（仅承载文本，无子节点）；
  * 片段节点（用于临时承载节点树片段）；
  * 组件节点（仅 Shadow Mode，拥有自己的 shadow tree，可为虚拟或非虚拟）；
  * 组件根节点（仅 Shadow Mode，组件的 shadowRoot 节点）；
  * 虚拟节点（仅 Shadow Mode）。
* glass-easel 可以保证一个节点的祖先节点列表中一定没有其自身（即不会成环）。
