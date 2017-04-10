let currentWindow = null;
import MessageService from './message-service';

const eventMap = {
  'auth-requested': 'auth-requested',
  'blur': 'blurred',
  'move': 'bounds-changed',
  'resize': 'bounds-changed',
  'bounds-changing': 'bounds-changing',
  'close-requested': 'close-requested',
  'close': 'closed',
  'disabled-frame-bounds-changed': 'disabled-frame-bounds-changed',
  'disabled-frame-bounds-changing': 'disabled-frame-bounds-changing',
  'embedded': 'embedded',
  'external-process-exited': 'external-process-exited',
  'external-process-started': 'external-process-started',
  'focus': 'focused',
  'frame-disabled': 'frame-disabled',
  'frame-enabled': 'frame-enabled',
  'group-changed': 'group-changed',
  'hide': 'hidden',
  'initialized': 'initialized',
  'maximize': 'maximized',
  'message': 'message',
  'minimize': 'minimized',
  'navigation-rejected': 'navigation-rejected',
  'restore': 'restored',
  'show-requested': 'show-requested',
  'show': 'shown'
};

const optionsMap = {
  'alwaysOnTop': 'alwaysOnTop',
  'backgroundColor': 'backgroundColor',
  'child': 'child',
  'center': 'defaultCentered',
  'frame': 'frame',
  'hasShadow': 'shadow',
  'height': 'defaultHeight',
  'maxHeight': 'maxHeight',
  'maximizable': 'maximizable',
  'maxWidth': 'maxWidth',
  'minHeight': 'minHeight',
  'minimizable': 'minimizable',
  'minWidth': 'minWidth',
  'resizable': 'resizable',
  'show': 'autoShow',
  'skipTaskbar': 'showTaskbarIcon',
  'transparent': 'opacity',
  'width': 'defaultWidth',
  'x': 'defaultLeft',
  'y': 'defaultTop'
};

const checkWindowOpen = (win, windowMethod, reject) => {
  if (win) {
    windowMethod();
  } else {
    reject();
  }
};

class Window {
  constructor(...args) {
    if (args.length === 0) {
      this.innerWindow = fin.desktop.Window.getCurrent();
      this.children = [];
    } else {
      const [url, name, options] = args;

      let newWindow;
      const handleError = (error) => console.error('Error creating window: ' + error);

      const convertedOptions = {};

      Object.keys(optionsMap).forEach((key) => {
        const openfinOption = optionsMap[key];
        convertedOptions[openfinOption] = options[key];
      });

      const mergedOptions = Object.assign(
        {},
        convertedOptions,
        options
      );

      if (options.transparent) {
        // OpenFin needs opacity between 1 (not transparent) and 0 (fully transparent)
        mergedOptions.opacity = options.transparent === true ? 0 : 1;
      }
      if (options.skipTaskbar) {
        mergedOptions.showTaskbarIcon = !options.skipTaskbar;
      }

      if (mergedOptions.child) {
        const childOptions = Object.assign(
          {},
          mergedOptions,
          {
            name,
            url
          }
        );

        newWindow = new fin.desktop.Window(childOptions);

        const currentWindow = Window.getCurrentWindow();
        if (currentWindow.children) {
          currentWindow.children.push(this);
        } else {
          currentWindow.children = [this];
        }
      } else {
        // UUID must be the same as name
        const uuid = name;

        const app = new fin.desktop.Application({
          name,
          url,
          uuid,
          mainWindowOptions: mergedOptions
        }, () => app.run(), handleError);

        // Need to return the window object, not the application
        newWindow = app.getWindow();
      }
      this.innerWindow = newWindow;
    }

    this.eventListeners = new Map();
    MessageService.subscribe('*', 'ssf-window-message', (...args) => {
      const event = 'message';
      if (this.eventListeners.has(event)) {
        this.eventListeners.get(event).forEach(listener => listener(...args));
      }
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      checkWindowOpen(this.innerWindow, () => this.innerWindow.close(false, resolve, reject), reject);
      this.innerWindow = undefined;
    });
  }

  hide() {
    return new Promise((resolve, reject) => checkWindowOpen(this.innerWindow, () => this.innerWindow.hide(resolve, reject), reject));
  }

  show() {
    return new Promise((resolve, reject) => checkWindowOpen(this.innerWindow, () => this.innerWindow.show(false, resolve, reject), reject));
  }

  focus() {
    return new Promise((resolve, reject) => checkWindowOpen(this.innerWindow, () => this.innerWindow.focus(resolve, reject), reject));
  }

  blur() {
    return new Promise((resolve, reject) => checkWindowOpen(this.innerWindow, () => this.innerWindow.blur(resolve, reject), reject));
  }

  addListener(event, listener) {
    if (this.eventListeners.has(event)) {
      const temp = this.eventListeners.get(event);
      temp.push(listener);
      this.eventListeners.set(event, temp);
    } else {
      this.eventListeners.set(event, [listener]);
    }
    this.innerWindow.addEventListener(eventMap[event], listener);
  }

  removeListener(event, listener) {
    if (this.eventListeners.has(event)) {
      let listeners = this.eventListeners.get(event);
      let index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners = listeners.splice(index, 1);
        this.eventListeners.set(listeners);
      }
    }

    this.innerWindow.removeEventListener(eventMap[event], listener);
  }

  removeAllListeners() {
    this.eventListeners.forEach((value, key) => {
      value.forEach((listener) => {
        this.innerWindow.removeEventListener(key, listener);
      });
    });

    this.eventListeners.clear();
  }

  postMessage(message) {
    MessageService.send(`${this.innerWindow.uuid}:${this.innerWindow.name}`, 'ssf-window-message', message);
  }

  getChildWindows() {
    return this.children;
  }

  static getCurrentWindowId() {
    const currentWin = fin.desktop.Window.getCurrent();
    return `${currentWin.uuid}:${currentWin.name}`;
  }

  static getCurrentWindow() {
    if (currentWindow) {
      return currentWindow;
    }

    currentWindow = new Window();
    return currentWindow;
  }
}

export default Window;
