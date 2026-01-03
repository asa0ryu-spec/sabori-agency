import { Hono } from 'hono'
import satori from 'satori'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * サボり許可局 - Secure Version 3.1.0
 * 全ての認証情報を環境変数に移行。コードから個人情報を完全に隠蔽。
 */

type Bindings = {
  GEMINI_API_KEY: string
  GITHUB_TOKEN: string
  GITHUB_USER: string
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  IMAGE_FILENAME: string
}

const app = new Hono<{ Bindings: Bindings }>()

// -------------------------------------------------------------------------
// 画像プロキシ (環境変数 完全準拠版)
// -------------------------------------------------------------------------
app.get('/image/:filename', async (c) => {
  const filename = c.req.param('filename');
  
  // Cloudflare Dashboardで設定した変数を読み込み
  const { GITHUB_USER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN } = c.env;

  // 必須情報の欠落チェック（論理的整合性の防護）
  if (!GITHUB_USER || !GITHUB_REPO || !GITHUB_BRANCH || !GITHUB_TOKEN) {
    console.error('CRITICAL ERROR: Environment variables are missing.');
    return c.text('Configuration Error', 500);
  }

  const imageUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filename}`;
  
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Cloudflare-Workers'
      }
    });
    
    if (!response.ok) {
      return c.text('Asset Not Found', 404);
    }
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400' 
      }
    });

  } catch (e) {
    return c.text('Gateway Error', 502);
  }
})

// -------------------------------------------------------------------------
// OGP画像生成
// -------------------------------------------------------------------------
app.get('/og-image', async (c) => {
  const fontData = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/shipporimincho/ShipporiMincho-Bold.ttf')
    .then((res) => {
      if (!res.ok) throw new Error('Font load failed');
      return res.arrayBuffer();
    })

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#f4f1ea',
        border: '16px solid #b91c1c',
        fontFamily: '"Shippori Mincho"',
      }}
    >
      <div style={{ display: 'flex', fontSize: '80px', fontWeight: 'bold', color: '#2c2c2c', marginBottom: '20px' }}>
        サボり許可局
      </div>
      <div style={{ display: 'flex', fontSize: '40px', color: '#b91c1c' }}>
        Official Excuse Agency
      </div>
      <div style={{ display: 'flex', marginTop: '40px', padding: '20px 40px', border: '4px solid #5c4033', borderRadius: '20px', fontSize: '30px', color: '#5c4033' }}>
        あなたの怠惰を、論理的に正当化します。
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Shippori Mincho', data: fontData, weight: 700, style: 'normal' }],
    }
  )

  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
})

// -------------------------------------------------------------------------
// メイン画面
// -------------------------------------------------------------------------
app.get('/', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const imageFile = c.env.IMAGE_FILENAME || '1767440233185.jpg';
  const ogImageUrl = `${baseUrl}/image/${imageFile}`;

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-YP5WQNZ3Y8"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-YP5WQNZ3Y8');
      </script>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>サボり許可局 | Official Excuse Agency</title>
      <meta property="og:title" content="サボり許可局 | Official Excuse Agency">
      <meta property="og:image" content="${ogImageUrl}">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:image" content="${ogImageUrl}">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&display=swap');
        body { font-family: 'Shippori Mincho', serif; background-color: #f4f1ea; color: #2c2c2c; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .container { width: 100%; max-width: 600px; text-align: center; }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; border-bottom: 2px solid #b91c1c; display: inline-block; padding-bottom: 10px; }
        .input-group { background: white; padding: 2rem; border: 1px solid #ccc; box-shadow: 4px 4px 0px rgba(0,0,0,0.1); margin-bottom: 2rem; }
        input { width: 80%; padding: 12px; margin-bottom: 1rem; }
        .btn { padding: 12px 30px; background: #2c2c2c; color: white; border: none; border-radius: 4px; cursor: pointer; }
        #result-area { display: none; margin-top: 20px; }
        img { max-width: 100%; border: 1px solid #ccc; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>サボり許可局</h1>
        <div class="input-group">
          <p>申請理由</p>
          <input type="text" id="reason" placeholder="例：働きたくない">
          <br>
          <button class="btn" onclick="generate()">申請を行う</button>
        </div>
        <div id="result-area">
          <h3>認可されました</h3>
          <img id="result-img" src="">
        </div>
      </div>
      <script>
        async function generate() {
          const reason = document.getElementById('reason').value;
          const res = await fetch('/generate', { method: 'POST', body: JSON.stringify({ reason }) });
          const blob = await res.blob();
          document.getElementById('result-img').src = URL.createObjectURL(blob);
          document.getElementById('result-area').style.display = 'block';
        }
      </script>
    </body>
    </html>
  `)
})

app.post('/generate', async (c) => {
  const { reason } = await c.req.json();
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(`「${reason}」を官僚的に正当化する許可証をJSONで。{ "header", "title", "description", "prescription" }`);
  const aiResult = JSON.parse(result.response.text().replace(/\\`\\`\\`json/g, '').replace(/\\`\\`\\`/g, '').trim());
  const fontData = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/shipporimincho/ShipporiMincho-Bold.ttf').then(res => res.arrayBuffer());
  const svg = await satori(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#f4f1ea', padding: '40px', fontFamily: '"Shippori Mincho"', border: '10px double #5c4033' }}>
      <div style={{ fontSize: '42px', fontWeight: 'bold', textAlign: 'center' }}>{aiResult.header}</div>
      <div style={{ fontSize: '32px', color: '#b91c1c', marginTop: '40px' }}>{aiResult.title}</div>
      <div style={{ fontSize: '18px', marginTop: '20px' }}>{aiResult.description}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 'auto' }}>措置：{aiResult.prescription}</div>
    </div>,
    { width: 600, height: 800, fonts: [{ name: 'Shippori Mincho', data: fontData, weight: 700, style: 'normal' }] }
  )
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
})

export default app

