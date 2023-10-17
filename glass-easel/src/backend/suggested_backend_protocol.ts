import { GeneralBackendContext, Node } from '../node'
import {
  BoundingClientRect,
  GetAllComputedStylesResponses,
  GetMatchedRulesResponses,
  ScrollOffset,
  IntersectionStatus,
  Observer,
} from './mode'

interface GetWrapper<T> {
  /**
   * Get the created Context instance.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself.
   * It should be called by other modules.
   */
  get(): T
}

export interface Element<RequiredElement> {
  /**
   * Get the context object associated with the corresponding node.
   *
   * glass-easel does not understand the specific object details.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getContext(cb: (res: unknown) => void): void
  /**
   * Get the computed styles of the node.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getAllComputedStyles(cb: (res: GetAllComputedStylesResponses) => void): void
  /**
   * Get matched stylesheet rules for the node, including inline rules.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getMatchedRules(cb: (res: GetMatchedRulesResponses) => void): void
  /**
   * Get the bounding rectangle area of the node. If the node is not a regular rectangular area
   * (such as inline text or a rotated rectangle), calculate its minimum bounding rectangle area.
   *
   * If the node has no layout information, return all 0 values.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getBoundingClientRect(cb: (res: BoundingClientRect) => void): void
  /**
   * Create an IntersectionObserver to listen for intersection state changes.
   *
   * The listener should be triggered once right after set, to return the initial
   * media intersection state information.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  createIntersectionObserver(
    relativeElement: RequiredElement | null,
    relativeElementMargin: string,
    thresholds: number[],
    listener: (res: IntersectionStatus) => void,
  ): Observer
  /**
   * Get the internal scroll position of the node.
   *
   * If the node is not scrollable, return position 0 values and its own size values.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getScrollOffset(cb: (res: ScrollOffset) => void): void
  /**
   * Set the internal scroll position of the node. If the scroll position is invalid or the node does not support scrolling, ignore it.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  setScrollPosition(scrollLeft: number, scrollTop: number, duration: number): void
  replaceStyleSheetInlineStyle(inlineStyle: string): void
}

/**
 * An object provided by a custom backend. Each `Context` instance can correspond to a
 * node tree on the interface.
 */
export interface Context {
  /**
   * Create a Context instance.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself.
   * It should be called by other modules and the result should be passed to glass-easel.
   * The options are agreed upon by these modules and the backend.
   */
  createContext(
    options: unknown,
    cb: (ContextWrapper: GetWrapper<Partial<Context> & GeneralBackendContext>) => void,
  ): void

  /**
   * Set the node where the focus is. If the node is not focusable, remove the focus.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  setFocusedNode(target: Node): void
  /**
   * Get the node where the focus is.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getFocusedNode(): Node | undefined

  /**
   * Get the node at the specified coordinate position.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  elementFromPoint(left: number, top: number, cb: (node: Node) => void): void

  // StyleSheet related

  /**
   * Insert a stylesheet rule and return its corresponding rule index.
   *
   * If the stylesheet rule is invalid or the insertion fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  addStyleSheetRule(
    mediaQueryStr: string,
    selector: string,
    callback: (ruleIndex: number | null) => void,
  ): void
  /**
   * Get the stylesheet index for new rules.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  getStyleSheetIndexForNewRules(callback: (sheetIndex: number) => void): void
  /**
   * Reset the specified rule in the specified stylesheet and return its corresponding rule index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  resetStyleSheetRule(
    sheetIndex: number,
    ruleIndex: number,
    callback: (ruleIndex: number | null) => void,
  ): void
  /**
   * Change the selector of the specified rule in the specified stylesheet and return its corresponding rule index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  modifyStyleSheetRuleSelector(
    sheetIndex: number,
    ruleIndex: number,
    selector: string,
    callback: (ruleIndex: number | null) => void,
  ): void
  /**
   * Add CSS properties to the specified rule in the specified stylesheet and return last inserted property index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  // TODO: should be properties?
  addStyleSheetProperty(
    sheetIndex: number,
    ruleIndex: number,
    inlineStyle: string,
    callback: (propertyIndex: number | null) => void,
  ): void
  /**
   * Replace all CSS properties in the specified rule in the specified stylesheet and return last inserted property index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  replaceStyleSheetAllProperties(
    sheetIndex: number,
    ruleIndex: number,
    inlineStyle: string,
    callback: (propertyIndex: number | null) => void,
  ): void
  /**
   * Toggle availability of the specified CSS property in the specified rule in the specified stylesheet and return its corresponding property index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  setStyleSheetPropertyDisabled(
    sheetIndex: number,
    ruleIndex: number,
    propertyIndex: number,
    disabled: boolean,
    callback: (propertyIndex: number | null) => void,
  ): void
  /**
   * Remove the specified CSS property in the specified rule in the specified stylesheet and return its corresponding property index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  removeStyleSheetProperty(
    sheetIndex: number,
    ruleIndex: number,
    propertyIndex: number,
    callback: (propertyIndex: number | null) => void,
  ): void
  /**
   * Replace the specified CSS property in the specified rule in the specified stylesheet and return its corresponding property index.
   *
   * If it fails, return null.
   *
   * **This is a suggested interface.** glass-easel will not call this interface by itself,
   * but other related modules are likely to call it.
   */
  replaceStyleSheetProperty(
    sheetIndex: number,
    ruleIndex: number,
    propertyIndex: number,
    inlineStyle: string,
    callback: (propertyIndex: number | null) => void,
  ): void
}
