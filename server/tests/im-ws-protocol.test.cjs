const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function loadProtocolModule() {
  const filePath = path.join(__dirname, '../src/services/imWsProtocol.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const module = { exports: {} };
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(module.exports, require, module, filePath, path.dirname(filePath));
  return module.exports;
}

test('buildLoginMessage 生成文档要求的 login 报文', () => {
  const { buildLoginMessage } = loadProtocolModule();

  const message = buildLoginMessage('123456', 'token-abc');

  assert.deepEqual(message, {
    type: 'login',
    uid: '123456',
    token: 'token-abc',
  });
});

test('normalizeUserId 兼容纯数字和 game_ 前缀 uid', () => {
  const { normalizeUserId } = loadProtocolModule();

  assert.equal(normalizeUserId('123456'), '123456');
  assert.equal(normalizeUserId('game_123456'), '123456');
});

test('buildSendCommandMessage 生成文档要求的 sendCommand 报文', () => {
  const { buildSendCommandMessage } = loadProtocolModule();

  const message = buildSendCommandMessage('123456', 3);

  assert.deepEqual(message, {
    type: 'sendCommand',
    userId: '123456',
    commandId: 3,
  });
});

test('isSuccessResponse 识别成功响应', () => {
  const { isSuccessResponse } = loadProtocolModule();

  assert.equal(isSuccessResponse({ type: 'loginResult', success: true }), true);
  assert.equal(isSuccessResponse({ type: 'loginResult', success: false }), false);
});
