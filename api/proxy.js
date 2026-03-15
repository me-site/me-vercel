const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing URL');

    // 获取当前请求的域名，用于拼接代理地址
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const proxyBase = `${protocol}://${host}/api/proxy?url=`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Referer': new URL(url).origin
            }
        });

        const data = await response.text();
        const urlObj = new URL(url);
        const baseUrl = urlObj.href.substring(0, urlObj.href.lastIndexOf('/') + 1);

        const modifiedData = data.split('\n').map(line => {
            line = line.trim();
            if (line === '' || line.startsWith('#')) {
                // 处理 Key 的 URI
                if (line.includes('URI="')) {
                    return line.replace(/URI="([^"]+)"/, (m, p1) => {
                        const abs = p1.startsWith('http') ? p1 : baseUrl + p1;
                        return `URI="${proxyBase}${encodeURIComponent(abs)}"`;
                    });
                }
                return line;
            }
            
            // 核心修改：无论原地址是什么，统统包上一层代理
            const absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
            return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        }).join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(modifiedData);

    } catch (error) {
        res.status(500).send('Proxy Error: ' + error.message);
    }
};
