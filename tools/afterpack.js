// electron-builder "afterPack" hook: drops files StickyPad never uses from the app folder before it is packed into the installer.
// dxcompiler.dll / dxil.dll (about 26 MB) are DirectX shader compilers, used only by WebGPU, which StickyPad does not use.
const fs = require('fs'), path = require('path');
const DROP = ['dxcompiler.dll', 'dxil.dll'];
exports.default = async function (context) {
  const dir = context.appOutDir; let freed = 0;
  for (const f of DROP) {
    const p = path.join(dir, f);
    try { const s = fs.statSync(p); fs.unlinkSync(p); freed += s.size; console.log('  afterPack: removed ' + f + ' (' + (s.size / 1048576).toFixed(1) + ' MB)'); } catch {}
  }
  console.log('  afterPack: freed ' + (freed / 1048576).toFixed(1) + ' MB');
};
