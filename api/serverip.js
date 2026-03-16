// api/serverip.js
export default function handler(req, res) {
  // 获取 Vercel Edge 节点 IP
  const serverIP = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 返回 JSON，服务器归属地可以自己填写或者通过服务端 IP 查询
  res.status(200).json({
    ip: serverIP,
    country: "美国",       // 根据 Vercel 节点修改
    region: "California"  // 根据节点修改
  });
}
