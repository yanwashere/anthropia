const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9000;

const server = http.createServer((req, res) => {
  // Маршрутизация для CRM файлов
  if (req.url.startsWith('/crm-widget.js') || req.url.startsWith('/crm/')) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'application/javascript';
      if (ext === '.css') contentType = 'text/css';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  // Основной сайт
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.js') contentType = 'application/javascript';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Main Site: http://localhost:${PORT}`);
  console.log(`🔧 CRM Backend: http://localhost:5000/api`);
  console.log(`📱 CRM Frontend: http://localhost:3000`);
  console.log(`\nОтрывай браузер и переходи на http://localhost:${PORT}\n`);
});
