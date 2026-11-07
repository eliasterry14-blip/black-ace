// Bewertet 5–7 Karten: beste Fünfer-Hand als eine Zahl. Größer = besser.
export const NAMEN = ['Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];

const pack = (kat, rs) => {
  let w = kat;
  for (let i = 0; i < 5; i++) w = w * 13 + (rs[i] ?? 0);
  return w;
};

/** Höchste Karte einer Straße in diesen Rängen, sonst -1. Ass zählt auch als 1 (A-2-3-4-5). */
function strasse(raenge) {
  const hat = new Array(13).fill(false);
  for (const r of raenge) hat[r] = true;
  for (let hoch = 12; hoch >= 3; hoch--) {
    let ok = true;
    for (let k = 0; k < 5 && ok; k++) {
      const x = hoch - k;
      ok = hat[x < 0 ? 12 : x];
    }
    if (ok) return hoch;
  }
  return -1;
}

export function bewerte(karten) {
  const anz = new Array(13).fill(0);
  const proFarbe = [[], [], [], []];
  for (const c of karten) {
    anz[c % 13]++;
    proFarbe[(c / 13) | 0].push(c % 13);
  }
  // Straight Flush / Flush
  let flush = null;
  for (const fs of proFarbe) {
    if (fs.length >= 5) {
      const sf = strasse(fs);
      if (sf >= 0) return ergebnis(8, [sf]);
      flush = [...fs].sort((a, b) => b - a).slice(0, 5);
    }
  }
  const absteigend = [];
  for (let r = 12; r >= 0; r--) if (anz[r]) absteigend.push(r);
  const mit = (n) => absteigend.filter((r) => anz[r] >= n);
  const ohne = (...weg) => absteigend.filter((r) => !weg.includes(r));

  const vier = mit(4);
  if (vier.length) return ergebnis(7, [vier[0], ohne(vier[0])[0]]);
  const drei = mit(3);
  if (drei.length) {
    const paar = absteigend.filter((r) => r !== drei[0] && anz[r] >= 2);
    if (paar.length) return ergebnis(6, [drei[0], paar[0]]);
  }
  if (flush) return ergebnis(5, flush);
  const st = strasse(absteigend);
  if (st >= 0) return ergebnis(4, [st]);
  if (drei.length) return ergebnis(3, [drei[0], ...ohne(drei[0]).slice(0, 2)]);
  const paare = mit(2);
  if (paare.length >= 2) return ergebnis(2, [paare[0], paare[1], ohne(paare[0], paare[1])[0]]);
  if (paare.length === 1) return ergebnis(1, [paare[0], ...ohne(paare[0]).slice(0, 3)]);
  return ergebnis(0, absteigend.slice(0, 5));
}

const ergebnis = (kat, rs) => ({ wert: pack(kat, rs), kat, name: NAMEN[kat] });
