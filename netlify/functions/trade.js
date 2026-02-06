exports.handler = async (event, context) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  
  try {
    const { pair, action, sl, tp } = JSON.parse(event.body);
    
    // Altın için minimum 1000 birim (10 Ounce civarı) daha sağlıklı çalışır.
    // Satışsa eksi (-), Alışsa artı (+) değer gider.
    const units = action === "AL" ? "1000" : "-1000"; 
    const oandaSymbol = pair.replace("/", "_"); 

    await sendTelegram(`⚠️ OPERASYON BAŞLADI!\nParite: ${pair}\nMiktar: 1000 Birim\nYön: ${action}`);

    const orderBody = {
      order: {
        units: units,
        instrument: oandaSymbol,
        timeInForce: "FOK", // Fill Or Kill: Ya hemen aç ya da iptal et
        type: "MARKET",
        positionFill: "DEFAULT",
        takeProfitOnFill: { price: tp.toString() },
        stopLossOnFill: { price: sl.toString() }
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

    let message = "";
    if (oandaData.orderFillTransaction) {
      message = `✅ İŞLEM AÇILDI!\n\n${pair} @ ${oandaData.orderFillTransaction.price}\nHedef: ${tp}\nStop: ${sl}\n\nPiyami nöbette, komutanım!`;
    } else {
      // Hata detayını Telegram'a at ki sorunu görelim
      message = `❌ HATA ALINDI!\nOANDA Yanıtı: ${oandaData.errorMessage || "Bilinmeyen Hata"}`;
    }

    await sendTelegram(message);
    return { statusCode: 200, headers, body: JSON.stringify({ msg: message }) };

  } catch (e) {
    await sendTelegram(`🚨 SİSTEM HATASI: ${e.message}`);
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
