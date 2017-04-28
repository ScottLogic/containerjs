const assert = require('assert');
const liveServer = require('live-server');
const {
  before,
  after,
  beforeEach,
  afterEach,
  describe,
  it
} = require('mocha');
const testContainer = process.env.MOCHA_CONTAINER;
const setup = require(`./${testContainer}-test-setup`);

let app;

const params = {
  port: 5000,
  host: '127.0.0.1',
  root: 'src',
  open: false,
  ignore: '*'
};

describe('Window API', function(done) {
  const timeout = 60000;
  this.timeout(timeout);

  before(() => {
    liveServer.start(params);
  });

  after(() => {
    liveServer.shutdown();
  });

  beforeEach(() => {
    app = setup(timeout);

    return app.start();
  });

  afterEach(function() {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });

  const executeAsyncJavascript = (client, script) => {
    return client.executeAsync(script);
  };

  const openNewWindow = (options) => {
    const script = `
      ssf.app.ready().then(() => {
        var callback = arguments[arguments.length - 1];
        new ssf.Window(${JSON.stringify(options)});
        setTimeout(() => callback(), 500);
      });
    `;
    return executeAsyncJavascript(app.client, script);
  };

  const callWindowMethod = (method) => {
    const script = `
      var callback = arguments[arguments.length - 1];
      var currentWin = ssf.Window.getCurrentWindow();
      currentWin.${method}().then((data) => {
        callback(data);
      });
    `;

    return executeAsyncJavascript(app.client, script);
  };

  it('Check ssf.Window is available globally', function() {
    const script = `
      var callback = arguments[arguments.length - 1];
      if (ssf.Window !== undefined) {
        callback();
      }
    `;
    return executeAsyncJavascript(app.client, script);
  });

  it('Check window constructor opens a new window', function() {
    return openNewWindow({url: 'about:blank', name: 'test', show: true, child: true}).then((result) => {
      return app.client.getWindowCount().then((count) => {
        assert.equal(count, 2);
      });
    });
  });

  it('Check new window has correct x position', function() {
    const windowTitle = 'windownamex';
    const xValue = 100;
    const windowOptions = {
      url: 'http://localhost:5000/index.html',
      name: windowTitle,
      show: true,
      x: xValue,
      y: 0,
      child: true
    };

    return app.client.isVisible('.visible-check')
      .then(() => openNewWindow(windowOptions))
      .then(() => app.client.windowHandles())
      .then((handles) => app.client.window(handles.value[1]))
      .then(() => app.client.waitForVisible('.visible-check'))
      .then(() => callWindowMethod('getBounds'))
      .then((result) => assert.equal(result.value.x, xValue));
  });

  it('Check new window has correct y position', function() {
    const windowTitle = 'windownamey';
    const yValue = 100;
    const windowOptions = {
      url: 'http://localhost:5000/index.html',
      name: windowTitle,
      show: true,
      x: 0,
      y: yValue,
      child: true
    };

    return app.client.isVisible('.visible-check')
      .then(() => openNewWindow(windowOptions))
      .then(() => app.client.windowHandles())
      .then((handles) => app.client.window(handles.value[1]))
      .then(() => app.client.waitForVisible('.visible-check'))
      .then(() => callWindowMethod('getBounds'))
      .then((result) => assert.equal(result.value.y, yValue));
  });
});
