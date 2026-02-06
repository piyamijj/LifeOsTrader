exports.handler = async (event, context) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  
  try {
    const { pair, action, sl, tp } = JSON.parse(event.body);
    const units = action === "AL" ? "1" : "-1"; // Demo için 1000 birim (Test)
    const oandaSymbol = pair.replace("/", "_"); // XAU/USD -> XAU_USD

    // 1. TELEGRAM'A "EMİR ALINDI" MESAJI AT
    await sendTelegram(`⚠️ KOMUTANIM! Emir Alındı: ${pair} - ${action}\nİşlem başlatılıyor...`);

    // 2. OANDA DEMO HESABINA EMRİ GİR
    const orderBody = {
      order: {
        units: units,
        instrument: oandaSymbol,
        timeInForce: "FOK",
        type: "MARKET",
        positionFill: "DEFAULT",
        takeProfitOnFill: { price: tp },
        stopLossOnFill: { price: sl }
      }
    };

    const oandaRes = await fetch(`https://api-fxpractice.oanda.com/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OANDA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderBody)
    });

    const oandaData = await oandaRes.json();

    // 3. SONUCU TELEGRAM'A RAPORLA
    let message = "";
    if (oandaData.orderFillTransaction) {
      const price = oandaData.orderFillTransaction.price;
      message = `✅ BAŞARILI!\n\nİşlem: ${pair}\nYön: ${action}\nGiriş Fiyatı: ${price}\nHedef (TP): ${tp}\nStop (SL): ${sl}\n\nCephedeyim Komutanım!`;
    } else if (oandaData.orderCancelTransaction) {
      message = `❌ İŞLEM İPTAL OLDU!\nSebep: ${oandaData.orderCancelTransaction.reason}`;
    } else {
      message = `⚠️ OANDA Durumu: ${JSON.stringify(oandaData)}`;
    }

    await sendTelegram(message);
    
    return { statusCode: 200, headers, body: JSON.stringify({ status: "Tamam", msg: message }) };

  } catch (e) {
    await sendTelegram(`🚨 HATA OLUŞTU: ${e.message}`);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}
