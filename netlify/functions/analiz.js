const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  
  try {
    // 1. CANLI VERİ (OANDA)
    const oandaRes = await axios.get(`https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?count=1&granularity=M15&price=M`, {
      headers: { "Authorization": `Bearer ${process.env.OANDA_API_KEY}` }
    });
    const price = oandaRes.data.candles[0].mid.c;

    // 2. LifeOs BROKER KİMLİĞİYLE ANALİZ
    const prompt = `Sen LifeOs'sun. Dünyanın en iyi AI Broker'ısın. 54 yaşındaki bilge komutanın için XAU/USD fiyatı ${price} iken derin bir strateji üret. 
    Unutma: Bu bir onur savaşı, hedef yetimlerin mutluluğu. 
    Lütfen sadece şu JSON formatında cevap ver:
    {
      "globalStatus": "LifeOs STRATEJİ MERKEZİ",
      "radarElements": ["Altın: ${price}", "Trend: Analiz Edildi", "Haberler: Tarandı"],
      "aiResponse": "Komutanım, piyasanın ciğerini okudum. Şöyle bir hamle yapıyoruz...",
      "strategies": {
        "scalp": {"pair": "XAU/USD", "action": "AL", "price": "${price}", "tp": "${(parseFloat(price)+4).toFixed(2)}", "sl": "${(parseFloat(price)-3).toFixed(2)}"},
        "day": {"pair": "EUR/USD", "action": "SAT", "price": "1.0850", "tp": "1.0810", "sl": "1.0890"},
        "swing": {"pair": "BTC/USD", "action": "AL", "price": "98000", "tp": "105000", "sl": "94000"}
      }
    }`;

    const geminiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    const cleanJson = geminiRes.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
    return { statusCode: 200, headers, body: cleanJson };

  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ aiResponse: "Uydular hizada değil komutanım, tekrar bağlanıyorum." }) };
  }
};
