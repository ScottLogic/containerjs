'use strict';
const {
  app,
  BrowserWindow,
  ipcMain: ipc
} = require('electron');
const path = require('path');

let win;
const windows = [];
const preloadPath = path.join(__dirname, 'dist', 'ssf-desktop-api.js');

module.exports = (url) => {
  const eNotify = require('electron-notify');

  ipc.on('ssf-notification', (e, msg) => {
    if (!msg.options) {
      msg.options = {};
    }

    eNotify.notify({
      title: msg.title,
      text: msg.options.body
    });
  });

  ipc.on('ssf-new-window', (e, msg) => {
    const options = {
      webPreferences: {
        sandbox: true,
        preload: preloadPath
      }
    };

    if (msg.features && msg.features.child) {
      options.parent = BrowserWindow.fromWebContents(e.sender);
    }

    const newWindow = new BrowserWindow(options);
    newWindow.loadURL(msg.url);
    newWindow.on('close', () => {
      const index = windows.indexOf(newWindow);
      if (index >= 0) {
        windows.splice(index, 1);
      }
    });

    e.returnValue = {
      id: newWindow.id
    };

    windows.push(newWindow);
  });

  ipc.on('ssf-capture-screen-snippet', (e) => {
    e.sender.capturePage((image) => {
      const dataUri = 'data:image/png;base64,' + image.toPng().toString('base64');
      e.sender.send('ssf-screen-snippet-captured', dataUri);
    });
  });

  ipc.on('ssf-send-message', (e, msg) => {
    const windowId = parseInt(msg.windowId, 10);

    if (isNaN(windowId)) {
      return;
    }

    const destinationWindow = BrowserWindow.fromId(windowId);

    if (!destinationWindow) {
      return;
    }

    const senderId = e.sender.id;

    // Need to send to topic and * in case the user has subscribed to the wildcard
    destinationWindow.webContents.send(`ssf-send-message-${msg.topic}`, msg.message, senderId);
    destinationWindow.webContents.send(`ssf-send-message-*`, msg.message, senderId);
  });

  createInitialHiddenWindow(url);
};

const createInitialHiddenWindow = (url) => {
  // Create an invisible window to run the load script
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      sandbox: true,
      preload: preloadPath
    }
  });

  // and load the page used for the hidden window
  win.loadURL(url);

  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null;
  });
};

const ready = (cb) => {
  app.on('ready', cb);
};

ipc.on('ssf-get-window-id', (e) => {
  e.returnValue = BrowserWindow.fromWebContents(e.sender).id;
});

ipc.on('ssf-close-window', (e, id) => {
  const win = BrowserWindow.fromId(id);
  // Don't need to remove the window from the windows array, the onclose event does that for us
  if (win) {
    win.close();
  }
});

ipc.on('ssf-show-window', (e, id) => {
  const win = BrowserWindow.fromId(id);
  if (win) {
    win.show();
  }
});

ipc.on('ssf-hide-window', (e, id) => {
  const win = BrowserWindow.fromId(id);
  if (win) {
    win.hide();
  }
});

ipc.on('ssf-focus-window', (e, id) => {
  const win = BrowserWindow.fromId(id);
  if (win) {
    win.focus();
  }
});

ipc.on('ssf-blur-window', (e, id) => {
  const win = BrowserWindow.fromId(id);
  if (win) {
    win.blur();
  }
});

module.exports.app = {
  ready
};
