import axios from 'axios';
import { Stream } from 'stream';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("#EXTM3U\n#ERROR: No URL provided");

    // 深度伪装 Headers，模拟真实浏览器绕过 Cloudflare 验证
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.4gtv.tv/',
        'Origin': 'https://www.4gtv.tv/',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive'
    };

    try {
        const isTS = targetUrl.includes('.ts') || req.query.type === 'ts';

        const response = await axios.get(targetUrl, {
            headers: headers,
            timeout: isTS ? 45000 : 15000,
            responseType: isTS ? 'stream' : 'text', 
            validateStatus: () => true
        });

        // 基础响应头设置
        res.setHeader('Access-Control-Allow-Origin', '*');
        const finalUrl = response.request.res.responseUrl || targetUrl;

        // 如果返回了 403 或 503 (五秒盾)，尝试输出错误
        if (response.status === 403 || response.status === 503) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(response.status).send(response.data);
        }

        if (isTS) {
            // --- TS 切片流式转发 ---
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            if (response.data instanceof Stream) {
                response.data.pipe(res);
            } else {
                res.status(500).send("Stream error");
            }
        } else {
            // --- M3U8 解析与递归重写 ---
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            const content = response.data;
            const urlObj = new URL(finalUrl);
            const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
            const query = urlObj.search; 
            
            const selfUrl = `https://${req.headers.host}/api/proxy?url=`;

            const lines = content.split('\n');
            const processed = lines.map(line => {
                const l = line.trim();
                if (!l) return "";

                if (l.startsWith('#')) {
                    if (l.includes('URI="')) {
                        return l.replace(/URI="([^"]+)"/, (match, p1) => {
                            const abs = p1.startsWith('http') ? p1 : (basePath + p1 + query);
                            return `URI="${selfUrl}${encodeURIComponent(abs)}"`;
                        });
                    }
                    return l;
                } else {
                    const abs = l.startsWith('http') ? l : (basePath + l + query);
                    const connector = abs.includes('?') ? '&' : '?';
                    return `${selfUrl}${encodeURIComponent(abs)}${connector}type=ts`;
                }
            });

            res.status(200).send(processed.join('\n'));
        }
    } catch (err) {
        res.status(500).send(`#EXTM3U\n#ERROR: ${err.message}`);
    }
}
