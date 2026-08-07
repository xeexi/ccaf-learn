/* =========================================================
   検索インデックスの再生成
   HTML を直接編集したあとに必ず実行する。
     node tools/reindex.mjs
   assets/search-index.js を、各 HTML の .sec から作り直す。
   依存パッケージなし（Node 18+）。
   ========================================================= */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

// ドメイン表示名（ファイル名 → 検索結果に出すラベル）
const LABEL = {
  '00-basics.html': '前提',
  '01-agentic.html': 'Domain 1',
  '02-tools.html': 'Domain 2',
  '03-claude-code.html': 'Domain 3',
  '04-prompt.html': 'Domain 4',
  '05-context.html': 'Domain 5',
  '06-summary.html': 'まとめ',
};

const index = [];
Object.keys(LABEL).forEach(file => {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) { console.warn('⚠ 見つかりません:', file); return; }
  const html = fs.readFileSync(full, 'utf8');
  const secs = html.split(/(?=<section class="sec)/).filter(s => /^<section class="sec/.test(s));
  secs.forEach(sec => {
    const id = (sec.match(/\sid="([^"]*)"/) || [])[1];
    const title = (sec.match(/<header class="sec-head">[\s\S]*?<h2>([\s\S]*?)<\/h2>/) || [])[1] || '';
    if (!id) return;
    const text = sec
      .replace(/<svg[\s\S]*?<\/svg>/g, ' ')   // 図の中の文字は検索対象外
      .replace(/<[^>]*>/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    index.push({
      f: file,
      d: LABEL[file],
      id,
      t: title.replace(/<[^>]*>/g, '').trim(),
      x: text.slice(0, 1800),
    });
  });
});

const out = path.join(ROOT, 'assets/search-index.js');
fs.writeFileSync(out, 'window.SEARCH_INDEX = ' + JSON.stringify(index) + ';\n');
console.log(`検索インデックスを更新: ${index.length} セクション / ${Math.round(fs.statSync(out).size / 1024)}KB`);
