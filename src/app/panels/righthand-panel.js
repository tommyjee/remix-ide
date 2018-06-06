const yo = require('yo-yo')
const csjs = require('csjs-inject')
const remixLib = require('remix-lib')

const styleguide = require('../ui/styles-guide/theme-chooser')
const PluginManager = require('../plugin/pluginManager')
const TabbedMenu = require('../tabs/tabbed-menu')
const CompileTab = require('../tabs/compile-tab')
const SettingsTab = require('../tabs/settings-tab')
const AnalysisTab = require('../tabs/analysis-tab')
const DebuggerTab = require('../tabs/debugger-tab')
const SupportTab = require('../tabs/support-tab')
const PluginTab = require('../tabs/plugin-tab')
// const TestTab = require('../tabs/test-tab')
const RunTab = require('../tabs/run-tab')

const EventManager = remixLib.EventManager
const styles = styleguide.chooser()

module.exports = class RighthandPanel {
  constructor (api = {}, events = {}, opts = {}) {
    const self = this
    self.event = new EventManager()
    self._api = api
    self._api.switchTab = x => {
      if (self._view.tabbedMenu) self._view.tabbedMenu.selectTabByClassName(x) // @TODO: refactor
    }
    self._events = events
    self._events.rhp = self.event // @TODO: refactor
    self._opts = opts
    self._view = {
      element: null,
      tabbedMenu: null,
      tabbedMenuViewport: null,
      dragbar: null
    }
    self._components = {
      pluginManager: null,
      tabbedMenu: null,
      compileTab: null,
      runTab: null,
      settingsTab: null,
      analysisTab: null,
      debuggerTab: null,
      supportTab: null
    }

    self._components.pluginManager = new PluginManager(self._opts.pluginAPI, self._events)
    self._view.tabbedMenuViewport = yo`<div id="optionViews"></div>`
    self._view.dragbar = yo`<div id="dragbar" class=${css.dragbar}></div>`
    const tabEvents = {compiler: self._events.compiler, app: self._events.app, rhp: self.event}
    self._components.tabbedMenu = new TabbedMenu(self._api, tabEvents)
    self._view.tabbedMenu = self._view.tabbedMenu.render()
    self._view.tabbedMenu.classList.add(css.opts)
    self._view.element = yo`
      <div id="righthand-panel" class=${css.panel}>
        ${self._view.dragbar}
        <div id="header" class=${css.header}>
          <div class=${css.menu}>${self._view.tabbedMenu}</div>
          ${self._view.tabbedMenuViewport}
        </div>
      </div>`
    self._components.compileTab = new CompileTab(self._api, self._events, self._opts)
    self._view.tabbedMenuViewport.appendChild(self._components.compileTab.render())
    self._components.runTab = new RunTab(self._api, self._events, self._opts)
    self._view.tabbedMenuViewport.appendChild(self._components.runTab.render())
    self._components.settingsTab = new SettingsTab(self._api, self._events, self._opts)
    self._view.tabbedMenuViewport.appendChild(self._components.settingsTab.render())
    self._components.analysisTab = new AnalysisTab(self._api, self._events, self._opts)
    self._view.tabbedMenuViewport.appendChild(self._components.analysisTab.render())
    self._components.debuggerTab = new DebuggerTab(self._api, self._events, self._opts)
    self._view.tabbedMenuViewport.appendChild(self._components.debuggerTab.render())
    self._components.supportTab = new SupportTab(self._api, self._events, self._opts)
    self._view.tabbedMenuViewport.appendChild(self._components.supportTab.render())
    self._components.tabbedMenu.addTab('Compile', 'compileView', self._view.tabbedMenuViewport.querySelector('#compileTabView'))
    self._components.tabbedMenu.addTab('Run', 'runView', self._view.tabbedMenuViewport.querySelector('#runTabView'))
    self._components.tabbedMenu.addTab('Settings', 'settingsView', self._view.tabbedMenuViewport.querySelector('#settingsView'))
    self._components.tabbedMenu.addTab('Analysis', 'staticanalysisView', self._view.tabbedMenuViewport.querySelector('#staticanalysisView'))
    self._components.tabbedMenu.addTab('Debugger', 'debugView', self._view.tabbedMenuViewport.querySelector('#debugView'))
    self._components.tabbedMenu.addTab('Support', 'supportView', self._view.tabbedMenuViewport.querySelector('#supportView'))
    self._components.tabbedMenu.selectTabByTitle('Compile')

    self._events.rhp.register('plugin-loadRequest', (json) => {
      const tab = new PluginTab({}, self._events, json)
      const content = tab.render()
      self._view.tabbedMenuViewport.appendChild(content)
      self._components.tabbedMenu.addTab(json.title, 'plugin', content)
      self._components.pluginManager.register(json, content)
    })
  }
  render () {
    const self = this
    return self._view.element
  }
  init () {
    // @TODO: init is for resizable drag bar only and should be refactored in the future
    const self = this
    const limit = 60
    self._view.dragbar.addEventListener('mousedown', mousedown)
    const ghostbar = yo`<div class=${css.ghostbar}></div>`
    function mousedown (event) {
      event.preventDefault()
      if (event.which === 1) {
        moveGhostbar(event)
        document.body.appendChild(ghostbar)
        document.addEventListener('mousemove', moveGhostbar)
        document.addEventListener('mouseup', removeGhostbar)
        document.addEventListener('keydown', cancelGhostbar)
      }
    }
    function cancelGhostbar (event) {
      if (event.keyCode === 27) {
        document.body.removeChild(ghostbar)
        document.removeEventListener('mousemove', moveGhostbar)
        document.removeEventListener('mouseup', removeGhostbar)
        document.removeEventListener('keydown', cancelGhostbar)
      }
    }
    function getPosition (event) {
      const lhp = window['filepanel'].offsetWidth
      const max = document.body.offsetWidth - limit
      var newpos = (event.pageX > max) ? max : event.pageX
      newpos = (newpos > (lhp + limit)) ? newpos : lhp + limit
      return newpos
    }
    function moveGhostbar (event) { // @NOTE VERTICAL ghostbar
      ghostbar.style.left = getPosition(event) + 'px'
    }
    function removeGhostbar (event) {
      document.body.removeChild(ghostbar)
      document.removeEventListener('mousemove', moveGhostbar)
      document.removeEventListener('mouseup', removeGhostbar)
      document.removeEventListener('keydown', cancelGhostbar)
      self.event.trigger('resize', [document.body.offsetWidth - getPosition(event)])
    }
  }
}

const css = csjs`
  #righthand-panel {
    display: flex;
    flex-direction: column;
    top: 0;
    right: 0;
    bottom: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
  #optionViews {
    background-color: ${styles.rightPanel.backgroundColor_Tab};
    overflow: scroll;
    height: 100%;
  }
  #optionViews > div {
    display: none;
  }
  #optionViews .pre {
    word-wrap: break-word;
    background-color: ${styles.rightPanel.BackgroundColor_Pre};
    border-radius: 3px;
    display: inline-block;
    padding: 0 0.6em;
  }
  #optionViews .hide {
    display: none;
  }
  a {
    color: ${styles.rightPanel.text_link};
  }
  .menu {
    display: flex;
    background-color: ${styles.rightPanel.BackgroundColor_Pre};
  }
  .options {
    float: left;
    padding-top: 0.7em;
    min-width: 60px;
    font-size: 0.9em;
    cursor: pointer;
    font-size: 1em;
    text-align: center;
  }
  .opts {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .opts_li {
    display: block;
    font-weight: bold;
    color: ${styles.rightPanel.text_Teriary};
  }
  .opts_li.active {
    color: ${styles.rightPanel.text_Primary};
  }
  .opts_li:hover {
    color: ${styles.rightPanel.icon_HoverColor_TogglePanel};
  }
  .dragbar             {
    position           : absolute;
    width              : 0.5em;
    top                : 3em;
    bottom             : 0;
    cursor             : col-resize;
    z-index            : 999;
    border-left        : 2px solid ${styles.rightPanel.bar_Dragging};
  }
  .ghostbar           {
    width             : 3px;
    background-color  : ${styles.rightPanel.bar_Ghost};
    opacity           : 0.5;
    position          : absolute;
    cursor            : col-resize;
    z-index           : 9999;
    top               : 0;
    bottom            : 0;
  }
  .panel              {
    height            : 100%;
  }
  .header             {
    height            : 100%;
  }
  .solIcon {
    margin-left: 10px;
    margin-right: 30px;
    display: flex;
    align-self: center;
    height: 29px;
    width: 20px;
    background-color: ${styles.colors.transparent};
  }
`
