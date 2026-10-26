import { readFileSync } from 'node:fs';
import WebSocket from 'ws';
const pages = await (await fetch('http://127.0.0.1:8081/json/list')).json();
const page = pages.find(item => item.appId === 'com.garagememdia.mobile');
if (!page) throw Error('Aplicativo não conectado ao Metro.');
const socket = new WebSocket(page.webSocketDebuggerUrl, { origin: 'http://127.0.0.1:8081' });
let poll;
const timeout = setTimeout(() => { clearInterval(poll); socket.close(); process.exitCode = 1; console.error('Depurador não respondeu.'); }, 30000);
const source = readFileSync(process.argv[2], 'utf8');
socket.addEventListener('open', () => {
  const expression = 'globalThis.__offlineCheck = { state: "running" }; Promise.resolve(eval(' + JSON.stringify(source)
    + ')).then(value => { globalThis.__offlineCheck = { state: "done", value }; }, error => { globalThis.__offlineCheck = { state: "failed", message: String(error), stack: error.stack, cause: String(error.cause) }; }); undefined';
  socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression } }));
  poll = setInterval(() => socket.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate',
    params: { expression: 'globalThis.__offlineCheck', returnByValue: true } })), 500);
});
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id !== 2) return;
  const result = message.result?.result?.value;
  if (result?.state !== 'done' && result?.state !== 'failed') return;
  clearTimeout(timeout); clearInterval(poll);
  console.log(JSON.stringify(result, null, 2));
  if (result.state === 'failed') process.exitCode = 1;
  socket.close();
});
