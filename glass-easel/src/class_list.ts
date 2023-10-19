import * as backend from './backend/backend_protocol'
import * as composedBackend from './backend/composed_backend_protocol'
import * as domlikeBackend from './backend/domlike_backend_protocol'
import { BM, BackendMode } from './backend/mode'
import { Element, GeneralComponent, GeneralBackendElement, StyleSegmentIndex } from '.'
import { MutationObserverTarget } from './mutation_observer'

const CLASS_NAME_REG_EXP = /\s+/

/**
 * The style scope identifier
 *
 * It is actually a non-negative integer.
 *
 * Specifically, `0` represents *global* scope, which means it is a global style in stylesheets.
 * However, in elements, `0` means it does not match any stylesheets other than the global styles.
 */
export type StyleScopeId = number

/**
 * Style scope manager
 */
export class StyleScopeManager {
  /** @internal */
  private _$names: string[] = ['']

  static globalScope(): StyleScopeId {
    return 0
  }

  register(name: string): StyleScopeId {
    const ret = this._$names.length
    this._$names.push(name)
    return ret
  }

  queryName(id: StyleScopeId): string | undefined {
    return this._$names[id]
  }
}

export type AliasTarget = {
  scopeId: StyleScopeId | undefined
  className: string
}

/**
 * Class manager for non-virtual `Element`
 */
export class ClassList {
  /** @internal */
  private _$elem: Element
  /** @internal */
  private _$owner: ClassList | null
  /** @internal */
  private _$defaultScope: StyleScopeId
  /** @internal */
  private _$extraScope: StyleScopeId | undefined
  /** @internal */
  private _$rootScope: StyleScopeId | undefined
  /** @internal */
  private _$externalNames: string[] | null = null
  /** @internal */
  private _$externalRawAlias: (string[] | undefined)[] | null = null
  /** @internal */
  private _$dirtyExternalNames: string[] | null = null
  /** @internal */
  private _$rawNames: string[][] = []
  /** @internal */
  private _$backendNames: string[] = []
  /** @internal */
  private _$backendNameScopes: (StyleScopeId | undefined)[] = []
  /** @internal */
  private _$backendNamesCount: number[] = []
  /** @internal */
  private _$hasAliasNames = false
  /** @internal */
  private _$prefixManager: StyleScopeManager | undefined

  constructor(
    elem: Element,
    externalNames: string[] | null,
    owner: ClassList | null,
    styleScope: number,
    extraStyleScope: number | undefined,
  ) {
    this._$elem = elem
    this._$owner = owner
    this._$defaultScope = styleScope
    this._$extraScope = extraStyleScope
    // root owner got globalScope as it's styleScope, avoid the root owner
    this._$rootScope = owner?._$owner ? owner._$rootScope : styleScope
    if (externalNames) {
      this._$externalNames = externalNames
      this._$externalRawAlias = []
    }
    if (BM.DOMLIKE || (BM.DYNAMIC && elem.getBackendMode() === BackendMode.Domlike)) {
      this._$prefixManager = elem.ownerShadowRoot
        ?.getHostNode()
        .getRootBehavior().ownerSpace.styleScopeManager
    }
  }

  /** @internal */
  private _$resolvePrefixes(
    name: string,
    cb: (scopeId: StyleScopeId | undefined, className: string) => void,
  ) {
    const owner = this._$owner
    const externalNames = owner?._$externalNames
    const externalIndex = externalNames ? externalNames.indexOf(name) : -1
    if (owner && externalIndex !== -1) {
      this._$hasAliasNames = true
      const rawAlias = owner._$externalRawAlias![externalIndex]
      if (rawAlias) {
        for (let i = 0; i < rawAlias.length; i += 1) {
          owner._$resolvePrefixes(rawAlias[i]!, cb)
        }
      }
    } else if (name[0] === '~') {
      cb(this._$rootScope, name.slice(1))
    } else if (name[0] === '^') {
      let n = name.slice(1)
      let owner: ClassList | null | undefined = this._$owner
      while (n[0] === '^') {
        n = n.slice(1)
        owner = owner?._$owner
      }
      // root owner got globalScope as it's styleScope, avoid the root owner
      const scopeId = owner?._$owner ? owner._$defaultScope : this._$rootScope
      cb(scopeId, n)
    } else {
      if (this._$extraScope !== undefined) {
        cb(this._$extraScope, name)
      }
      cb(this._$defaultScope, name)
    }
  }

  /** @internal */
  _$hasAlias(name: string): boolean {
    return !!this._$externalNames && this._$externalNames.includes(name)
  }

  /** @internal */
  _$setAlias(name: string, target: string) {
    if (!this._$externalNames) return
    const slices = String(target)
      .split(CLASS_NAME_REG_EXP)
      .filter((s) => s !== '') // split result could be [ '' ]
    const externalIndex = this._$externalNames.indexOf(name)
    if (externalIndex === -1) return
    this._$dirtyExternalNames = this._$dirtyExternalNames || []
    this._$dirtyExternalNames.push(name)
    this._$externalRawAlias![externalIndex] = slices
  }

  /** @internal */
  _$getAlias(name: string): string | undefined {
    if (!this._$externalNames) return undefined
    const externalIndex = this._$externalNames.indexOf(name)
    if (externalIndex === -1) return undefined
    return (this._$externalRawAlias![externalIndex] || []).join(' ')
  }

  /** @internal */
  _$spreadAliasUpdate() {
    if (!this._$dirtyExternalNames) return
    const dirtyExternalNames = this._$dirtyExternalNames
    this._$dirtyExternalNames = null
    const callClassListUpdate = (elem: Element) => {
      const classList = elem.classList
      if (classList) {
        if (classList._$hasAliasNames) {
          const externalNames = classList._$externalNames
          if (externalNames) {
            for (let externalIndex = 0; externalIndex < externalNames.length; externalIndex += 1) {
              const externalRawAlias = classList._$externalRawAlias![externalIndex] || []
              for (let i = 0; i < dirtyExternalNames.length; i += 1) {
                if (externalRawAlias.includes(dirtyExternalNames[i]!)) {
                  classList._$dirtyExternalNames = classList._$dirtyExternalNames || []
                  classList._$dirtyExternalNames.push(externalNames[externalIndex]!)
                }
              }
            }
            classList._$spreadAliasUpdate()
          }
          const shouldUpdate = classList._$rawNames.some((names) =>
            names.some((name) => dirtyExternalNames.includes(name)),
          )
          if (shouldUpdate) {
            classList._$updateResolvedNames()
          }
        }
      }
      const children = elem.childNodes
      children.forEach((child) => {
        if (child instanceof Element) callClassListUpdate(child)
      })
    }
    const comp = this._$elem as GeneralComponent
    if (comp._$external === false) {
      callClassListUpdate(comp.shadowRoot as Element)
    }
  }

  /** @internal */
  private _$updateResolvedNames() {
    const backendElement = this._$elem._$backendElement
    if (!backendElement) return
    const rawNames = this._$rawNames
    const oldBackendNames = this._$backendNames
    const oldBackendNameScopes = this._$backendNameScopes
    const oldBackendNamesCount = this._$backendNamesCount

    const newBackendNames: string[] = []
    const newBackendNameScopes: (StyleScopeId | undefined)[] = []
    const newBackendNamesCount: number[] = []

    rawNames.forEach((names) =>
      names.forEach((rawName) => {
        this._$resolvePrefixes(rawName, (scopeId, className) => {
          for (let i = 0; i < newBackendNames.length; i += 1) {
            if (className === newBackendNames[i] && scopeId === newBackendNameScopes[i]) {
              newBackendNamesCount[i] += 1
              return
            }
          }
          newBackendNames.push(className)
          newBackendNameScopes.push(scopeId)
          newBackendNamesCount.push(1)
        })
      }),
    )

    for (let i = 0; i < newBackendNames.length; i += 1) {
      let found = false
      for (let j = 0; j < oldBackendNames.length; j += 1) {
        if (
          newBackendNames[i] === oldBackendNames[j] &&
          newBackendNameScopes[i] === oldBackendNameScopes[j]
        ) {
          found = true
          oldBackendNamesCount[j] = 0 // mark as exists
          break
        }
      }
      if (!found) {
        this._$addClassToBackend(newBackendNames[i]!, newBackendNameScopes[i], backendElement)
      }
    }
    for (let j = 0; j < oldBackendNames.length; j += 1) {
      // 0 means old exists
      if (oldBackendNamesCount[j] !== 0) {
        this._$removeClassFromBackend(oldBackendNames[j]!, oldBackendNameScopes[j], backendElement)
      }
    }

    this._$backendNames = newBackendNames
    this._$backendNameScopes = newBackendNameScopes
    this._$backendNamesCount = newBackendNamesCount
  }

  /** @internal */
  private _$addClassToBackend(
    name: string,
    scope: StyleScopeId | undefined,
    e: GeneralBackendElement,
  ) {
    if (BM.DOMLIKE || (BM.DYNAMIC && this._$elem.getBackendMode() === BackendMode.Domlike)) {
      const prefix = scope === undefined ? '' : this._$prefixManager?.queryName(scope)
      const val = prefix ? `${prefix}--${name}` : name
      ;(e as domlikeBackend.Element).classList.add(val)
    } else {
      ;(e as backend.Element | composedBackend.Element).addClass(name, scope)
    }
  }

  /** @internal */
  private _$removeClassFromBackend(
    name: string,
    scope: StyleScopeId | undefined,
    e: GeneralBackendElement,
  ) {
    if (BM.DOMLIKE || (BM.DYNAMIC && this._$elem.getBackendMode() === BackendMode.Domlike)) {
      const prefix = scope && this._$prefixManager?.queryName(scope)
      const val = prefix ? `${prefix}--${name}` : name
      ;(e as domlikeBackend.Element).classList.remove(val)
    } else {
      ;(e as backend.Element | composedBackend.Element).removeClass(name, scope)
    }
  }

  /** @internal */
  private _$addClass(
    name: string,
    scopeId: StyleScopeId | undefined,
    backendElement: GeneralBackendElement,
  ) {
    const oldClassNames = this._$backendNames
    const oldScopeIds = this._$backendNameScopes
    const classNamesCount = this._$backendNamesCount
    let found = false
    for (let j = 0; j < oldClassNames.length; j += 1) {
      if (name === oldClassNames[j] && scopeId === oldScopeIds[j]) {
        found = true
        classNamesCount[j] += 1
        break
      }
    }
    if (!found) {
      oldClassNames.push(name)
      oldScopeIds.push(scopeId)
      classNamesCount.push(1)
      this._$addClassToBackend(name, scopeId, backendElement)
    }
  }

  /** @internal */
  private _$removeClass(
    name: string,
    scopeId: StyleScopeId | undefined,
    backendElement: GeneralBackendElement,
  ) {
    const oldClassNames = this._$backendNames
    const oldScopeIds = this._$backendNameScopes
    const classNamesCount = this._$backendNamesCount
    for (let j = 0; j < oldClassNames.length; j += 1) {
      if (name === oldClassNames[j] && scopeId === oldScopeIds[j]) {
        if (classNamesCount[j]! <= 1) {
          oldClassNames.splice(j, 1)
          oldScopeIds.splice(j, 1)
          classNamesCount.splice(j, 1)
          this._$removeClassFromBackend(name, scopeId, backendElement)
        } else {
          classNamesCount[j] -= 1
        }
        break
      }
    }
  }

  toggle(name: string, force?: boolean, segmentIndex: StyleSegmentIndex = StyleSegmentIndex.MAIN) {
    if (CLASS_NAME_REG_EXP.test(name)) throw new Error('Class name contains space characters.')

    const backendElement = this._$elem.getBackendElement()
    const rawClassIndex = this._$rawNames[segmentIndex]
      ? this._$rawNames[segmentIndex]!.indexOf(name)
      : -1
    const isAdd = force === undefined ? rawClassIndex === -1 : !!force

    let changed = false
    if (isAdd) {
      if (rawClassIndex === -1) {
        const rawNames = this._$rawNames
        if (!rawNames[segmentIndex]) {
          rawNames[segmentIndex] = []
        }
        const names = rawNames[segmentIndex]!
        names.push(name)
        if (backendElement) {
          this._$resolvePrefixes(name, (scopeId, className) => {
            this._$addClass(className, scopeId, backendElement)
          })
        }
        changed = true
      }
    } else if (rawClassIndex !== -1) {
      const names = this._$rawNames[segmentIndex]
      if (names) names.splice(rawClassIndex, 1)
      if (backendElement) {
        this._$resolvePrefixes(name, (scopeId, className) => {
          this._$removeClass(className, scopeId, backendElement)
        })
      }
      changed = true
    }
    if (changed) {
      const elem = this._$elem
      if (elem._$mutationObserverTarget) {
        MutationObserverTarget.callAttrObservers(elem, {
          type: 'properties',
          target: elem,
          attributeName: 'class',
        })
      }
    }
  }

  contains(name: string, segmentIndex: StyleSegmentIndex = StyleSegmentIndex.MAIN): boolean {
    const names = this._$rawNames[segmentIndex] || []
    for (let i = 0; i < names.length; i += 1) {
      const rn = names[i]!
      if (rn[0] === '~') {
        const n = rn.slice(1)
        if (n === name) return true
      } else if (rn[0] === '^') {
        let n = rn.slice(1)
        while (n[0] === '^') {
          n = n.slice(1)
        }
        if (n === name) return true
      } else {
        if (rn === name) return true
      }
    }
    return false
  }

  /** Set class string */
  setClassNames(names: string, segmentIndex: StyleSegmentIndex = StyleSegmentIndex.MAIN) {
    let n: string
    if (names === undefined || names === null) n = ''
    else n = String(names)
    const newRawNames = n.split(CLASS_NAME_REG_EXP).filter((s) => s !== '') // split result could be [ '' ]

    const rawNames = this._$rawNames
    const elem = this._$elem

    rawNames[segmentIndex] = newRawNames

    this._$updateResolvedNames()

    if (elem._$mutationObserverTarget) {
      MutationObserverTarget.callAttrObservers(elem, {
        type: 'properties',
        target: elem,
        attributeName: 'class',
      })
    }
  }

  /** Returns space separated class string */
  getClassNames(segmentIndex: StyleSegmentIndex = StyleSegmentIndex.MAIN): string {
    const names = this._$rawNames[segmentIndex] || []
    return names ? names.join(' ') : ''
  }
}
