// Gegner-Gehirn: schätzt die Gewinnchance (viele Probe-Runden im Kopf) und handelt nach Charakter.
import { bewerte } from './bewertung.js';

export const CHARAKTERE = {
  hai:   { locker: .24, aggro: .78, bluff: .08 },   // spielt wenig, aber hart
  fels:  { locker: .14, aggro: .30, bluff: .02 },   // wartet auf Asse
  wild:  { locker: .46, aggro: .70, bluff: .16 },   // erhöht ständig
  fisch: { locker: .52, aggro: .18, bluff: .03 },   // geht fast immer mit
  fuchs: { locker: .30, aggro: .52, bluff: .12 },   // blufft gerne
};

/** Gewinnchance 0..1 gegen n Gegner mit unbekannten Karten (Monte-Carlo). */
export function gewinnChance(meine, board, gegner, sims = 250, z = Math.random) {
  const weg = new Set([...meine, ...board]);
  const rest = [];
  for (let c = 0; c < 52; c++) if (!weg.has(c)) rest.push(c);
  const n = 2 * gegner + 5 - board.length;
  let punkte = 0;
  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(z() * (rest.length - i));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const brett = board.concat(rest.slice(2 * gegner, n));
    const ich = bewerte(meine.concat(brett)).wert;
    let verloren = false, gleich = 0;
    for (let g = 0; g < gegner && !verloren; g++) {
      const w = bewerte([rest[2 * g], rest[2 * g + 1], ...brett]).wert;
      if (w > ich) verloren = true; else if (w === ich) gleich++;
    }
    if (!verloren) punkte += 1 / (1 + gleich);
  }
  return punkte / sims;
}

const runden = (x, schritt) => Math.max(schritt, Math.round(x / schritt) * schritt);

/** Liefert { art, auf } für den Bot auf Platz i. */
export function entscheide(t, i, z = Math.random) {
  const p = t.plaetze[i], c = CHARAKTERE[p.charakter] || CHARAKTERE.fuchs, o = t.optionen(i);
  const gegner = Math.max(1, t.imRennen().length - 1);
  const eq = gewinnChance(p.karten, t.board, gegner, t.board.length ? 260 : 180, z);
  const staerke = eq * (gegner + 1);                 // 1 = Durchschnitt am Tisch
  const pot = t.pot();
  const r = z();
  const preflop = t.board.length === 0;

  const erhoehe = (faktor) => {
    if (!o.kannErhoehen) return o.schieben ? { art: 'check' } : { art: 'call' };
    let auf = t.einsatz + Math.max(t.bb, pot * faktor);
    if (preflop && t.einsatz <= t.bb) auf = t.bb * (2.5 + z() * 1.5);
    auf = runden(auf, t.sb);
    if (eq > .82 && z() < .25) auf = o.maxAuf;       // Monster: manchmal alles
    if (auf > o.maxAuf * .7) auf = o.maxAuf;          // fast alles = alles
    return { art: 'raise', auf: Math.max(o.minAuf, Math.min(o.maxAuf, auf)) };
  };

  // kurzer Stapel: alles oder nichts
  if (p.stack + p.runde <= t.bb * 8 && staerke > 1.25 - c.locker * .4) return { art: 'raise', auf: o.maxAuf };

  if (o.schieben) {
    if (staerke > 1.55 - c.aggro * .45 && r < .35 + c.aggro * .55) return erhoehe(.5 + z() * .5);
    if (r < c.bluff) return erhoehe(.45 + z() * .35);
    return { art: 'check' };
  }

  const zuZahlen = o.zuZahlen;
  if (preflop) {
    let schwelle = 1.2 - c.locker;
    if (zuZahlen > t.bb * 3) schwelle += .35;
    if (zuZahlen > p.stack * .3) schwelle += .55;
    if (staerke > schwelle + .9 - c.aggro * .4 && r < .3 + c.aggro * .6) return erhoehe(.8);
    if (staerke > schwelle) return { art: 'call' };
    if (r < c.bluff * .4) return erhoehe(.8);
    return { art: 'fold' };
  }

  const potOdds = zuZahlen / (pot + zuZahlen);
  if (staerke > 2.1 - c.aggro * .6 && r < .25 + c.aggro * .6) return erhoehe(.6 + z() * .5);
  if (eq > potOdds * (1.2 - c.locker * .7)) return { art: 'call' };
  if (potOdds < .12 && r < .6) return { art: 'call' };
  if (r < c.bluff * .5) return erhoehe(.7);
  return { art: 'fold' };
}
