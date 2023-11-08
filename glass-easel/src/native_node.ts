import {
  BM,
  BackendMode,
  type GeneralBackendElement,
  type backend,
  type composedBackend,
  type domlikeBackend,
} from './backend'
import { ClassList, StyleScopeManager } from './class_list'
import { type DataValue, type ModelBindingListener } from './data_proxy'
import { Element } from './element'
import { globalOptions } from './global_options'
import { type ShadowRoot } from './shadow_root'
import { NATIVE_NODE_SYMBOL, isNativeNode } from './type_symbol'

export class NativeNode extends Element {
  [NATIVE_NODE_SYMBOL]: true
  is: string
  private _$modelBindingListeners?: { [name: string]: ModelBindingListener }

  /* istanbul ignore next */
  constructor() {
    throw new Error('Element cannot be constructed directly')
    // eslint-disable-next-line no-unreachable
    super()
  }

  static isNativeNode = isNativeNode

  static create(
    tagName: string,
    owner: ShadowRoot,
    stylingName?: string,
    placeholderHandlerRemover?: () => void,
  ): NativeNode {
    const node = Object.create(NativeNode.prototype) as NativeNode
    node.is = tagName
    node._$placeholderHandlerRemover = placeholderHandlerRemover
    const nodeTreeContext = owner._$nodeTreeContext
    let backendElement: GeneralBackendElement | null
    if (BM.DOMLIKE || (BM.DYNAMIC && owner.getBackendMode() === BackendMode.Domlike)) {
      backendElement = (nodeTreeContext as domlikeBackend.Context).document.createElement(tagName)
    } else if (BM.SHADOW || (BM.DYNAMIC && owner.getBackendMode() === BackendMode.Shadow)) {
      const backend = owner._$backendShadowRoot
      backendElement = backend?.createElement(tagName, stylingName ?? tagName) || null
    } else {
      const backend = nodeTreeContext as composedBackend.Context
      backendElement = backend.createElement(tagName, stylingName ?? tagName)
    }
    node._$initialize(false, backendElement, owner, nodeTreeContext)
    const ownerOptions = owner.getHostNode().getComponentOptions()
    const styleScope = ownerOptions.styleScope ?? StyleScopeManager.globalScope()
    const extraStyleScope = owner ? ownerOptions.extraStyleScope ?? undefined : undefined
    node.classList = new ClassList(
      node,
      null,
      owner ? owner.getHostNode().classList : null,
      styleScope,
      extraStyleScope,
    )
    if (owner && backendElement) {
      const styleScope =
        owner.getHostNode()._$definition._$options.styleScope ?? StyleScopeManager.globalScope()
      if (styleScope) {
        if (!(BM.DOMLIKE || (BM.DYNAMIC && owner.getBackendMode() === BackendMode.Domlike))) {
          ;(backendElement as backend.Element | composedBackend.Element).setStyleScope(styleScope)
        }
      }
      if (globalOptions.writeExtraInfoToAttr) {
        const prefix = owner
          .getHostNode()
          ._$behavior.ownerSpace?.styleScopeManager.queryName(styleScope)
        if (prefix) {
          backendElement.setAttribute('exparser:info-class-prefix', `${prefix}--`)
        }
      }
    }
    if (backendElement) {
      if (!(BM.DOMLIKE || (BM.DYNAMIC && owner.getBackendMode() === BackendMode.Domlike))) {
        ;(backendElement as backend.Element | composedBackend.Element).associateValue(node)
      } else {
        ;(owner._$nodeTreeContext as domlikeBackend.Context).associateValue(
          backendElement as domlikeBackend.Element,
          node,
        )
      }
    }
    return node
  }

  setModelBindingListener(propName: string, listener: ModelBindingListener) {
    if (!this._$modelBindingListeners) {
      this._$modelBindingListeners = Object.create(null) as { [name: string]: ModelBindingListener }
    }
    if (!this._$modelBindingListeners[propName]) {
      const backendElement = this.getBackendElement()
      if (backendElement) {
        const listener = (value: DataValue) => {
          const listener = this._$modelBindingListeners?.[propName]
          if (listener) {
            listener.call(this, value)
          }
        }
        if (BM.DOMLIKE || (BM.DYNAMIC && this.getBackendMode() === BackendMode.Domlike)) {
          ;(this.getBackendContext() as domlikeBackend.Context).setModelBindingStat(
            backendElement as domlikeBackend.Element,
            propName,
            listener,
          )
        } else {
          ;(backendElement as backend.Element | composedBackend.Element).setModelBindingStat(
            propName,
            listener,
          )
        }
      }
    }
    this._$modelBindingListeners[propName] = listener
  }
}

NativeNode.prototype[NATIVE_NODE_SYMBOL] = true
