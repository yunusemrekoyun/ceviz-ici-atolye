// Ödeme ekranına geçişte stok bu tarayıcının siparişine ayrılır. Müşteri sepete veya
// ödeme adımına dönerse ayrım sürer (başka sekmede ödeme formu açık olabilir); sunucu bu
// oturumun ayırdığı adetleri sepette ona mevcut sayar (heldBy) ve yeniden ödeme
// başlatılınca eski oturumu kapatır (previousConversationId). Kimlik yalnız bu
// tarayıcıda tutulur.
const KEY = "oldsocks.checkoutSession";

export function rememberCheckout(conversationId) {
  try {
    if (conversationId) localStorage.setItem(KEY, conversationId);
  } catch {
    // Depolama kapalıysa ayrım süre dolunca kendiliğinden biter.
  }
}

export function previousCheckout() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

// Yalnız belirtilen oturum hâlâ kayıtlıysa siler; arada başlatılan yeni oturum korunur.
export function forgetCheckout(conversationId) {
  try {
    if (localStorage.getItem(KEY) === conversationId) localStorage.removeItem(KEY);
  } catch {
    // yok say
  }
}

// Çıkış yapılınca: aynı tarayıcıyı kullanan sonraki kişi önceki hesabın oturumunu devralmasın.
export function clearCheckout() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // yok say
  }
}
