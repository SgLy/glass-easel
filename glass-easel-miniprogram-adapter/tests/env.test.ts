import * as glassEasel from 'glass-easel'
import { tmpl } from './base/env'
import {
  MiniProgramEnv,
} from '../src'

const domHtml = (elem: glassEasel.Element): string => {
  const domElem = elem.getBackendElement() as unknown as Element
  return domElem.innerHTML
}

describe('env', () => {
  test('add global components', () => {
    const env = new MiniProgramEnv()
    const globalCodeSpace = env.getGlobalCodeSpace()
    globalCodeSpace.getComponentSpace().define('external')
      .options({
        virtualHost: true,
      })
      .template(tmpl(`
        <span class="inner" />
      `))
      .registerComponent()
    globalCodeSpace.getComponentSpace().exportComponent('external', 'external')
    const codeSpace = env.createCodeSpace('', true)

    codeSpace.addComponentStaticConfig('path/to/comp', {
      usingComponents: {
        external: 'external',
      },
    })

    codeSpace.addCompiledTemplate('path/to/comp', tmpl(`
      <div class="outer">
        <external />
      </div>
    `))

    codeSpace.componentEnv('path/to/comp', ({ Component }) => {
      Component().register()
    })

    const backend = new glassEasel.domlikeBackend.CurrentWindowBackendContext()
    const ab = env.associateBackend(backend)
    const root = ab.createRoot('body', codeSpace, 'path/to/comp')
    expect(domHtml(root.getComponent())).toBe('<div class="outer"><span class="inner"></span></div>')
  })

  test('add global components', () => {
    const env = new MiniProgramEnv()
    const globalCodeSpace = env.getGlobalCodeSpace()
    globalCodeSpace.getComponentSpace().define('external')
      .options({
        virtualHost: true,
      })
      .template(tmpl(`
        <span class="inner" />
      `))
      .registerComponent()
    globalCodeSpace.getComponentSpace().exportComponent('external', 'external')
    const codeSpace = env.createCodeSpace('', true)

    codeSpace.addComponentStaticConfig('path/to/comp', {
      usingComponents: {
        external: 'external',
      },
    })

    codeSpace.addCompiledTemplate('path/to/comp', tmpl(`
      <div class="outer">
        <external />
      </div>
    `))

    codeSpace.componentEnv('path/to/comp', ({ Component }) => {
      Component().register()
    })

    const backend = new glassEasel.domlikeBackend.CurrentWindowBackendContext()
    const ab = env.associateBackend(backend)
    const root = ab.createRoot('body', codeSpace, 'path/to/comp')
    expect(domHtml(root.getComponent())).toBe('<div class="outer"><span class="inner"></span></div>')
  })

  test('multiple code spaces', () => {
    const env = new MiniProgramEnv()
    const codeSpace = env.createCodeSpace('', true)
    const pluginCodeSpace1 = env.createCodeSpace('plugin-1-id', false, {
      'outer-comp-1': 'inner-comp-1',
      'outer-comp-11': 'inner-comp-1',
    })
    const pluginCodeSpace2 = env.createCodeSpace('plugin-2-id', false, {
      'outer-comp-2': 'inner-comp-2',
    })
    expect(env.getCodeSpace('plugin-1-id')).toBe(pluginCodeSpace1)
    expect(env.getCodeSpace('plugin-2-id')).toBe(pluginCodeSpace2)
    expect(pluginCodeSpace1.isMainSpace()).toBe(false)
    codeSpace.importCodeSpace('plugin-1-id', 'plugin-1')
    codeSpace.importCodeSpace('plugin-2-id', undefined, true)
    expect(codeSpace.isMainSpace()).toBe(true)

    pluginCodeSpace1.addCompiledTemplate('inner-comp-1', tmpl('A'))
    pluginCodeSpace1.componentEnv('inner-comp-1', ({ Component }) => {
      Component().register()
    })

    pluginCodeSpace2.addCompiledTemplate('inner-comp-2', tmpl('B'))
    pluginCodeSpace2.componentEnv('inner-comp-2', ({ Component }) => {
      Component().register()
    })

    codeSpace.addComponentStaticConfig('path/to/comp', {
      usingComponents: {
        'c-a': 'plugin://plugin-1/outer-comp-1',
        'c-aa': 'plugin://plugin-1/outer-comp-11',
        'i-a': 'plugin-private://plugin-1-id/inner-comp-1',
        'i-b': 'plugin://plugin-2/outer-comp-2',
        'c-b': 'plugin-private://plugin-2-id/inner-comp-2',
      },
    })
    codeSpace.addCompiledTemplate('path/to/comp', tmpl(`
      <c-a />
      <c-aa />
      <i-a />
      <i-b />
      <c-b />
    `))
    codeSpace.componentEnv('path/to/comp', ({ Component }) => {
      Component().register()
    })

    codeSpace.componentEnv('', ({ Component }) => {
      Component().register()
    })

    const backend = new glassEasel.domlikeBackend.CurrentWindowBackendContext()
    const ab = env.associateBackend(backend)
    const root = ab.createRoot('body', codeSpace, 'path/to/comp')
    expect(domHtml(root.getComponent())).toBe('<c-a>A</c-a><c-aa>A</c-aa><i-a></i-a><i-b></i-b><c-b>B</c-b>')
  })
})
