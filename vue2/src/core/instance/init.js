/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

/**
 * Vue.prototype._init  方法
 * @param {*} Vue   Vue构造函数
 */
export function initMixin (Vue: Class<Component>) {
  //初始化Vue
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }
    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    // 处理组件的配置信息
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 子组件初始化时走这,主要做了一些性能优化,将组件配置对象上的一些深层次的属性放到了vm.$options 选项当中
      initInternalComponent(vm, options)
    } else {
      //初始化根组件时走这里,主要做了合并Vue的全局配置到根组件实例的options当中
      /**
       * 例合并全局组件:在全局注册一个全局组件
       * Vue.component('globalComps',{
       *  template:'<li>xxxx</li>'
       * })
       * 相当于根组件components:['nativeComps','global']
       */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    //初始化组件实例的关系属性,例:$parent、$children、$root、$refs
    initLifecycle(vm)
    // 初始化自定义事件
    initEvents(vm)
    // 解析组件的插槽信息,拿到vm.$slot,处理渲染函数,得到vm.$createElement 方法(h函数)
    initRender(vm)
    //调用beforeCreate 钩子
    callHook(vm, 'beforeCreate')
    //初始化inject 配置项,得到result[key] = val 的形式的配置对象,并且将结果数据进行响应式处理,代理到vm上,
    //实际上拿到inject属性是根据key,vm.$parent得到实例往上递归在父级中去取这个值
    initInjections(vm) // resolve injections before data/props
    //数据响应式处理,处理 props、methods、data、computed、watch
    initState(vm)
    //解析组件配置的provide对象,并且将对象挂载到vm._provided 属性上
    //
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    //如果配置选项中有el选项,则会自动调用mount方法,如果没有则需要手动进行调用mount方法
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
