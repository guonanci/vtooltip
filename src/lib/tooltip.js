/* Forked from https://github.com/FezVrasta/popper.js/blob/master/packages/tooltip/src/index.js */
import Popper from 'popper.js'
import { getOptions, directive } from '../directives/v-tooltip'
import { addClasses, removeClasses, supportPassive } from '../utils'

const DEFAULT_OPTIOINS = {
  container: false,
  delay: 0,
  html: false,
  placement: 'top',
  title: '',
  template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
  trigger: 'hover focus',
  offset: 0
}

const openTooltips = []

export default class Tooltip {
  /**
   * Create a new Tooltip.js instance
   * @class Tooltip
   * @param {HTMLElement} reference - The DOM used as reference of the tooltip (it can be a jQuery element)
   * @param {Object} options
   */
  constructor (reference, options) {
    options = { ...DEFAULT_OPTIOINS, ...options }

    reference.jquery && (reference = reference[0])

    this.reference = reference
    this.options = options

    this._isOpen = false

    this._init()
  }

  show () {
    this._show(this.reference, this.options)
  }

  hide () {
    this._hide()
  }

  dispose () {
    this._dispose()
  }

  toggle () {
    if (this._isOpen) {
      return this.hide()
    } else {
      return this.show()
    }
  }

  setClasses (classes) {
    this._classes = classes
  }

  setContent (content) {
    this.options.title = content
    if (this._tooltipNode) {
      this._setContent(content, this.options)
    }
  }

  setOptions (options) {
    let classesUpdated = false
    const classes = (options && options.classes) || directive.options.defaultClass
    if (this._classes !== classes) {
      this.setClasses(classes)
      classesUpdated = true
    }

    options = getOptions(options)

    let needPopperUpdate = false
    let needRestart = false

    if (this.options.offset !== options.offset || this.options.placement !== options.placement) {
      needPopperUpdate = true
    }

    if (
      this.options.template !== options.template ||
      this.options.trigger !== options.trigger ||
      this.options.container !== options.container ||
      classesUpdated
    ) {
      needRestart = true
    }

    for (const key in options) {
      this.options[key] = options[key]
    }

    if (this._tooltipNode) {
      if (needRestart) {
        const isOpen = this._isOpen

        this.dispose()
        this._init()

        if (isOpen) {
          this.show()
        }
      } else if (needPopperUpdate) {
        this.popperInstance.update()
      }
    }
  }

  _events = []

  _init () {
    const events = typeof this.options.trigger === 'string'
      ? this.options.trigger
        .split(' ')
        .filter(
          trigger => ['click', 'hover', 'focues'].indexOf(trigger) !== -1
        )
      : []
    this._isDisposed = false
    this._enableDocumentTouch = events.indexOf('manual') === -1

    this._setEventListeners(this.reference, events, this.options)
  }

  _create (reference, template) {
    const tooltipGenerator = window.document.createElement('div')
    tooltipGenerator.innerHTML = template.trim()
    const tooltipNode = tooltipGenerator.childNodes[0]

    tooltipMode.id = `tooltip_${Math.random().toString(36).substr(2, 10)}`

    tooltipNode.setAttribute('aria-hidden', 'true')

    if (this.options.autoHide && this.options.trigger.indexOf('hover') !== -1) {
      tooltipNode.addEventListener('mouseenter', this.hide)
      tooltipNode.addEventListener('click', this.hide)
    }

    return tooltipNode
  }

  _setContent (content, options) {
    this.asyncContent = false
    this._applyContent(content, options).then(() => {
      this.popperInstance.update()
    })
  }


  _applyContent (title, options) {
    return new Promise ((resolve, reject) => {
      const allowHtml = options.html
      const rootNode = this._tooltipNode
      if (!rootNode) return
      const titleNode = rootNode.querySelector(this.options.innerSelector)
      if (title.nodeType === 1) {
        if (allowHtml) {
          while (titleNode.firstChild) {
            titleNode.removeChild(titleNode.firstChild)
          }
          titleNode.appendChild(title)
        }
      } else if (typeof title === 'function') {
        const result = title()
        if (result && typeof result.then === 'function') {
          this.asyncContent = true
          options.loadingClass && addClasses(rootNode, options.loadingClass)
          if (options.loadingContent) {
            this._applyContent(options.loadingContent, options)
          }
          result.then(asyncResult => {
            options.loadingClass && removeClasses(rootNode, options.loadingClass)
            return this._applyContent(asyncResult, options)
          }).then(resolve).catch(reject)
        } else {
          this._applyContent(result, options)
            .then(resolve).catch(reject)
        }
        return
      } else {
        allowHtml ? (titleNode.innerHTML = title) : (title.innerText = title)
      }
      resolve()
    })
  }

  _show (reference, options) {
    if (options && typeof options.container === 'string') {
      const container = document.querySelector(options.container)
      if (!container) return
    }

    clearTimeout(this._disposeTimer)
  }
}
