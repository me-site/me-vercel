import axios from 'axios';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing URL');

    // 1. 使用原生 WHATWG URL API (修复 DeprecationWarning)
    const urlContext = new URL(targetUrl);
    const taiwanIp = `125.227.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`;
    
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'X-Forwarded-For': taiwanIp,
                'Client-IP': taiwanIp,
                'Referer': 'https://4gtv.tv/',
                'Origin': 'https://4gtv.tv/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site'
            },
            timeout: 10000,
            responseType: 'arraybuffer', 
            validateStatus: () => true 
        });

        // 2. 处理 403 封锁情况
        if (response.status === 403) {
            return res.status(403).send('源站封锁了 Vercel IP。请尝试在 vercel.json 中切换 regions（如 sin1 或 hnd1）。');
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        
        // 3. M3U8 递归重写逻辑
        let data = response.data;
        if (targetUrl.includes('.m3u8')) {
            let m3u8Content = data.toString('utf8');
            if (m3u8Content.includes('#EXTM3U')) {
                const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
                // 确保重写路径指向 /api/proxy (根据你的 200 日志显示这个路径是通的)
                const proxyBase = `https://${req.headers.host}/api/proxy?url=`;
                
                m3u8Content = m3u8Content.split('\n').map(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const absUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
                        return proxyBase + encodeURIComponent(absUrl);
                    }
                    return line;
                }).join('\n');
                return res.status(200).send(m3u8Content);
            }
        }

        return res.status(200).send(data);

    } catch (err) {
        return res.status(500).send('Proxy Error: ' + err.message);
    }
}
