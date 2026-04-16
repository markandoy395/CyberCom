import fs from 'fs';
const base = 'c:/CyberCom/CyberCom/uploads/test-large';
fs.mkdirSync(base, { recursive: true });
for (let i = 0; i < 300; i++) {
  fs.writeFileSync(`${base}/file_${i}.txt`, `This is file ${i}\n`);
}
console.log('created test upload with 300 files at', base);
