/* eslint-disable class-methods-use-this */

import { EventBubbleStatus, EventOptions, MutLevel } from '../event'
import { safeCallback } from '../func_arr'
import {
  BackendMode,
  BoundingClientRect,
  IntersectionStatus,
  MediaQueryStatus,
  Observer,
  ScrollOffset,
} from './mode'
import * as suggestedBackend from './suggested_backend_protocol'

export {
  BackendMode,
  BoundingClientRect,
  IntersectionStatus,
  MediaQueryStatus,
  Observer,
  ScrollOffset,
} from './mode'

/**
 * An object provided by a shadow mode backend. Each `Context` instance can correspond to a
 * node tree on the interface.
 */
export interface Context extends Partial<suggestedBackend.Context> {
  /**
   * Protocol mode. Should be an `enum BackendMode`
   */
  mode: BackendMode.Shadow
  /**
   * Destroy a Context instance.
   *
   * glass-easel will not call this interface by itself. This interface should
   * be called by other modules.
   */
  destroy(): void
  /**
   * Get width of display area of this Context.
   */
  getWindowWidth(): number
  /**
   * Get height of display area of this Context.
   */
  getWindowHeight(): number
  /**
   * Get pixel ratio of display area of this Context.
   */
  getDevicePixelRatio(): number
  /**
   * Get the current display theme of this Context, usually one of "light" or "dark".
   */
  getTheme(): string
  /**
   * Register a stylesheet.
   *
   * `path` is the stylesheet path, `content` is the corresponding CSS stylesheet.
   * The stylesheet needs to be in a format that the backend can interpret.
   *
   * If the CSS contains reference logic such as `@import`, the content of the
   * corresponding path may also be registered by another `registerStyleSheetContent`
   * call, which may be earlier or later than this registration.
   */
  registerStyleSheetContent(path: string, content: unknown): void
  /**
   * Insert a stylesheet item with content from the specified path. `styleScope` is
   * an optional scope identifier. Returns the index of the newly created stylesheet.
   *
   * If `styleScope` is not a positive integer, it should be treated as empty; when empty,
   * the stylesheet should be considered as globally active.
   */
  appendStyleSheetPath(path: string, styleScope?: number): number
  /**
   * Disable an inserted stylesheet.
   */
  disableStyleSheet(index: number): void
  /**
   * Adds a callback that should be called when the next render process is completed,
   * at the same pace as the render loop.
   *
   * Backend must ensure the callback to be asynchronous. In the callback,
   * setting new properties should trigger CSS transition animations.
   */
  render(cb: (err: Error | null) => void): void
  /**
   * Get the root node, which must be a component root node.
   */
  getRootNode(): ShadowRootContext
  /**
   * Create a fragment node. A fragment node is used to contain a sequence of nodes,
   * allowing batch insertion or removal of nodes.
   */
  createFragment(): Element
  /**
   * Set a global event listener. There should be always only one listener active.
   */
  onEvent(
    listener: (
      target: unknown,
      type: string,
      detail: unknown,
      options: EventOptions,
    ) => EventBubbleStatus,
  ): void
  /**
   * Create a `MediaQueryObserver` for listening to media query state changes.
   *
   * The listener should be triggered once right after set, to return the initial
   * media query state information.
   */
  createMediaQueryObserver(
    status: MediaQueryStatus,
    listener: (res: { matches: boolean }) => void,
  ): Observer
}

export interface Element extends Partial<suggestedBackend.Element<Element>> {
  /**
   * Release the node.
   */
  release(): void
  /**
   * Notify that the node-related values has been created, and set an associated value for the node.
   *
   * This will be called once for all nodes except text nodes.
   */
  associateValue(v: unknown): void
  /**
   * For component node, return its ShadowRootContext; otherwise, return undefined.
   */
  getShadowRoot(): ShadowRootContext | undefined
  /**
   * Append a child node.
   *
   * The inserted child node can be guaranteed to have no parent node.
   */
  appendChild(child: Element): void
  /**
   * Remove a child node. This removed child node may be reused later.
   *
   * If `index` is provided, it is guaranteed to be equal to the index of the child node
   * in the child node list.
   *
   * If `index` is not a non-negative integer, it should be treated as undefined.
   */
  removeChild(child: Element, index?: number): void
  /**
   * Insert a child node before another.
   *
   * If `index` is provided, `index` is guaranteed to be equal to the index of the `before` node in the child node list.
   *
   * If `index` is not a non-negative integer, it should be treated as undefined.
   *
   * The inserted child node can be guaranteed to have no parent node.
   */
  insertBefore(child: Element, before: Element, index?: number): void
  /**
   * Replace a child node.
   *
   * If `index` is provided, `index` is guaranteed to be equal to the index of the `oldChild` node in the child node list.
   *
   * If `index` is not a non-negative integer, it should be treated as undefined.
   *
   * The inserted child node can be guaranteed to have no parent node.
   */
  replaceChild(child: Element, oldChild: Element, index?: number): void
  /**
   * Delete `deleteCount` nodes starting from `before`, and insert all nodes contained
   * in `list` at this position.
   *
   * `list` can be guaranteed to be a fragment node. It should be emptied after
   * this operation and may be used again later.
   *
   * The inserted nodes can be guaranteed to have no parent node.
   */
  spliceBefore(before: Element, deleteCount: number, list: Element): void
  /**
   * Append all nodes contained in `list`.
   *
   * `list` can be guaranteed to be a fragment node. It should be emptied after
   * this operation and may be used again later.
   *
   * The inserted nodes can be guaranteed to have no parent node.
   */
  spliceAppend(list: Element): void
  /**
   * Delete `deleteCount` nodes starting from `before`.
   */
  spliceRemove(before: Element, deleteCount: number): void
  /**
   * Set node id.
   */
  setId(id: string): void
  /**
   * Set the node as a slot node and set the slot name.
   */
  setSlotName(slot: string): void
  /**
   * Set the target slot of the node; `undefined` means the node has no target slot;
   * `null` means the target slot of the node is empty (i.e., the composedParent of the node is empty).
   */
  setContainingSlot(slot: Element | undefined | null): void
  /**
   * Replace the target slot of the node; `null` means the target slot of the node
   * is empty (i.e., the composedParent of the node is empty).
   */
  reassignContainingSlot(oldSlot: Element | null, newSlot: Element | null): void
  /**
   * Change the slot content of the current node, delete `deleteCount` nodes
   * starting from `before`, and insert all nodes contained in `list` at this position.
   *
   * `list` can be guaranteed to be a fragment node. It should be emptied after
   * this operation and may be used again.
   *
   * The current node can be guaranteed to be a slot node.
   */
  spliceBeforeSlotNodes(before: number, deleteCount: number, list: Element): void
  /**
   * Append to the slot content of the current node, inserting all nodes contained
   * in `list` at the end.
   *
   * `list` can be guaranteed to be a fragment node. It should be emptied after
   * this operation and may be used again.
   *
   * The current node can be guaranteed to be a slot node.
   */
  spliceAppendSlotNodes(list: Element): void
  /**
   * Change the slot content of the current node, delete `deleteCount` nodes
   * starting from `before`.
   *
   * The current node can be guaranteed to be a slot node.
   */
  spliceRemoveSlotNodes(before: number, deleteCount: number): void
  /**
   * Set the node as slot-inherit.
   *
   * For a slot-inherit nodes, its children are not considered as children in the
   * composed tree, but as its subsequent sibling nodes. This allows these children
   * to have different target slots.
   *
   * A node will only be set as slot-inherit node during initialization,
   * when it has no children yet.
   */
  setInheritSlots(): void
  /**
   * Set the component node as virtual.
   *
   * The current node can be guaranteed to be a component node.
   *
   * Nodes will only be set as virtual before `associateValue` has been called.
   */
  setVirtualHost(): void
  /**
   * Add external class to the component node.
   *
   * The current node can be guaranteed to be a component node.
   *
   * Nodes will only add external class before `associateValue` has been called.
   */
  addExternalClass(className: string): void
  /**
   * Set the scope identifier of the node. For the same node, it will be set at most once.
   *
   * If styleScope is not a positive integer, it should be treated as empty.
   *
   * When matching style rules, if a selector other than class selector (such as tag name
   * selector, ID selector) is used to match this node, the stylesheet's scope
   * identifier must be empty or equal to the node's scope identifier.
   *
   * It can be guaranteed that this will only be called for component nodes and
   * hostStyleScope will not be passed.
   */
  setStyleScope(styleScope: number, hostStyleScope?: number): void
  /**
   * Set the node's style.
   *
   * This will not be called for text nodes.
   */
  setStyle(styleText: string): void
  /**
   * Add a class to the node.
   *
   * This will not be called for text nodes.
   */
  addClass(elementClass: string, styleScope?: number): void
  /**
   * Remove the class specified by name.
   *
   * This will not be called for text nodes.
   */
  removeClass(elementClass: string, styleScope?: number): void
  /**
   * Remove all classes.
   *
   * This will not be called for text nodes.
   */
  clearClasses(): void
  /**
   * Update a class alias for a node.
   *
   * This will not be called for text nodes.
   */
  setClassAlias(className: string, target: string): void
  /**
   * Set an attribute for a node. The value can be of any type.
   *
   * This will not be called for text nodes.
   */
  setAttribute(name: string, value: unknown): void
  /**
   * Remove an attribute from a node.
   *
   * This will not be called for text nodes.
   */
  removeAttribute(name: string): void
  /**
   * Set a dataset attribute for a node. The value can be of any type.
   *
   * This will not be called for text nodes.
   */
  setDataset(name: string, value: unknown): void
  /**
   * Set text content.
   *
   * This will only be called for text nodes.
   */
  setText(content: string): void
  /**
   * Synchronize data binding settings on a node. `attributeName` represents the field name;
   * `listener` represents the data binding update callback.
   *
   * This will only be called for normal nodes.
   */
  setModelBindingStat(attributeName: string, listener: ((newValue: unknown) => void) | null): void
  /**
   * Synchronize event response settings on a node. `type` represents the event name;
   * `capture` indicates whether the event response is a capture node; `mutLevel` represents the event response type:
   * - `MutLevel.None` means this is a regular response.
   * - `MutLevel.Mut` means this is a mutually exclusive response; in the current bubbling,
   * if a mutually exclusive response has already been called, subsequent mutually exclusive responses will not be called.
   * - `MutLevel.Final` means this is a final response; event bubbling should be stopped and the default event behavior will be prevented.
   *
   * This will not be called for text nodes.
   */
  setListenerStats(type: string, capture: boolean, mutLevel: MutLevel): void
}

/**
 * Represents a shadow tree context.
 */
export interface ShadowRootContext extends Element {
  /**
   * Create a regular node.
   *
   * `logicalName` is the name defined by the node itself.
   *
   * `stylingName` is the alias set when used.
   */
  createElement(logicalName: string, stylingName: string): Element
  /**
   * Create a text node.
   */
  createTextNode(content: string): Element
  /**
   * Create a component node.
   *
   * `external` indicates whether the component is an external component node.
   * External components are pre-built backend node trees that are directly
   * spliced together with other parts.
   */
  createComponent(tagName: string): Element
  /**
   * Create a virtual node.
   */
  createVirtualNode(virtualName: string): Element
}

export const enum EmptyBackendElementType {
  Fragment,
  Element,
  TextNode,
  Component,
  VirtualNode,
}

/** An empty backend implementation */
export class EmptyBackendContext implements Context {
  mode: BackendMode.Shadow = BackendMode.Shadow
  private _$styleSheetIdInc = 1
  private _$renderCallbacks: ((err: Error) => void)[] | null = null
  private _$shadowRoot: EmptyBackendShadowRootContext = new EmptyBackendShadowRootContext()

  destroy(): void {
    // empty
  }

  getWindowWidth(): number {
    return 1
  }

  getWindowHeight(): number {
    return 1
  }

  getDevicePixelRatio(): number {
    return 1
  }

  getTheme(): string {
    return 'light'
  }

  registerStyleSheetContent(_path: string, _content: unknown): void {
    // empty
  }

  appendStyleSheetPath(_path: string, _styleScope?: number): number {
    const id = this._$styleSheetIdInc
    this._$styleSheetIdInc += 1
    return id
  }

  disableStyleSheet(_index: number): void {
    // empty
  }

  render(cb: (err: Error | null) => void): void {
    if (this._$renderCallbacks) {
      this._$renderCallbacks.push(cb)
    } else {
      const callbacks = (this._$renderCallbacks = [cb])
      setTimeout(() => {
        this._$renderCallbacks = null
        callbacks.forEach((cb) => {
          safeCallback('Render Callback', cb, this, [null])
        })
      }, 16)
    }
  }

  getRootNode(): EmptyBackendShadowRootContext {
    return this._$shadowRoot
  }

  createFragment(): EmptyBackendElement {
    return new EmptyBackendElement(EmptyBackendElementType.Fragment)
  }

  onEvent(
    _listener: (
      target: unknown,
      type: string,
      detail: unknown,
      options: EventOptions,
    ) => EventBubbleStatus,
  ): void {
    // empty
  }

  createMediaQueryObserver(
    _status: MediaQueryStatus,
    _listener: (res: { matches: boolean }) => void,
  ): Observer {
    return {
      disconnect: () => {
        /* empty */
      },
    }
  }
}

/** An element for empty backend implementation */
export class EmptyBackendElement implements Element {
  private _$shadowRoot: EmptyBackendShadowRootContext | null

  constructor(type: EmptyBackendElementType) {
    if (type === EmptyBackendElementType.Component) {
      this._$shadowRoot = new EmptyBackendShadowRootContext()
    } else {
      this._$shadowRoot = null
    }
  }

  release(): void {
    // empty
  }

  associateValue(_v: unknown): void {
    // empty
  }

  getShadowRoot(): EmptyBackendShadowRootContext | undefined {
    return this._$shadowRoot || undefined
  }

  appendChild(_child: EmptyBackendElement): void {
    // empty
  }

  removeChild(_child: EmptyBackendElement, _index: number): void {
    // empty
  }

  insertBefore(_child: EmptyBackendElement, _before: EmptyBackendElement, _index: number): void {
    // empty
  }

  replaceChild(_child: EmptyBackendElement, _oldChild: EmptyBackendElement, _index?: number): void {
    // empty
  }

  spliceBefore(
    _before: EmptyBackendElement,
    _deleteCount: number,
    _list: EmptyBackendElement,
  ): void {
    // empty
  }

  spliceAppend(_list: EmptyBackendElement): void {
    // empty
  }

  spliceRemove(_before: EmptyBackendElement, _deleteCount: number): void {
    // empty
  }

  setId(_id: string): void {
    // empty
  }

  setSlotName(_name: string): void {
    // empty
  }

  setContainingSlot(_slot: EmptyBackendElement): void {
    // empty
  }

  reassignContainingSlot(_oldSlot: Element | null, _newSlot: Element | null): void {
    // empty
  }

  spliceBeforeSlotNodes(_before: number, _deleteCount: number, _list: Element): void {
    // empty
  }

  spliceRemoveSlotNodes(_before: number, _deleteCount: number): void {
    // empty
  }

  spliceAppendSlotNodes(_list: Element): void {
    // empty
  }

  setInheritSlots(): void {
    // empty
  }

  setVirtualHost(): void {
    // empty
  }

  addExternalClass(_className: string): void {
    // empty
  }

  setStyleScope(_styleScope: number): void {
    // empty
  }

  setStyle(_styleText: string): void {
    // empty
  }

  addClass(_elementClass: string, _styleScope?: number): void {
    // empty
  }

  removeClass(_elementClass: string, _styleScope?: number): void {
    // empty
  }

  clearClasses(): void {
    // empty
  }

  setClassAlias(_className: string, _target: string): void {
    // empty
  }

  setAttribute(_name: string, _value: unknown): void {
    // empty
  }

  removeAttribute(_name: string): void {
    // empty
  }

  setDataset(_name: string, _value: unknown): void {
    // empty
  }

  setText(_content: string): void {
    // empty
  }

  getBoundingClientRect(cb: (res: BoundingClientRect) => void): void {
    setTimeout(() => {
      cb({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      })
    }, 0)
  }

  getScrollOffset(cb: (res: ScrollOffset) => void): void {
    setTimeout(() => {
      cb({
        scrollLeft: 0,
        scrollTop: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      })
    }, 0)
  }

  setListenerStats(_type: string, _capture: boolean, _mutLevel: MutLevel): void {
    // empty
  }

  setModelBindingStat(
    _attributeName: string,
    _listener: ((newValue: unknown) => void) | null,
  ): void {
    // empty
  }

  createIntersectionObserver(
    _relativeElement: Element | null,
    _relativeElementMargin: string,
    _thresholds: number[],
    _listener: (res: IntersectionStatus) => void,
  ): Observer {
    return {
      disconnect: () => {
        /* empty */
      },
    }
  }

  getContext(cb: (res: unknown) => void): void {
    cb(null)
  }
}

/** A shadow root for empty backend implementation */
export class EmptyBackendShadowRootContext
  extends EmptyBackendElement
  implements ShadowRootContext
{
  // eslint-disable-next-line no-useless-constructor
  constructor() {
    super(EmptyBackendElementType.VirtualNode)
  }

  createElement(_tagName: string, _stylingName: string): EmptyBackendElement {
    return new EmptyBackendElement(EmptyBackendElementType.Element)
  }

  createTextNode(_content: string): EmptyBackendElement {
    return new EmptyBackendElement(EmptyBackendElementType.TextNode)
  }

  createComponent(_tagName: string): EmptyBackendElement {
    return new EmptyBackendElement(EmptyBackendElementType.Component)
  }

  createVirtualNode(_virtualName: string): EmptyBackendElement {
    return new EmptyBackendElement(EmptyBackendElementType.VirtualNode)
  }
}
