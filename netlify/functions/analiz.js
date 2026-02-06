exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    // Arayüzden gelen soruyu al
    const body = event.body ? JSON.parse(event.body) : {};
    const userQuestion = body.question || "Genel piyasa durumu nedir?";

    // 1. OANDA'dan Canlı Fiyat Çek
    const oandaRes = await fetch("https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?count=5&granularity=M15&price=M", {
      headers: { "Authorization": `Bearer ${process.env.OANDA_API_KEY}` }
    });
    const oandaData = await oandaRes.json();
    const candles = oandaData.candles || [];
    const currentPrice = candles.length > 0 ? candles[candles.length - 1].mid.c : "Bilinmiyor";

    // 2. Gemini 2.0 Strateji Analizi
    // Gemini'ye "Sen bir Forex Uzmanısın" rolünü ve net rakam vermesi gerektiğini söylüyoruz.
    const prompt = `
      Sen Piyami, usta bir Forex analistisin.
      Şu anki XAU/USD Fiyatı: ${currentPrice}.
      Kullanıcının Sorusu: "${userQuestion}"

      GÖREV:
      1. Fiyat hareketine bakarak Scalp (kısa vade), Günlük ve Haftalık için YÖN (AL/SAT/NÖTR) belirle.
      2. Kullanıcının sorusuna kısa, zeki ve yol gösterici bir cevap ver.
      3. Eğer yön AL veya SAT ise, mantıklı bir Giriş, Stop Loss (SL) ve Take Profit (TP) seviyesi hesapla.

      SADECE ŞU JSON FORMATINDA CEVAP VER (Yorum yapma):
      {
        "globalStatus": "AKTİF - ${currentPrice}",
        "radarElements": ["Fiyat: ${currentPrice}", "Trend Analizi Tamamlandı", "Volatilite Kontrol Edildi"],
        "aiResponse": "Soruna cevabım buraya gelecek...",
        "strategies": {
          "scalp": { "pair": "XAU/USD", "action": "BEKLE", "price": "${currentPrice}", "tp": "0", "sl": "0" },
          "day": { "pair": "EUR/USD", "action": "BEKLE", "price": "1.0850", "tp": "0", "sl": "0" },
          "swing": { "pair": "USD/TRY", "action": "BEKLE", "price": "34.20", "tp": "0", "sl": "0" }
        }
      }
    `;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const gData = await geminiRes.json();
    const cleanJson = gData.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();

    return { statusCode: 200, headers, body: cleanJson };

  } catch (e) {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        globalStatus: "BAĞLANTI KOPTU", 
        radarElements: ["Hata: " + e.message],
        aiResponse: "Şu an piyasaya erişemiyorum komutanım.",
        strategies: null
      }) 
    };
  }
};
