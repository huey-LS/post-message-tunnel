const path = require('path');
var assert = require('assert');
const puppeteer = require('puppeteer');

describe('browser', function () {
  it('user is user1?', (done) => {
    (async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      page.on('console', message => {
        let type = message.type();
        let args = message.args().map((a) => {
          let remoteObject = a._remoteObject;
          if (remoteObject.type === 'function') {
            return 'Function';
          } else if (remoteObject.type === 'object') {
            let o = {};
            let properties = remoteObject.preview.properties;
            properties.forEach(({ name, type, value }) => {
              if (type === 'object') {
                o[name] = value;
              } else {
                o[name] = value;
              }
            })
            return JSON.stringify(o);
          } else {
            return remoteObject.value;
          }
        });
        if (console[type]) {
          console[type](...args)
        } else {
          console.log(...args)
        }
      })

      page.on('error', err => {
        console.log(err);
      })

      await page.setCacheEnabled(false);
      await page.coverage.startJSCoverage();
      await page.goto('file://' + path.resolve(__dirname, './src/main.html'));
      await page.exposeFunction('assert', async (name) => {
        try {
          assert.equal(name, 'user1');
          done();
        } catch (e) {
          done(e);
        }

        const jsCoverage = await page.coverage.stopJSCoverage();

        let totalBytes = 0;
        let usedBytes = 0;
        const coverage = [...jsCoverage];
        for (const entry of coverage) {
          totalBytes += entry.text.length;
          for (const range of entry.ranges)
            usedBytes += range.end - range.start - 1;
        }
        console.log(`Bytes used: ${usedBytes / totalBytes * 100}%`);

        await browser.close();
      })
      await page.evaluate(async () => {
        await window.init();
      });
    })();
  });
})