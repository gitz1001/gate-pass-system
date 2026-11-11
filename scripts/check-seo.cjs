const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRequiredText(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${file}: missing file`);
    return '';
  }

  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    errors.push(`${file}: unable to read (${error.message})`);
    return '';
  }
}

function collectMetaTags(html) {
  const matches = [];
  const tagPattern = /<meta\b[^>]*>/gi;
  for (const tag of html.match(tagPattern) || []) {
    const attributeMatch = tag.match(/\b(?:name|property)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!attributeMatch) continue;
    const name = (attributeMatch[1] || attributeMatch[2] || attributeMatch[3] || '').trim();
    if (!name) continue;

    const contentMatch = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    matches.push({
      name: name.toLowerCase(),
      content: (contentMatch ? (contentMatch[1] || contentMatch[2] || contentMatch[3] || '') : '').trim()
    });
  }
  return matches;
}

function hasMetaTag(html, name, contentPattern) {
  const metaTags = collectMetaTags(html);
  return metaTags.some((tag) => {
    if (tag.name !== name.toLowerCase()) return false;
    if (!contentPattern) return true;
    return contentPattern.test(tag.content);
  });
}

function countTag(html, tagName) {
  return (html.match(new RegExp(`<${tagName}\\b`, 'gi')) || []).length;
}

const publicPages = [
  ['index.html', 'SISC e-Gatepass | Digital School Exit Pass Portal', 1],
  ['privacy-policy.html', 'Privacy Policy | SISC e-Gatepass', 1],
  ['terms-of-service.html', 'Terms of Service | SISC e-Gatepass', 1]
];

for (const [file, title, h1Count] of publicPages) {
  const html = readRequiredText(file);
  if (!html) continue;

  assert(countTag(html, 'title') === 1, `${file}: expected one title`);
  assert(new RegExp(`<title\\s*>${escapeRegExp(title)}\\s*</title>`, 'i').test(html), `${file}: title mismatch`);
  assert(hasMetaTag(html, 'description', /[^\s].{39,}/), `${file}: missing or short meta description`);
  assert(countTag(html, 'h1') === h1Count, `${file}: expected ${h1Count} H1`);
  assert(/<link\b[^>]*\brel\s*=\s*(?:"|')canonical(?:"|')[^>]*>/i.test(html), `${file}: missing canonical tag`);
  assert(hasMetaTag(html, 'og:image'), `${file}: missing OG image metadata`);
}

for (const file of ['app.html', 'newForm.html', 'tgpForm.html', '404.html']) {
  const html = readRequiredText(file);
  if (!html) continue;

  assert(hasMetaTag(html, 'robots', /noindex/i), `${file}: must be noindex`);
  if (file !== 'app.html') assert(countTag(html, 'h1') === 1, `${file}: expected exactly one H1`);
  assert(countTag(html, 'title') === 1, `${file}: expected one unique title tag`);
  assert(hasMetaTag(html, 'description', /[^\s].{39,}/), `${file}: missing or short meta description`);
}

assert(fs.existsSync(path.join(root, 'og-image.jpg')), 'Missing OG image');
assert(fs.existsSync(path.join(root, 'SISC_logo.webp')), 'Missing WebP school logo');
assert(fs.existsSync(path.join(root, 'PGP_Card_1784540906451.webp')), 'Missing WebP sample card A');
assert(fs.existsSync(path.join(root, 'PGP_Card_1784609066593.webp')), 'Missing WebP sample card B');
assert(fs.existsSync(path.join(root, 'api/contact.js')), 'Missing contact endpoint');
assert(fs.existsSync(path.join(root, 'js/contact.js')), 'Missing contact form client script');
assert(fs.existsSync(path.join(root, 'build-seo.cjs')), 'Missing SEO build script');
assert(fs.existsSync(path.join(root, 'robots.template.txt')), 'Missing robots.txt build template');

const indexHtml = readRequiredText('index.html');
if (indexHtml) {
  assert((indexHtml.match(/id\s*=\s*(?:"|')contact-form(?:"|')/gi) || []).length === 1, 'Homepage must contain one contact form');
  assert(/<script\b[^>]*type\s*=\s*(?:"|')application\/ld\+json(?:"|')[^>]*>/i.test(indexHtml), 'Missing organization schema');
}

if (errors.length) {
  console.error('SEO checks failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log(`SEO source checks passed (${publicPages.length} indexable pages; operational pages noindex).`);
