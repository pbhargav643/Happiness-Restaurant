const fs = require('fs');
const path = require('path');

// Read the self-contained minified jsQR bundle
const jsQrBundlePath = path.resolve(__dirname, '../../../../Users/Asus/.gemini/antigravity-ide/brain/63a70caf-26e3-43bc-8eb3-2c8a57ef81c5/.system_generated/steps/3202/content.md');

let jsQrCode = '';
if (fs.existsSync(jsQrBundlePath)) {
  const raw = fs.readFileSync(jsQrBundlePath, 'utf8');
  // Extract line 15 (minified code)
  const lines = raw.split('\n');
  for (const line of lines) {
    if (line.startsWith('!function(o,e)')) {
      jsQrCode = line.trim();
      break;
    }
  }
}

if (!jsQrCode) {
  throw new Error('Unable to load jsQR minified bundle from step 3202 cache.');
}

const moduleExports = {};
const factory = new Function('module', 'exports', `${jsQrCode}; return module.exports;`);
const jsQR = factory({ exports: moduleExports }, moduleExports);

module.exports = jsQR;
