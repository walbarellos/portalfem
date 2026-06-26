const fs = require('fs');
const path = require('path');

// Path to app.js in the container
const appJsPath = '/directus/node_modules/.pnpm/@directus+api@file+api_@opentelemetry+api@1.9.0_@opentelemetry+core@2.1.0_@opentelemetr_4fe57fc2f23b0f156ebf7487ebe3f888/node_modules/@directus/api/dist/app.js';

if (!fs.existsSync(appJsPath)) {
  console.error('app.js not found at ' + appJsPath);
  process.exit(1);
}

let src = fs.readFileSync(appJsPath, 'utf8');

// Check if already patched
if (src.includes('tinymce.addI18n')) {
  console.log('Already patched');
  process.exit(0);
}

// Find the exact pattern to insert after
const search = 'app.get("/admin", sendHtml);';

if (!src.includes(search)) {
  console.error('Search pattern not found');
  process.exit(1);
}

// Build the middleware code with proper indentation (tabs as used in the file)
const middleware = [
  '',
  '\t\tapp.use("/admin", (req, res, next) => {',
  '\t\t\tconst match = req.path.match(/\\/([a-z]{2}(?:-[A-Z]{2})?)\\.js$/);',
  '\t\t\tif (match) {',
  '\t\t\t\tres.setHeader("Content-Type", "application/javascript; charset=utf-8");',
  '\t\t\t\tres.setHeader("Cache-Control", "max-age=86400");',
  '\t\t\t\tres.send(\'tinymce.addI18n("\' + match[1] + \'", {});\\n\');',
  '\t\t\t\treturn;',
  '\t\t\t}',
  '\t\t\tnext();',
  '\t\t});'
].join('\n');

// Insert the middleware after the app.get line
src = src.replace(search, search + middleware);
fs.writeFileSync(appJsPath, src);
console.log('Patched OK');
