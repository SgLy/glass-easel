import { tmpl, composedBackend, domBackend } from '../base/env'
import * as glassEasel from '../../src'
import { virtual as matchElementWithDom } from '../base/match'

const domHtml = (elem: glassEasel.Element): string => {
  const domElem = elem.getBackendElement() as unknown as Element
  return domElem.innerHTML
}

type FirstArgument<T> = T extends (...args: infer R) => any ? R[0] : never
type ComponentWaitingListener = Exclude<
  FirstArgument<glassEasel.ComponentSpace['setComponentWaitingListener']>,
  null
>

const testCases = (testBackend: glassEasel.GeneralBackendContext) => {
  const componentSpace = new glassEasel.ComponentSpace()
  componentSpace.updateComponentOptions({
    writeFieldsToNode: true,
    writeIdToDOM: true,
  })
  componentSpace.defineComponent({
    is: '',
  })

  test('using simple placeholder and waiting', () => {
    const componentSpace = new glassEasel.ComponentSpace()
    componentSpace.updateComponentOptions({
      writeFieldsToNode: true,
      writeIdToDOM: true,
    })
    componentSpace.setGlobalUsingComponent('', componentSpace.defineComponent({ is: '' }))

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener = jest.fn((() => {}) as ComponentWaitingListener)
    componentSpace.setComponentWaitingListener(listener)

    const def = componentSpace
      .define()
      .placeholders({
        child: '',
      })
      .definition({
        using: {
          child: 'placeholder/simple/child',
          'child-another': 'placeholder/simple/child',
        },
        template: tmpl(`
          <div>
            <child>
              <span />
            </child>
            <child-another wx:if="{{b}}" id="b" />
          </div>
        `),
      })
      .registerComponent()
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenNthCalledWith(1, false, 'placeholder/simple/child', elem)
    expect(domHtml(elem)).toBe('<div><child><span></span></child></div>')
    matchElementWithDom(elem)

    componentSpace.defineComponent({
      is: 'placeholder/simple/child',
      template: tmpl('child<div><slot/></div>'),
    })
    expect(domHtml(elem)).toBe('<div><child>child<div><span></span></div></child></div>')
    matchElementWithDom(elem)

    elem.setData({
      b: true,
    })
    expect(domHtml(elem)).toBe(
      '<div><child>child<div><span></span></div></child><child-another id="b"></child-another></div>',
    )
    matchElementWithDom(elem)
  })

  test('using another component as placeholder', () => {
    const componentSpace = new glassEasel.ComponentSpace()
    const viewDef = componentSpace.define('view').registerComponent()
    componentSpace.setGlobalUsingComponent('view', viewDef)

    const def = componentSpace
      .define()
      .placeholders({
        child: 'view',
      })
      .definition({
        using: {
          child: 'placeholder/simple/child',
        },
        template: tmpl('<child>test</child>'),
      })
      .registerComponent()
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(domHtml(elem)).toBe('<child>test</child>')
    matchElementWithDom(elem)
  })

  test('group register other components as placeholders', () => {
    const componentSpace = new glassEasel.ComponentSpace()
    componentSpace.setGlobalUsingComponent('', componentSpace.defineComponent({ is: '' }))

    const def = componentSpace
      .define()
      .placeholders({
        parent: '',
      })
      .definition({
        using: {
          parent: 'parent',
        },
        template: tmpl('<parent />'),
      })
      .registerComponent()
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(domHtml(elem)).toBe('<parent></parent>')
    matchElementWithDom(elem)

    componentSpace.groupRegister(() => {
      const parentDef = componentSpace
        .define('parent')
        .usingComponents({
          child: 'child',
        })
        .template(tmpl('<child />'))
        .registerComponent()
      componentSpace.setGlobalUsingComponent('parent', parentDef)
      const childDef = componentSpace.define('child').template(tmpl('CHILD')).registerComponent()
      componentSpace.setGlobalUsingComponent('child', childDef)
    })
    expect(domHtml(elem)).toBe('<parent><child>CHILD</child></parent>')
    matchElementWithDom(elem)
  })

  test('using placeholder across component spaces and waiting', () => {
    const mainCs = new glassEasel.ComponentSpace()
    mainCs.setGlobalUsingComponent('', mainCs.defineComponent({ is: '' }))
    const extraCs = new glassEasel.ComponentSpace()
    mainCs.importSpace('space://extra', extraCs, false)
    mainCs.importSpace('space-private://extra', extraCs, true)

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener = jest.fn((() => {}) as ComponentWaitingListener)
    extraCs.setComponentWaitingListener(listener)

    const def = mainCs.defineComponent({
      using: {
        child: 'space://extra/child-pub',
        'child-private': 'space-private://extra/child',
      },
      placeholders: {
        child: '',
        'child-private': '',
      },
      template: tmpl(`
        <child />
        <child-private />
      `),
    })
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenNthCalledWith(1, true, 'child-pub', elem)
    expect(listener).toHaveBeenNthCalledWith(2, false, 'child', elem)
    expect(domHtml(elem)).toBe('<child></child><child-private></child-private>')
    matchElementWithDom(elem)

    extraCs.defineComponent({
      is: 'child',
      template: tmpl('A'),
    })
    expect(domHtml(elem)).toBe('<child></child><child-private>A</child-private>')
    matchElementWithDom(elem)

    extraCs.exportComponent('child-pub', 'child')
    expect(domHtml(elem)).toBe('<child>A</child><child-private>A</child-private>')
    matchElementWithDom(elem)
  })

  test('using native node as placeholder', () => {
    const componentSpace = new glassEasel.ComponentSpace()
    componentSpace.updateComponentOptions({
      writeFieldsToNode: true,
      writeIdToDOM: true,
    })
    componentSpace.defineComponent({
      is: '',
    })
    componentSpace.setGlobalUsingComponent('span', 'span')

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener = jest.fn((() => {}) as ComponentWaitingListener)
    componentSpace.setComponentWaitingListener(listener)

    const def = componentSpace
      .define()
      .placeholders({
        child: 'span',
      })
      .definition({
        using: {
          child: 'placeholder/simple/child',
        },
        template: tmpl(`
          <child>A</child>
        `),
      })
      .registerComponent()
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenNthCalledWith(1, false, 'placeholder/simple/child', elem)
    expect(domHtml(elem)).toBe('<span>A</span>')
    matchElementWithDom(elem)

    componentSpace.defineComponent({
      is: 'placeholder/simple/child',
      template: tmpl('<slot />B'),
    })
    expect(domHtml(elem)).toBe('<child>AB</child>')
    matchElementWithDom(elem)
  })

  test('using component with placeholder as generic', () => {
    const componentSpace = new glassEasel.ComponentSpace()
    componentSpace.updateComponentOptions({
      writeFieldsToNode: true,
      writeIdToDOM: true,
    })
    componentSpace.defineComponent({
      is: '',
    })
    componentSpace.setGlobalUsingComponent('span', 'span')

    const def = componentSpace
      .define()
      .placeholders({
        child: 'span',
        'child-of-child': 'span',
      })
      .definition({
        using: {
          child: 'placeholder/simple/child',
          'child-of-child': 'placeholder/simple/child-of-child',
        },
        template: tmpl(`
          <child generic:g="child-of-child">A</child>
        `),
      })
      .registerComponent()
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(domHtml(elem)).toBe('<span>A</span>')
    matchElementWithDom(elem)

    componentSpace.defineComponent({
      is: 'placeholder/simple/child',
      generics: {
        g: true,
      },
      template: tmpl('<slot /><g>B</g>'),
    })
    expect(domHtml(elem)).toBe('<child>A<span>B</span></child>')
    matchElementWithDom(elem)

    componentSpace.defineComponent({
      is: 'placeholder/simple/child-of-child',
      template: tmpl('<slot />C'),
    })
    expect(domHtml(elem)).toBe('<child>A<g>BC</g></child>')
    matchElementWithDom(elem)
  })

  test('component property should update when replaced', () => {
    const componentSpace = new glassEasel.ComponentSpace()
    componentSpace.updateComponentOptions({
      writeFieldsToNode: true,
      writeIdToDOM: true,
    })
    componentSpace.defineComponent({
      is: '',
    })
    componentSpace.setGlobalUsingComponent('span', 'span')

    const def = componentSpace
      .define()
      .placeholders({
        child: 'span',
      })
      .definition({
        using: {
          child: 'placeholder/simple/child',
        },
        data: {
          prop: 'old',
        },
        template: tmpl(`
          <child prop="{{ prop }}">A</child>
        `),
      })
      .registerComponent()
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(domHtml(elem)).toBe('<span prop="old">A</span>')
    matchElementWithDom(elem)

    elem.setData({
      prop: 'new',
    })

    componentSpace.defineComponent({
      is: 'placeholder/simple/child',
      properties: {
        prop: glassEasel.NormalizedPropertyType.String,
      },
      template: tmpl('{{ prop }}'),
    })
    expect(domHtml(elem)).toBe('<child>new</child>')
    matchElementWithDom(elem)
  })

  test('trigger lifetimes when replacing', () => {
    const callOrder: number[] = []
    const placeholder = componentSpace.defineComponent({
      properties: {
        n: Number,
      },
      template: tmpl('<span>{{n + 1}}<slot/></span>'),
      lifetimes: {
        created() {
          callOrder.push(1)
        },
        attached() {
          callOrder.push(2)
        },
        detached() {
          callOrder.push(3)
        },
        moved() {
          callOrder.push(0)
        },
      },
    })
    componentSpace.defineComponent({
      is: 'placeholder/lifetime/a',
      lifetimes: {
        attached() {
          callOrder.push(7)
        },
        detached() {
          callOrder.push(0)
        },
        moved() {
          callOrder.push(8)
        },
      },
    })
    const def = componentSpace.defineComponent({
      is: 'placeholder/lifetime/parent',
      using: {
        child: 'child',
        a: '../lifetime/a',
        placeholder: placeholder.general(),
      },
      placeholders: {
        child: 'placeholder',
      },
      template: tmpl(`
        <child n="2">
          <a />
        </child>
      `),
    })
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    expect(callOrder).toStrictEqual([1])
    glassEasel.Element.pretendAttached(elem)
    expect(callOrder).toStrictEqual([1, 2, 7])
    expect(domHtml(elem)).toBe('<child><span>3<a></a></span></child>')
    matchElementWithDom(elem)
    callOrder.splice(0, 99)

    componentSpace.defineComponent({
      is: 'placeholder/lifetime/child',
      properties: {
        n: String,
      },
      template: tmpl('<div>{{n + 1}}</div>'),
      lifetimes: {
        created() {
          callOrder.push(4)
        },
        attached() {
          callOrder.push(5)
        },
        detached() {
          callOrder.push(0)
        },
        moved() {
          callOrder.push(6)
        },
      },
    })
    expect(callOrder).toStrictEqual([4, 3, 5, 8])
    expect(domHtml(elem)).toBe('<child><div>21</div></child>')
    matchElementWithDom(elem)
  })

  test('replacing virtual host component', () => {
    const placeholder = componentSpace.defineComponent({
      options: {
        virtualHost: true,
      },
      template: tmpl('<div>placeholder</div>'),
    })
    const card = componentSpace.defineComponent({
      template: tmpl(`<div><slot></slot></div>`),
    })
    const def = componentSpace.defineComponent({
      is: 'placeholder/ttt/parent',
      using: {
        child: 'child',
        placeholder: placeholder.general(),
        card,
      },
      placeholders: {
        child: 'placeholder',
      },
      template: tmpl(`
        <card>
          <child>content</child>
        </card>
      `),
    })
    const elem = glassEasel.Component.createWithContext('root', def.general(), testBackend)
    matchElementWithDom(elem)

    componentSpace.defineComponent({
      is: 'placeholder/ttt/child',
      options: {
        virtualHost: true,
      },
      template: tmpl('<div>actual</div>'),
    })
    matchElementWithDom(elem)
  })
}

describe('placeholder (DOM backend)', () => testCases(domBackend))
describe('placeholder (composed backend)', () => testCases(composedBackend))
