const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'js', 'stages.js');

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-file-name');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const fileContent = `const STAGES = ${JSON.stringify(data, null, 4)};`;

                fs.writeFileSync(FILE_PATH, fileContent, 'utf8');
                console.log(`[${new Date().toLocaleTimeString()}] Successfully saved stages to js/stages.js`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Saved successfully' }));
            } catch (err) {
                console.error('Save error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: err.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/upload') {
        const originalFileName = decodeURIComponent(req.headers['x-file-name']);
        // Sanitize filename: remove spaces and special chars
        const fileName = originalFileName.replace(/\s+/g, '_');
        const uploadDir = path.join(__dirname, 'images', '교재png');
        const filePath = path.join(uploadDir, fileName);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileStream = fs.createWriteStream(filePath);
        req.pipe(fileStream);

        req.on('end', () => {
            console.log(`[${new Date().toLocaleTimeString()}] Successfully uploaded image to 교재png: ${fileName}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: 'images/교재png/' + fileName }));
        });

        fileStream.on('error', (err) => {
            console.error('File write error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: err.message }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log('-------------------------------------------');
    console.log(`Save Server running at http://localhost:${PORT}`);
    console.log(`Monitoring: ${FILE_PATH}`);
    console.log('-------------------------------------------');
});
