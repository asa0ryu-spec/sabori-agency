import { Hono } from 'hono'
import satori from 'satori'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ------------------------------------------------------------------
// ヘルパー関数: Google Fontsからフォントデータを動的に取得する
// ------------------------------------------------------------------
async function loadGoogleFont({ family, weight, text }: { family: string; weight?: number; text?: string }) {
  const params = new URLSearchParams({
    family: `${family}${weight ? `:wght@${weight}` : ''}`,
  })
  if (text) params.append('text', text)
  
  // CSSを取得
  const cssUrl = `https://fonts.googleapis.com/css2?${params.toString()}`
  const css = await fetch(cssUrl, {
    headers: {
      // WOFF形式を返してもらうためのUser-Agent偽装
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    },
  }).then((res) => res.text())

  // CSSからフォントファイルのURLを抽出
  const resource = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff)'\)/) || css.match(/src: url\((.+?)\)/)
  
  if (!resource) throw new Error('Failed to find font url in css')

  // フォントファイル自体を取得
  const res = await fetch(resource[1])
  return res.arrayBuffer()
}

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>サボり許可局 | Official Excuse Agency</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap');
        body {
          font-family: 'Noto Serif JP', serif;
          background-color: #f4f1ea;
          color: #2c2c2c;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .container {
          width: 100%;
          max-width: 600px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          border-bottom: 2px solid #b91c1c;
          display: inline-block;
          padding-bottom: 10px;
        }
        p { font-size: 0.9rem; color: #555; margin-bottom: 2rem; }
        
        .input-group {
          background: white;
          padding: 2rem;
          border: 1px solid #ccc;
          box-shadow: 4px 4px 0px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
        }
        
        input[type="text"] {
          width: 80%;
          padding: 12px;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: inherit;
          margin-bottom: 1rem;
        }
        
        button {
          background-color: #2c2c2c;
          color: white;
          border: none;
          padding: 12px 30px;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover { background-color: #b91c1c; }
        button:disabled { background-color: #ccc; cursor: not-allowed; }

        #result-area {
          margin-top: 20px;
          display: none;
        }
        img {
          max-width: 100%;
          border: 1px solid #ccc;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .loading { font-size: 0.8rem; color: #888; margin-top: 10px; display: none; }
        .error-log { color: red; font-size: 0.8rem; margin-top: 10px; text-align: left; white-space: pre-wrap; display: none; background: #fff0f0; padding: 10px; border: 1px solid red;}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>サボり許可局</h1>
        <p>Official Excuse Agency</p>
        
        <div class="input-group">
          <p>申請理由（嘘は不要です）</p>
          <input type="text" id="reason" placeholder="例：なんとなくダルい" maxlength="50">
          <br>
          <button id="submit-btn" onclick="generateExcuse()">申請を行う</button>
          <div id="loading" class="loading">論理構築中... 官僚がデータベースを検索しています...</div>
          <div id="error-log" class="error-log"></div>
        </div>

        <div id="result-area">
          <h3>発行された許可証</h3>
          <img id="result-img" src="" alt="許可証">
          <p style="font-size: 0.8rem; margin-top: 10px;">画像を長押し/右クリックで保存してください</p>
        </div>
      </div>

      <script>
        async function generateExcuse() {
          const reason = document.getElementById('reason').value;
          if (!reason) return alert('理由を入力してください');

          const btn = document.getElementById('submit-btn');
          const loading = document.getElementById('loading');
          const resultArea = document.getElementById('result-area');
          const img = document.getElementById('result-img');
          const errorLog = document.getElementById('error-log');

          btn.disabled = true;
          loading.style.display = 'block';
          resultArea.style.display = 'none';
          errorLog.style.display = 'none';
          errorLog.textContent = '';

          try {
            const response = await fetch('/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Unknown Error');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            img.src = url;
            resultArea.style.display = 'block';
          } catch (e) {
            errorLog.style.display = 'block';
            errorLog.textContent = '【エラー詳細】\\n' + e.message;
            console.error(e);
          } finally {
            btn.disabled = false;
            loading.style.display = 'none';
          }
        }
      </script>
    </body>
    </html>
  `)
})

app.post('/generate', async (c) => {
  try {
    const { reason } = await c.req.json<{ reason: string }>()
    
    if (!reason || reason.length > 50) {
      return c.json({ error: '申請理由が長すぎます。簡潔に。' }, 400)
    }

    if (!c.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing in Secrets.');
    }

    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY)
    
    // Gemini 2.5 指定
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `
      あなたは冷徹かつ優秀な官僚です。
      ユーザーの入力した「サボりたい理由」を、医学的・科学的・歴史的な権威を用いた「正当な休養事由」に変換しなさい。
      
      # ルール
      1. 出力は必ずJSON形式のみとする。
      2. キーは "title" (病名や現象名), "description" (論理的な解説), "prescription" (処方・対策) とする。
      3. "title"は、難解で権威のある漢字多めの用語にすること。
      4. "description"には、物理法則、生物学、歴史的偉人の逸話などをこじつけて、「休むことが合理的である」と証明すること。
      5. "prescription"は、ユニークかつ甘やかす内容にすること。
      6. 余計なMarkdown記法は含めず、純粋なJSON文字列だけを返しなさい。

      ユーザーの入力: "${reason}"
    `

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    })
    
    const responseText = result.response.text();
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(cleanJsonText);

    // 【修正箇所】URLのハードコードをやめ、Google APIから動的にフォントを取得する
    const fontData = await loadGoogleFont({
      family: 'Noto Serif JP',
      weight: 700
    })

    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#f4f1ea',
          padding: '40px',
          fontFamily: '"Noto Serif JP"',
          position: 'relative',
          border: '8px double #5c4033',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          fontSize: '120px',
          color: 'rgba(0,0,0,0.03)',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}>
          AUTHORIZED
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
          <div style={{ fontSize: '20px' }}>第 8008 号</div>
          <div style={{ fontSize: '16px' }}>発行日: {today}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '42px', fontWeight: 'bold', letterSpacing: '0.2em' }}>欠勤許可証</div>
        </div>

        <div style={{ fontSize: '24px', marginBottom: '40px' }}>
          申請者 殿
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div style={{ display: 'flex', marginBottom: '10px', fontSize: '18px', color: '#555' }}>【診断名】</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '30px', color: '#b91c1c' }}>
            {aiResult.title}
          </div>

          <div style={{ display: 'flex', marginBottom: '10px', fontSize: '18px', color: '#555' }}>【認定理由】</div>
          <div style={{ fontSize: '20px', lineHeight: '1.6', marginBottom: '30px', textAlign: 'justify' }}>
            {aiResult.description}
          </div>

          <div style={{ display: 'flex', marginBottom: '10px', fontSize: '18px', color: '#555' }}>【処方・措置】</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
            {aiResult.prescription}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>認可機関</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>サボり許可局</div>
          </div>
          
          <div style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-10px',
            width: '100px',
            height: '100px',
            border: '4px solid #d93025',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d93025',
            fontSize: '24px',
            fontWeight: 'bold',
            transform: 'rotate(-15deg)',
            opacity: 0.8,
            boxShadow: '0 0 0 2px #d93025 inset' 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' }}>
              <span>許可</span>
              <span style={{ fontSize: '14px', marginTop: '5px' }}>局長印</span>
            </div>
          </div>
        </div>
        
      </div>,
      {
        width: 600,
        height: 800,
        fonts: [
          {
            name: 'Noto Serif JP',
            data: fontData,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    )

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      },
    })

  } catch (e: any) {
    return c.json({ 
      error: `System Error: ${e.message}`,
      stack: e.stack 
    }, 500)
  }
})

export default app


