import fetch from 'node-fetch';
async function run() {
  const res = await fetch('http://localhost:8055/items/resultados_editais?fields=*.*');
  const data = await res.json();
  console.log(JSON.stringify(data.data, null, 2));
}
run();
