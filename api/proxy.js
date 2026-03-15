const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('Missing URL parameter');
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Referer': new URL(url).origin
            }
        });

        const data = await response.text();

        // 核心逻辑：补全 M3U8 内的相对路径
        const urlObj = new URL(url);
        // 获取基础路径，例如 http://.../live/hoy/
        const baseUrl = urlObj.href.substring(0, urlObj.href.lastIndexOf('/') + 1);

        // 处理 M3U8 内容
        const modifiedData = data.split('\n').map(line => {
            line = line.trim();
            if (line === '' || line.startsWith('#')) {
                // 如果是 Key 的 URI 路径，也需要补全
                if (line.includes('URI="') && !line.includes('://')) {
                    return line.replace('URI="', `URI="${baseUrl}`);
                }
                return line;
            }
            // 如果链接不是以 http 开头，就补全它
            if (!line.startsWith('http')) {
                return baseUrl + line;
            }
            return line;
        }).join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(modifiedData);

    } catch (error) {
        res.status(500).send('Error fetching the stream: ' + error.message);
    }
};
