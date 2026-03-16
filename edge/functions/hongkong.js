export default {
  async fetch(request, env, ctx) {
    const userCountry = request.headers.get('x-vercel-ip-country') || 'unknown';
    const userRegion = request.headers.get('x-vercel-ip-region') || 'unknown';

    // 判断是否来自 HK（国家和区域）
    if (userCountry === 'HK' || userRegion === 'Hong Kong') {
      // HK 用户访问本地源站（你的直播源服务器）
      return fetch('https://your-hk-live-server.com/stream');
    }

    // 否则使用全局源站（比如你的服务器在国外）
    return fetch('https://your-global-live-server.com/stream');
  }
}
