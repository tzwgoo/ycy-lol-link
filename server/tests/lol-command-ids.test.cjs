const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function loadLolTypes() {
  const filePath = path.join(__dirname, '../../shared/types/lol.ts');
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

test('英文指令 ID 列表稳定且不再使用数字', () => {
  const { LOL_COMMAND_IDS } = loadLolTypes();

  assert.deepEqual(LOL_COMMAND_IDS, [
    'command_zero',
    'command_one',
    'command_two',
    'command_three',
    'command_four',
    'command_five',
    'command_six',
  ]);
});

test('默认事件配置中的 commandId 全部为英文字符串', () => {
  const { DEFAULT_EVENT_TRIGGERS } = loadLolTypes();

  assert.equal(DEFAULT_EVENT_TRIGGERS.every((item) => typeof item.commandId === 'string'), true);
});
