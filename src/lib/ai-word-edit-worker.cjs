/* eslint-disable @typescript-eslint/no-require-imports -- Loaded by the CommonJS document worker. */
const JSZip = require('jszip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const fail = message => { throw new Error('USER:' + message); };
async function replaceWordText(bytes, changes) {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) fail('Nội dung Word không hợp lệ.');
  const doc = new DOMParser({ onError: () => fail('XML Word không hợp lệ.') }).parseFromString(xml, 'application/xml');
  for (const name of ['ins','del','txbxContent','fldChar','tab','br']) {
    // Offsets across these structures are ambiguous; do not silently modify a different range.
    if (doc.getElementsByTagNameNS(W, name).length) fail('Word có ngắt dòng/tab, trường động, textbox hoặc theo dõi sửa đổi; hãy dựng bản Word đơn giản trước khi thay chữ.');
  }
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W,'p'));
  const seen = new Set();
  for (const change of changes) {
    if (seen.has(change.expected)) fail('Nội dung cần thay bị lặp trong danh sách thay đổi.');
    seen.add(change.expected);
    let count = 0;
    const matches = paragraphs.map(p => {
      const nodes = Array.from(p.getElementsByTagNameNS(W,'t'));
      const text = nodes.map(n=>n.textContent).join('');
      const starts=[]; let at=0;
      while ((at=text.indexOf(change.expected,at))>=0) { starts.push(at);at+=change.expected.length; }
      count+=starts.length; return {nodes,starts};
    });
    if (count !== change.occurrences) fail(`Nội dung cũ khớp ${count} lần, khác ${change.occurrences} lần yêu cầu. Đọc lại Word và chọn đoạn/ô rõ hơn.`);
    for (const {nodes,starts} of matches) {
      // Apply right-to-left so earlier offsets remain stable, including matches split across runs.
      for (const start of starts.reverse()) {
        const end=start+change.expected.length; let offset=0, inserted=false;
        for (const node of nodes) {
          const old=node.textContent || '', left=offset, right=offset+old.length;offset=right;
          if (right<=start || left>=end) continue;
          node.textContent=old.slice(0,Math.max(0,start-left))+(inserted?'':change.replacement)+old.slice(Math.min(old.length,end-left));
          node.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve'); inserted=true;
        }
      }
    }
  }
  zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
module.exports = {replaceWordText};
