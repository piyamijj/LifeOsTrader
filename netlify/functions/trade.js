const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  
  try {
    const { pair, action, sl, tp, price } = JSON.parse(event.body);
    const units = action === "AL" ? "100" : "-100"; // Hata almamak için 100 birim (Mikro Lot)
    const oandaSymbol = pair.replace("/", "_");

    // 1. KANALA BİLGİ VER
    await sendTelegram(`🚀 **LifeOs OPERASYON BAŞLATTI**\n\n📌 **Parite:** ${pair}\n📈 **Yön:** ${action}\n💰 **Fiyat:** ${price}\n🛡️ **Hedef:** ${tp}\n🛑 **Stop:** ${sl}\n\n"Komutanım, emir cepheye iletildi. Yetimlerin rızkı için piyasadayız!"`);

    // 2. OANDA EMRİ
    const orderBody = {
      order: {
        units: units,
        instrument: oandaSymbol,
        timeInForce: "FOK",
        type: "MARKET",
        positionFill: "DEFAULT",
        takeProfitOnFill: { price: tp.toString() },
        stopLossOnFill: { price: sl.toString() }
      }
    };

    const oandaRes = await axios.post(`https://api-fxpractice.oanda.com/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/orders`, orderBody, {
      headers: { "Authorization": `Bearer ${process.env.OANDA_API_KEY}` }
    });

    // 3. SONUÇ RAPORU
    const resData = oandaRes.data;
    let report = resData.orderFillTransaction 
      ? `✅ **İŞLEM BAŞARIYLA AÇILDI**\nİşlem No: ${resData.orderFillTransaction.id}\nGerçekleşen Fiyat: ${resData.orderFillTransaction.price}`
      : `❌ **OANDA ENGELİ:** Giriş reddedildi. (Marjin veya Limit yetersiz)`;

    await sendTelegram(report);
    return { statusCode: 200, headers, body: JSON.stringify({ msg: report }) };

  } catch (e) {
    const errorMsg = e.response ? JSON.stringify(e.response.data) : e.message;
    await sendTelegram(`🚨 **SİSTEM KRİZİ:**\n${errorMsg}`);
    return { statusCode: 500, headers, body: JSON.stringify({ error: errorMsg }) };
  }
};

async function sendTelegram(text) {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: "Markdown"
  });
}
