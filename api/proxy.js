import axios from 'axios';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('No URL provided');

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://tv.iill.top/' // 针对 4GTV 伪装来源
            },
            timeout: 8000,
            responseType: 'arraybuffer', // 统一处理，防止字符编码导致的 500
            validateStatus: () => true   // 强制捕获所有状态码，不让函数崩溃
        });

        // 将源站的状态码和 Header 透传，方便调试
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type'] || 'text/plain');
        
        return res.status(response.status).send(response.data);

    } catch (err) {
        return res.status(500).send('Vercel Internal Error: ' + err.message);
    }
}
