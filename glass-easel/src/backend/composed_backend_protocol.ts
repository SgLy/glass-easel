/* eslint-disable class-methods-use-this */

import { EventOptions, EventBubbleStatus, MutLevel } from '../event'
import { safeCallback } from '../func_arr'
import {
  BackendMode,
  BoundingClientRect,
  ScrollOffset,
  Observer,
  MediaQueryStatus,
  IntersectionStatus,
} from './mode'
import { Element as GlassEaselElement } from '../element'
import * as suggestedBackend from './suggested_backend_protocol'

/**
 * An object provided by a composed mode backend. Each `Context` instance can correspond to a
 * node tree on the interface.
 */
export interface Context extends Partial<suggestedBackend.Context> {
  /**
   * Protocol mode. Should be an `enum BackendMode`
   */
  mode: BackendMode.Composed
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
   * Get the root node, which must be a regular node.
   */
  getRootNode(): Element
  /**
   * Create a regular node.
   */
  createElement(logicalName: string, stylingName: string): Element
  /**
   * Create a text node.
   */
  createTextNode(content: string): Element
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
   * Set the scope identifier of the node. For the same node, it will be set at most once.
   *
   * If styleScope is not a positive integer, it should be treated as empty.
   *
   * When matching style rules, if a selector other than class selector (such as tag name
   * selector, ID selector) is used to match this node, the stylesheet's scope
   * identifier must be empty or equal to the node's scope identifier.
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
   * If styleScope is not a non-negative integer, it should be treated as empty.
   *
   * When matching style rules, if this class is used to match this node, the
   * stylesheet's scope identifier must be empty or equal to this `styleScope`.
   *
   * This will not be called for text nodes.
   */
  addClass(elementClass: string, styleScope?: number): void
  /**
   * Remove the class specified by both name and styleScope.
   *
   * If styleScope is not a non-negative integer, it should be treated as empty.
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

/** An empty backend implementation */
export class EmptyComposedBackendContext implements Context {
  mode: BackendMode.Composed = BackendMode.Composed
  private _$styleSheetIdInc = 1
  private _$renderCallbacks: ((err: Error) => void)[] | null = null
  private _$rootNode: EmptyComposedBackendElement = new EmptyComposedBackendElement()

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

  getRootNode(): EmptyComposedBackendElement {
    return this._$rootNode
  }

  createElement(_tagName: string, _stylingName: string): EmptyComposedBackendElement {
    return new EmptyComposedBackendElement()
  }

  createTextNode(_tagName: string): EmptyComposedBackendElement {
    return new EmptyComposedBackendElement()
  }

  createFragment(): EmptyComposedBackendElement {
    return new EmptyComposedBackendElement()
  }

  onEvent(
    _listener: (
      target: GlassEaselElement,
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
export class EmptyComposedBackendElement implements Element {
  release(): void {
    // empty
  }

  associateValue(_v: unknown): void {
    // empty
  }

  appendChild(_child: EmptyComposedBackendElement): void {
    // empty
  }

  removeChild(_child: EmptyComposedBackendElement, _index?: number): void {
    // empty
  }

  insertBefore(
    _child: EmptyComposedBackendElement,
    _before: EmptyComposedBackendElement,
    _index?: number,
  ): void {
    // empty
  }

  replaceChild(
    _child: EmptyComposedBackendElement,
    _oldChild: EmptyComposedBackendElement,
    _index?: number,
  ): void {
    // empty
  }

  spliceBefore(
    _before: EmptyComposedBackendElement,
    _deleteCount: number,
    _list: EmptyComposedBackendElement,
  ): void {
    // empty
  }

  spliceAppend(_list: EmptyComposedBackendElement): void {
    // empty
  }

  spliceRemove(_before: EmptyComposedBackendElement, _deleteCount: number): void {
    // empty
  }

  setId(_id: string): void {
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

  setAttribute(_name: string, _value: unknown): void {
    // empty
  }

  removeAttribute(_name: string): void {
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
    _relativeElement: EmptyComposedBackendElement | null,
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
