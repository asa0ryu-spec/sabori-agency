import { Hono } from 'hono'
import satori from 'satori'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>サボり許可局 | Official Excuse Agency</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&display=swap');
        body {
          font-family: 'Shippori Mincho', serif;
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // -------------------------------------------------------------
    // 【運命のダイスロール】
    // 1/10000 の確率で「却下 (isRejected)」フラグを立てる
    // -------------------------------------------------------------
    const isRejected = Math.random() < 0.0001; 
    // ※テストしたい場合はここを < 0.5 などに書き換えてデプロイしてください

    let prompt = "";

    if (isRejected) {
      // 激レア：却下モードのプロンプト
      prompt = `
        あなたは冷徹な鬼軍曹です。
        ユーザーの「サボりたい理由」を一刀両断し、出社を命じる「却下通知」を作成しなさい。

        # ルール
        1. 出力はJSON形式のみ (title, description, prescription)。
        2. "title": 「却下」「不許可」を含む厳しい言葉 (20文字以内)。
        3. "description": ユーザーの甘えを論理的に論破し、働くことの喜び（皮肉）を説く (80文字以内)。
        4. "prescription": 「直ちに出社せよ」「甘えるな」等の厳しい命令 (30文字以内)。
        5. 純粋なJSONのみを返すこと。
        
        ユーザーの入力: "${reason}"
      `;
    } else {
      // 通常：許可モードのプロンプト（処方をマイルド化）
      prompt = `
        あなたは慈愛に満ちたカウンセラーであり、同時に優秀な官僚です。
        ユーザーの「サボりたい理由」を肯定し、「正当な休養事由」に変換しなさい。
        
        # ルール
        1. 出力はJSON形式のみ (title, description, prescription)。
        2. "title": 難解な漢字用語 (20文字以内)。
        3. "description": 物理法則や偉人の逸話をこじつけ、休むことの正当性を証明する (80文字以内)。
        4. "prescription": **「～しましょう」「～してあげてください」といった、柔らかく包み込むような表現**にする (30文字以内)。
        5. 純粋なJSONのみを返すこと。

        ユーザーの入力: "${reason}"
      `;
    }

    let aiResult;
    try {
      const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
      const responseText = result.response.text();
      const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      aiResult = JSON.parse(cleanJsonText);
    } catch (aiError) {
      console.error(aiError);
      aiResult = {
        title: "緊急システム障害",
        description: "AIの思考回路が貴殿の怠惰への熱意に圧倒され処理を放棄しました。",
        prescription: "何も考えず、ただ泥のように眠りましょう。"
      };
    }

    const fontData = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/shipporimincho/ShipporiMincho-Bold.ttf')
      .then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status} ${res.statusText}`);
        return res.arrayBuffer();
      })

    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
    
    // 【こだわり①】ランダムな発行番号 (1000〜9999)
    const issueNumber = Math.floor(Math.random() * 9000) + 1000;

    // デザイン定義（却下時は赤基調にする）
    const bgColor = isRejected ? '#ffeef0' : '#f4f1ea'; // 却下なら薄い赤
    const borderColor = isRejected ? '#8a1c1c' : '#5c4033'; // 却下なら濃い赤枠
    const stampText = isRejected ? '却下' : '許可'; // ハンコの文字
    const stampColor = '#d93025'; // ハンコは常に赤
    const headerText = isRejected ? '欠勤申請 却下通知書' : '欠勤許可証';

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: bgColor,
          padding: '20px', 
          fontFamily: '"Shippori Mincho"',
          position: 'relative',
        }}
      >
        <div style={{
           display: 'flex',
           flexDirection: 'column',
           width: '100%',
           height: '100%',
           border: `4px solid ${borderColor}`,
           padding: '4px',
        }}>
           <div style={{
             display: 'flex',
             flexDirection: 'column',
             width: '100%',
             height: '100%',
             border: `2px solid ${borderColor}`,
             padding: '20px',
             position: 'relative',
           }}>

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
              {isRejected ? 'REJECTED' : 'AUTHORIZED'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
              <div style={{ fontSize: '20px' }}>{`第 ${issueNumber} 号`}</div>
              <div style={{ fontSize: '16px' }}>{`発行日: ${today}`}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '42px', fontWeight: 'bold', letterSpacing: '0.1em', color: isRejected ? '#b91c1c' : '#000' }}>
                {headerText}
              </div>
            </div>

            <div style={{ fontSize: '24px', marginBottom: '30px' }}>
              申請者 殿
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div style={{ display: 'flex', marginBottom: '8px', fontSize: '18px', color: '#555' }}>
                {isRejected ? '【却下事由】' : '【診断名】'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '25px', color: '#b91c1c', lineHeight: '1.2' }}>
                {aiResult.title}
              </div>

              <div style={{ display: 'flex', marginBottom: '8px', fontSize: '18px', color: '#555' }}>
                 {isRejected ? '【判定詳細】' : '【認定理由】'}
              </div>
              <div style={{ fontSize: '18px', lineHeight: '1.5', marginBottom: '25px', textAlign: 'justify' }}>
                {aiResult.description}
              </div>

              <div style={{ display: 'flex', marginBottom: '8px', fontSize: '18px', color: '#555' }}>
                 {isRejected ? '【命令】' : '【処方・措置】'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
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
                border: `4px solid ${stampColor}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stampColor,
                fontSize: '24px',
                fontWeight: 'bold',
                transform: 'rotate(-15deg)',
                opacity: 0.8,
                boxShadow: `0 0 0 2px ${stampColor} inset` 
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1' }}>
                  <span>{stampText}</span>
                  <span style={{ fontSize: '14px', marginTop: '5px' }}>局長印</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>,
      {
        width: 600,
        height: 800,
        fonts: [
          {
            name: 'Shippori Mincho',
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


