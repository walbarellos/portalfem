const fs = require('fs');

const appJsPath = '/directus/node_modules/.pnpm/@directus+api@file+api_@opentelemetry+api@1.9.0_@opentelemetry+core@2.1.0_@opentelemetr_4fe57fc2f23b0f156ebf7487ebe3f888/node_modules/@directus/api/dist/app.js';

let src = fs.readFileSync(appJsPath, 'utf8');

const search = `app.use("/admin/*", sendHtml);`;
const replace = `app.use("/admin/*", (req, res, next) => {
					const match = req.path.match(/\\/([a-z]{2}-[A-Z]{2}\\.js)$/);
					if (match) {
						const localePath = path.join(adminPath, "..", "lang", match[1]);
						return res.sendFile(localePath, (err) => { if (err) next(); });
					}
					next();
				});\n\t\t\t\t${search}`;

if (src.includes(replace)) {
  console.log('Already patched');
  process.exit(0);
}

if (!src.includes(search)) {
  console.log('Search string not found');
  process.exit(1);
}

src = src.replace(search, replace);
fs.writeFileSync(appJsPath, src);
console.log('Patched OK');
