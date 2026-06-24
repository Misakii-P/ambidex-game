const fs = require('fs');
const path = require('path');

const exePath = path.join(__dirname, '..', 'dist', 'AmbidexGame.exe');

const buf = fs.readFileSync(exePath);
const peOffset = buf.readUInt32LE(0x3C);
const magic = buf.toString('utf8', peOffset, peOffset + 2);
if (magic !== 'PE') { console.error('Invalid PE signature'); process.exit(1); }
const subsysOffset = peOffset + 24 + 68;
const old = buf.readUInt16LE(subsysOffset);
console.log(`Subsystem: ${old} (${old === 3 ? 'CONSOLE' : 'GUI'})`);
if (old !== 2) {
  buf.writeUInt16LE(2, subsysOffset);
  fs.writeFileSync(exePath, buf);
  console.log('Patched to GUI subsystem');
}
