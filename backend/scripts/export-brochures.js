// node scripts/export-brochures.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ORIGIN = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.ADMIN_TOKEN || ''; // or read from env/local

async function main() {
  const outDir = path.resolve(__dirname, '../brochures');
  fs.mkdirSync(outDir, { recursive: true });

  const qs = new URLSearchParams({ preview: '1', limit: '100' });
  const listRes = await fetch(`${API}/api/packages?${qs.toString()}`);
  const { items = [] } = await listRes.json();

  console.log(`Exporting ${items.length} brochures...`);

  for (const p of items) {
    const id = p._id || p.id;
    const url = `${API}/api/brochures/${id}.pdf`;
    const pdfRes = await fetch(url, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    });
    if (!pdfRes.ok) { console.warn('Failed:', id, p.title); continue; }
    const buf = await pdfRes.arrayBuffer();
    const file = path.join(outDir, `${p.slug || id}.pdf`);
    fs.writeFileSync(file, Buffer.from(buf));
    console.log('✓', file);
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
