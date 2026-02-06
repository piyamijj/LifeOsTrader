exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    // 1. OANDA'dan Altın Fiyatı Çek
    const oandaRes = await fetch("https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?count=1&granularity=M15&price=M", {
      headers: { "Authorization": `Bearer ${process.env.OANDA_API_KEY}` }
    });
    const oandaData = await oandaRes.json();
    const price = oandaData.candles ? oandaData.candles[0].mid.c : "2000.00";

    // 2. Gemini 2.0 Analizi
    const prompt = `Altın fiyatı: ${price}. Çok kısa bir teknik analiz yap ve sadece şu JSON formatında dön: {"globalStatus": "AKTİF", "radarElements": ["Fiyat: ${price}", "Trend: Analiz Edildi"], "strategies": {"scalp": {"pair": "XAU/USD", "action": "BEKLE", "price": "${price}", "tp": "0", "sl": "0"}}}`;

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
        globalStatus: "BAĞLANTI HATASI", 
        radarElements: ["Hata: " + e.message],
        strategies: { scalp: { pair: "XAU/USD", action: "KONTROL", price: "0", tp: "0", sl: "0" } }
      }) 
    };
  }
};
