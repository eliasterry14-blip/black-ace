// Karten: Zahl 0..51  →  Rang = c % 13 (0 = 2 … 12 = Ass), Farbe = c / 13 (0 ♠, 1 ♥, 2 ♦, 3 ♣)
export const RANG = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const FARBE = ['♠', '♥', '♦', '♣'];
const TEXT = '︎';                       // erzwingt Schrift-Zeichen statt Emoji (wichtig fürs iPhone)

export const rang = (c) => c % 13;
export const farbe = (c) => (c / 13) | 0;
export const istRot = (c) => farbe(c) === 1 || farbe(c) === 2;

/** Echter Zufall vom Gerät, nicht Math.random */
export function zufall() {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

/** Gemischtes Deck (Fisher-Yates) */
export function neuesDeck(z = zufall) {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(z() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** HTML einer Karte. Das Aussehen kommt aus dem gewählten Kartenstil (CSS). */
export function karteHTML(c, { klasse = '', zu = false } = {}) {
  if (zu || c == null) return `<div class="karte zu ${klasse}"></div>`;
  const r = RANG[rang(c)], f = FARBE[farbe(c)] + TEXT;
  return `<div class="karte ${istRot(c) ? 'rot' : ''} ${klasse}" data-c="${c}">` +
    `<span class="ecke o"><b>${r}</b><i>${f}</i></span><span class="med">${f}</span>` +
    `<span class="ecke u"><b>${r}</b><i>${f}</i></span></div>`;
}
