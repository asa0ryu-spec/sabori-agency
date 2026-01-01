import { Hono } from 'hono'
import satori from 'satori'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// OGP画像生成
app.get('/og-image', async (c) => {
  const fontData = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/shipporimincho/ShipporiMincho-Bold.ttf')
    .then((res) => {
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status} ${res.statusText}`);
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
    headers: { 'Content-Type': 'image/svg+xml' },
  })
})

// メイン画面
app.get('/', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const ogImageUrl = `${baseUrl}/og-image`;

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="author" content="Sabo Rikyu (Hidden Layer Works)">
      
      <title>サボり許可局 | Official Excuse Agency</title>
      <meta name="description" content="AI官僚が、あなたの怠惰を正当な休養事由として認可します。">
      
      <meta property="og:type" content="website">
      <meta property="og:url" content="${baseUrl}">
      <meta property="og:title" content="サボり許可局 | Official Excuse Agency">
      <meta property="og:description" content="AI官僚が、あなたの怠惰を正当な休養事由として認可します。">
      <meta property="og:image" content="${ogImageUrl}">

      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:image" content="${ogImageUrl}">

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
        
        .btn {
          border: none;
          padding: 12px 30px;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          text-decoration: none;
          display: inline-block;
          border-radius: 4px;
          margin: 5px;
        }
        .btn:active { transform: scale(0.98); }

        .btn-submit {
          background-color: #2c2c2c;
          color: white;
          width: 80%;
        }
        .btn-submit:hover { background-color: #b91c1c; }
        .btn-submit:disabled { background-color: #ccc; cursor: not-allowed; }

        .btn-share {
          background-color: #000;
          color: white;
          font-size: 0.9rem;
          padding: 10px 20px;
        }
        .btn-share:hover { background-color: #333; }

        .bribe-section {
          margin-top: 40px;
          border-top: 1px dashed #ccc;
          padding-top: 20px;
        }
        .bribe-link {
          font-size: 0.9rem;
          color: #b91c1c;
          text-decoration: underline;
          cursor: pointer;
          font-weight: bold;
        }
        .bribe-link:hover { color: #8a1c1c; }
        .bribe-email-box {
          margin-top: 15px;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          display: inline-block;
          text-align: center;
        }
        .bribe-email {
          font-family: monospace;
          background: #fff;
          padding: 5px 10px;
          border: 1px solid #ddd;
          border-radius: 3px;
          margin-top: 5px;
          display: block;
          user-select: all;
        }

        #result-area {
          margin-top: 20px;
          display: none;
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        img {
          max-width: 100%;
          border: 1px solid #ccc;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .loading { font-size: 0.8rem; color: #555; margin-top: 10px; display: none; font-style: italic; }
        .error-log { color: red; font-size: 0.8rem; margin-top: 10px; text-align: left; white-space: pre-wrap; display: none; background: #fff0f0; padding: 10px; border: 1px solid red;}
        .footer-version { font-size: 0.6rem; color: #ccc; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>サボり許可局</h1>
        <p>Official Excuse Agency</p>
        
        <div class="input-group">
          <p>申請理由（嘘は不要です）</p>
          <input type="text" id="reason" placeholder="例：帰りたい、働きたくない" maxlength="50">
          <br>
          <button id="submit-btn" class="btn btn-submit" onclick="generateExcuse()">申請を行う</button>
          <div id="loading" class="loading"></div>
          <div id="error-log" class="error-log"></div>
        </div>

        <div id="result-area">
          <h3>発行された許可証</h3>
          <img id="result-img" src="" alt="許可証">
          <p style="font-size: 0.8rem; color: #555;">画像を長押しで保存してください</p>
          
          <div style="margin-top: 20px;">
            <a id="share-link" href="#" target="_blank" class="btn btn-share">
              X (旧Twitter) で見せびらかす
            </a>
          </div>

          <div class="bribe-section">
            <p style="font-size: 0.8rem; margin-bottom: 10px;">この許可証は有効ですか？</p>
            
            <a href="https://www.amazon.co.jp/dp/B004N3APGO" target="_blank" class="bribe-link">
              局長室へ袖の下（Amazonギフト券）を届ける
            </a>
            
            <div class="bribe-email-box">
              <span style="font-size: 0.7rem; color: #555;">▼ 受取人メールアドレス (タップしてコピー)</span>
              <code class="bribe-email" onclick="copyEmail(this)">hidden.layer.works@gmail.com</code>
            </div>
            
            <p style="font-size: 0.7rem; color: #aaa; margin-top: 10px;">※ 納品された物資は、局長の怠惰な生活維持に使用されます。</p>
          </div>
        </div>
        
        <div class="footer-version">System v2.1.1 (Authorized by S.Rikyu)</div>
      </div>

      <script>
        // お役所感のあるローディングメッセージ
        const loadingMessages = [
          "申請書類の不備を再確認中...",
          "関係省庁との調整を行っております...",
          "決裁ルートを確認中...",
          "上長の承認印を待機中...",
          "稟議書を作成中...",
          "前例をデータベースから検索中...",
          "法務局への照会を実行中...",
          "定款の解釈を確認中...",
          "公印のインクを補充中...",
          "窓口担当者が離席中です..."
        ];

        let loadingInterval;

        async function generateExcuse() {
          const reason = document.getElementById('reason').value;
          if (!reason) return alert('理由を入力してください');

          const btn = document.getElementById('submit-btn');
          const loading = document.getElementById('loading');
          const resultArea = document.getElementById('result-area');
          const img = document.getElementById('result-img');
          const errorLog = document.getElementById('error-log');
          const shareLink = document.getElementById('share-link');

          btn.disabled = true;
          loading.style.display = 'block';
          resultArea.style.display = 'none';
          errorLog.style.display = 'none';
          errorLog.textContent = '';

          // ランダムメッセージ開始
          loading.textContent = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
          loadingInterval = setInterval(() => {
            loading.textContent = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
          }, 2000);

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
            
            // 【修正箇所】テンプレートリテラルをやめ、単純な文字列結合に変更（安全策）
            const shareText = encodeURIComponent("【サボり許可局】\\n理由：「" + reason + "」\\n\\n正式に休養が認可されました。\\n#サボり許可局\\n");
            const shareUrl = "https://twitter.com/intent/tweet?text=" + shareText + "&url=" + encodeURIComponent("${baseUrl}");
            shareLink.href = shareUrl;

            resultArea.style.display = 'block';
          } catch (e) {
            errorLog.style.display = 'block';
            errorLog.textContent = '【エラー詳細】\\n' + e.message;
            console.error(e);
          } finally {
            clearInterval(loadingInterval);
            btn.disabled = false;
            loading.style.display = 'none';
          }
        }

        function copyEmail(element) {
          const email = element.textContent;
          navigator.clipboard.writeText(email).then(() => {
            alert('局長のメールアドレスをコピーしました。');
          }).catch(err => {
            console.error('Copy failed', err);
          });
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

    const isRejected = Math.random() < 0.0001; 
    
    const lengthDice = Math.random();
    let lengthInstruction = "";
    if (lengthDice < 0.2) {
        lengthInstruction = "【モード：簡潔】一言で、格言のようにバッサリと言い切ること。説明は最小限に。余計な修飾語は省け。";
    } else if (lengthDice < 0.8) {
        lengthInstruction = "【モード：通常】論理的に、かつ説得力のある文章で記述すること。適度な長さで。";
    } else {
        lengthInstruction = "【モード：饒舌】学術論文や哲学書のように、無駄に長く詳細に、回りくどく記述すること。知識をひけらかせ。";
    }

    let prompt = "";
    if (isRejected) {
      prompt = `
        あなたは冷徹な鬼軍曹です。
        ユーザーの「サボりたい理由」を一刀両断し、却下通知を作成しなさい。

        # ルール
        1. 出力はJSON形式のみ: { "header", "title", "description", "prescription" }
        2. "header": 「欠勤申請 却下通知書」で固定。
        3. "title": 「却下」「不許可」「甘え」等の厳しい言葉 (20文字以内)。
        4. "description": ユーザーを論破し、働く喜びを説く (80文字以内)。
        5. "prescription": 「直ちに出社せよ」等の命令 (30文字以内)。
        
        ユーザーの入力: "${reason}"
      `;
    } else {
      prompt = `
        あなたは優秀な官僚です。
        ユーザーの「怠惰な要望」の内容に応じて、最適な許可証のタイトルを決定し、医学・物理学・歴史を用いて正当化しなさい。
        
        # ルール
        1. 出力はJSON形式のみ: { "header", "title", "description", "prescription" }
        2. "header": 入力内容に応じた証書名（早退許可証、在宅勤務命令書、欠勤許可証、遅刻容認書など）。
        3. "title": 難解な漢字用語 (20文字以内)。
        4. "description": ${lengthInstruction} (文量に合わせて内容を調整せよ。最大100文字程度まで許容)
        5. "prescription": マイルドな提案表現にする (30文字以内)。

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
        header: "緊急避難命令書",
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
    const issueNumber = Math.floor(Math.random() * 9000) + 1000;

    const bgColor = isRejected ? '#ffeef0' : '#f4f1ea'; 
    const borderColor = isRejected ? '#8a1c1c' : '#5c4033'; 
    const stampText = isRejected ? '却下' : '許可'; 
    const stampColor = '#d93025'; 
    
    const headerText = aiResult.header || (isRejected ? '却下通知書' : '欠勤許可証');

    const titleSize = (aiResult.title && aiResult.title.length > 12) ? '24px' : '32px';
    
    let descSize = '20px';
    const descLen = aiResult.description ? aiResult.description.length : 0;
    if (descLen > 90) descSize = '15px';
    else if (descLen > 60) descSize = '17px';
    
    const headerSize = (headerText.length > 6) ? '36px' : '42px';

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
           border: \`4px solid \${borderColor}\`,
           padding: '4px',
        }}>
           <div style={{
             display: 'flex',
             flexDirection: 'column',
             width: '100%',
             height: '100%',
             border: \`2px solid \${borderColor}\`,
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
              <div style={{ fontSize: '20px' }}>{`第 \${issueNumber} 号`}</div>
              <div style={{ fontSize: '16px' }}>{`発行日: \${today}`}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: headerSize, fontWeight: 'bold', letterSpacing: '0.1em', color: isRejected ? '#b91c1c' : '#000' }}>
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
              <div style={{ fontSize: titleSize, fontWeight: 'bold', marginBottom: '25px', color: '#b91c1c', lineHeight: '1.2' }}>
                {aiResult.title}
              </div>

              <div style={{ display: 'flex', marginBottom: '8px', fontSize: '18px', color: '#555' }}>
                 {isRejected ? '【判定詳細】' : '【認定理由】'}
              </div>
              <div style={{ fontSize: descSize, lineHeight: '1.5', marginBottom: '25px', textAlign: 'justify' }}>
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
                border: \`4px solid \${stampColor}\`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stampColor,
                fontSize: '24px',
                fontWeight: 'bold',
                transform: 'rotate(-15deg)',
                opacity: 0.8,
                boxShadow: \`0 0 0 2px \${stampColor} inset\` 
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


