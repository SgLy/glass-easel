import {
  BM,
  BackendMode,
  type GeneralBackendContext,
  type GeneralBackendElement,
  type backend,
} from './backend'
import { Element } from './element'
import { type ShadowRoot } from './shadow_root'
import { VIRTUAL_NODE_SYMBOL, isVirtualNode } from './type_symbol'

export class VirtualNode extends Element {
  [VIRTUAL_NODE_SYMBOL]: true
  is: string

  /* istanbul ignore next */
  constructor() {
    throw new Error('Element cannot be constructed directly')
    // eslint-disable-next-line no-unreachable
    super()
  }

  protected _$initializeVirtual(
    virtualName: string,
    owner: ShadowRoot,
    nodeTreeContext: GeneralBackendContext,
    backendElement: GeneralBackendElement | null,
  ) {
    this.is = String(virtualName)
    if (BM.SHADOW || (BM.DYNAMIC && nodeTreeContext.mode === BackendMode.Shadow)) {
      const shadowRoot = owner._$backendShadowRoot
      const be =
        (backendElement as backend.Element) || shadowRoot?.createVirtualNode(virtualName) || null
      this._$initialize(true, be, owner, nodeTreeContext)
      be?.associateValue(this)
    } else {
      this._$initialize(true, backendElement, owner, nodeTreeContext)
    }
  }

  static isVirtualNode = isVirtualNode

  static create(virtualName: string, owner: ShadowRoot): VirtualNode {
    const node = Object.create(VirtualNode.prototype) as VirtualNode
    node._$initializeVirtual(virtualName, owner, owner._$nodeTreeContext, null)
    return node
  }
}

VirtualNode.prototype[VIRTUAL_NODE_SYMBOL] = true
