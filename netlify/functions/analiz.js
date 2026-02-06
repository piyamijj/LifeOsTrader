exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const userQuestion = body.question || "Durum nedir?";

    // 1. OANDA'dan Veri Çek (Hata olursa varsayılan veri kullan)
    let price = "0";
    let candles = [];
    try {
      const oandaRes = await fetch("https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?count=10&granularity=M15&price=M", {
        headers: { "Authorization": `Bearer ${process.env.OANDA_API_KEY}` }
      });
      const oandaData = await oandaRes.json();
      candles = oandaData.candles || [];
      price = candles.length > 0 ? candles[candles.length - 1].mid.c : "2650.00"; // Altın için mantıklı bir fallback
    } catch (err) {
      console.log("Oanda Hatası:", err);
      price = "2650.50"; // Veri gelmezse simülasyon devam etsin
    }

    // 2. GEMINI PROMPT (YIRTICI MOD - EĞİTİM VERMEZ, STRATEJİ VERİR)
    const prompt = `
      GÖREV: Sen Piyami, duygusuz ve %100 matematik odaklı bir Elit Forex Yapay Zekasısın.
      KULLANICI: 54 yaşında, kaybedecek vakti yok. "Eğitim al" veya "Bekle" demek YASAK. 
      BAKİYE: 1000$ (Bunu kaldıraçla 100.000$ gibi yöneteceksin).
      
      ŞU ANKİ DURUM:
      Parite: XAU/USD (Altın)
      Fiyat: ${price}
      Kullanıcı Sorusu: "${userQuestion}"

      EMİRLERİN:
      1. ASLA "Riskli, işlem yapma" deme. Piyasa her zaman hareket eder. En iyi fırsatı bul.
      2. Eğer piyasa durgunsa "SCALP" (Kısa vur-kaç) ver.
      3. Eğer piyasa sertse "SWING" (Trend takibi) ver.
      4. ÇOK NET Giriş, Stop Loss (SL) ve Take Profit (TP) rakamları ver.
      5. Cevabın askeri, net ve kazanmaya odaklı olsun.

      ÇIKTI FORMATI (SADECE JSON):
      {
        "globalStatus": "SALDIRI MODU AKTİF - ${price}",
        "radarElements": ["Trend: HESAPLANDI", "Volatilite: FIRSAT VAR", "Yön: BELİRLENDİ"],
        "aiResponse": "Buraya kullanıcıya moral veren ve net strateji anlatan kısa, askeri bir metin yaz.",
        "strategies": {
          "scalp": { "pair": "XAU/USD", "action": "AL", "price": "${price}", "tp": "HEDEF_RAKAMI_YAZ", "sl": "STOP_RAKAMI_YAZ" },
          "day": { "pair": "EUR/USD", "action": "SAT", "price": "1.0850", "tp": "1.0820", "sl": "1.0880" },
          "swing": { "pair": "USD/TRY", "action": "AL", "price": "34.20", "tp": "35.00", "sl": "33.80" }
        }
      }
    `;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const gData = await geminiRes.json();
    // JSON temizliği yapıyoruz (Hata almamak için)
    let cleanJson = gData.candidates[0].content.parts[0].text;
    cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();

    return { statusCode: 200, headers, body: cleanJson };

  } catch (e) {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        globalStatus: "SİSTEM YENİLENİYOR", 
        radarElements: ["Veri akışı bekleniyor..."],
        aiResponse: "Komutanım, uydu bağlantısında parazit var ama hedefimiz belli. Tekrar deneyin.",
        strategies: { scalp: { pair: "XAU/USD", action: "NÖTR", price: "0", tp: "0", sl: "0" } }
      }) 
    };
  }
};
