// Die Regeln am Tisch (Texas Hold'em, 5 Plätze). Reine Logik ohne Bildschirm – darum testbar.
import { neuesDeck, zufall as geraeteZufall } from './karten.js';
import { bewerte } from './bewertung.js';

const PLAETZE = 5;
const FOLGE = { preflop: 'flop', flop: 'turn', turn: 'river' };

export class Tisch {
  constructor({ sb, bb, zufall = geraeteZufall }) {
    this.sb = sb; this.bb = bb; this.zufall = zufall;
    this.plaetze = Array(PLAETZE).fill(null);
    this.dealer = -1; this.amZug = -1; this.phase = 'warten';
    this.board = []; this.ergebnis = null; this.handNr = 0;
  }

  setze(i, spieler) { this.plaetze[i] = { ...spieler, karten: [], gefoldet: true, imSpiel: false, allin: false, runde: 0, gesamt: 0, letzte: null }; }
  entferne(i) { this.plaetze[i] = null; }

  naechster(von, bed) {
    for (let k = 1; k <= PLAETZE; k++) {
      const i = (((von + k) % PLAETZE) + PLAETZE) % PLAETZE;
      if (bed(i)) return i;
    }
    return -1;
  }
  kannHandeln = (i) => { const p = this.plaetze[i]; return !!p && p.imSpiel && !p.gefoldet && !p.allin; };
  imRennen() { return this.plaetze.map((p, i) => (p && p.imSpiel && !p.gefoldet ? i : -1)).filter((i) => i >= 0); }
  pot() { return this.plaetze.reduce((s, p) => s + (p ? p.gesamt : 0), 0); }

  zahle(i, betrag) {
    const p = this.plaetze[i];
    const b = Math.max(0, Math.min(betrag, p.stack));
    p.stack -= b; p.runde += b; p.gesamt += b;
    if (p.stack === 0) p.allin = true;
    return b;
  }

  /** Startet eine neue Hand. false, wenn weniger als 2 Spieler Geld haben. */
  neueHand() {
    const mitGeld = (i) => !!this.plaetze[i] && this.plaetze[i].stack > 0;
    const dabei = [0, 1, 2, 3, 4].filter(mitGeld);
    if (dabei.length < 2) return false;
    this.dealer = this.dealer < 0 ? dabei[Math.floor(this.zufall() * dabei.length)] : this.naechster(this.dealer, mitGeld);
    this.plaetze.forEach((p, i) => {
      if (!p) return;
      Object.assign(p, { karten: [], gefoldet: !mitGeld(i), imSpiel: mitGeld(i), allin: false, runde: 0, gesamt: 0, gehandelt: false, nurMitgehen: false, letzte: null });
    });
    this.deck = neuesDeck(this.zufall);
    this.board = []; this.phase = 'preflop'; this.ergebnis = null; this.handNr++;
    this.minRaise = this.bb;
    const headsUp = dabei.length === 2;
    this.sbI = headsUp ? this.dealer : this.naechster(this.dealer, mitGeld);
    this.bbI = this.naechster(this.sbI, mitGeld);
    this.zahle(this.sbI, this.sb); this.plaetze[this.sbI].letzte = { art: 'sb', betrag: this.plaetze[this.sbI].runde };
    this.zahle(this.bbI, this.bb); this.plaetze[this.bbI].letzte = { art: 'bb', betrag: this.plaetze[this.bbI].runde };
    this.einsatz = this.bb;
    for (let r = 0; r < 2; r++) {
      let i = this.dealer;
      for (let n = 0; n < dabei.length; n++) { i = this.naechster(i, mitGeld); this.plaetze[i].karten.push(this.deck.pop()); }
    }
    this.amZug = this.bbI;
    this.weiter();
    return true;
  }

  /** Was darf Spieler i gerade? Beträge bei „Erhöhen“ sind der GESAMT-Einsatz dieser Runde („auf X“). */
  optionen(i) {
    const p = this.plaetze[i];
    const zuZahlen = Math.max(0, this.einsatz - p.runde);
    const maxAuf = p.runde + p.stack;
    const andere = this.imRennen().some((j) => j !== i && !this.plaetze[j].allin);
    const kannErhoehen = !p.nurMitgehen && andere && maxAuf > this.einsatz;
    return {
      zuZahlen: Math.min(zuZahlen, p.stack),
      schieben: zuZahlen === 0,
      kannErhoehen,
      minAuf: Math.min(this.einsatz + this.minRaise, maxAuf),
      maxAuf,
    };
  }

  /** Aktion von Spieler i: 'fold' | 'check' | 'call' | 'raise' (auf = Gesamt-Einsatz). */
  handle(i, art, auf = 0) {
    if (i !== this.amZug) throw new Error(`Spieler ${i} ist nicht dran (dran: ${this.amZug})`);
    const p = this.plaetze[i], o = this.optionen(i);
    if (art === 'fold') {
      p.gefoldet = true; p.letzte = { art: 'fold' };
    } else if (art === 'check') {
      if (!o.schieben) throw new Error('Schieben geht nicht, es liegt ein Einsatz');
      p.letzte = { art: 'check' };
    } else if (art === 'call') {
      if (o.schieben) return this.handle(i, 'check');
      this.zahle(i, o.zuZahlen);
      p.letzte = { art: p.allin ? 'allin' : 'call', betrag: p.runde };
    } else if (art === 'raise') {
      if (!o.kannErhoehen) return this.handle(i, o.schieben ? 'check' : 'call');
      auf = Math.max(o.minAuf, Math.min(o.maxAuf, Math.round(auf)));
      const erhoehung = auf - this.einsatz;
      this.zahle(i, auf - p.runde);
      const voll = erhoehung >= this.minRaise;
      this.plaetze.forEach((q, j) => {
        if (!q || j === i || !this.kannHandeln(j)) return;
        if (voll) { q.gehandelt = false; q.nurMitgehen = false; } else if (q.gehandelt) { q.gehandelt = false; q.nurMitgehen = true; }
      });
      if (voll) this.minRaise = erhoehung;
      this.einsatz = auf;
      p.letzte = { art: p.allin ? 'allin' : 'raise', betrag: auf };
    } else throw new Error('Unbekannte Aktion ' + art);
    p.gehandelt = true; p.nurMitgehen = false;
    return this.weiter();
  }

  weiter() {
    const rennen = this.imRennen();
    if (rennen.length === 1) return this.alleRaus(rennen[0]);
    const offen = (j) => this.kannHandeln(j) && (!this.plaetze[j].gehandelt || this.plaetze[j].runde < this.einsatz);
    const n = this.naechster(this.amZug, offen);
    if (n >= 0) { this.amZug = n; return 'zug'; }
    return this.naechsteStrasse();
  }

  /** Nächste Straße austeilen. Liefert 'auslaufen', wenn niemand mehr setzen kann – dann ruft der Bildschirm sie erneut auf. */
  naechsteStrasse() {
    this.plaetze.forEach((p) => { if (p) { p.runde = 0; p.gehandelt = false; p.nurMitgehen = false; } });
    this.einsatz = 0; this.minRaise = this.bb;
    if (this.phase === 'river') return this.showdown();
    this.phase = FOLGE[this.phase];
    this.deck.pop();                                   // Brennkarte
    const n = this.phase === 'flop' ? 3 : 1;
    for (let k = 0; k < n; k++) this.board.push(this.deck.pop());
    const handelnde = this.imRennen().filter((j) => !this.plaetze[j].allin).length;
    if (handelnde <= 1) { this.amZug = -1; return 'auslaufen'; }
    this.amZug = this.naechster(this.dealer, this.kannHandeln);
    return 'strasse';
  }

  /** Alle Töpfe (Haupt- und Nebentöpfe) aus den Einsätzen der Hand. */
  toepfe() {
    const rest = this.plaetze.map((p) => (p ? p.gesamt : 0));
    const liste = [];
    while (rest.some((x) => x > 0)) {
      const lebend = this.imRennen().filter((i) => rest[i] > 0);
      if (!lebend.length) {
        const summe = rest.reduce((a, b) => a + b, 0);
        if (liste.length) liste[liste.length - 1].betrag += summe; else liste.push({ betrag: summe, berechtigt: this.imRennen() });
        break;
      }
      const stufe = Math.min(...lebend.map((i) => rest[i]));
      let betrag = 0;
      rest.forEach((x, i) => { const t = Math.min(x, stufe); betrag += t; rest[i] -= t; });
      const letzter = liste[liste.length - 1];
      if (letzter && letzter.berechtigt.join() === lebend.join()) letzter.betrag += betrag;
      else liste.push({ betrag, berechtigt: lebend });
    }
    return liste;
  }

  showdown() {
    this.phase = 'ende'; this.amZug = -1;
    const wertung = {};
    for (const i of this.imRennen()) wertung[i] = bewerte([...this.plaetze[i].karten, ...this.board]);
    const gewinn = {};
    const toepfe = this.toepfe();
    for (const t of toepfe) {
      const best = Math.max(...t.berechtigt.map((i) => wertung[i].wert));
      const sieger = t.berechtigt.filter((i) => wertung[i].wert === best);
      sieger.sort((a, b) => ((a - this.dealer + 4) % 5) - ((b - this.dealer + 4) % 5)); // links vom Dealer zuerst
      const teil = Math.floor(t.betrag / sieger.length);
      let rest = t.betrag - teil * sieger.length;
      for (const i of sieger) { gewinn[i] = (gewinn[i] || 0) + teil + (rest > 0 ? 1 : 0); if (rest > 0) rest--; }
    }
    for (const [i, b] of Object.entries(gewinn)) this.plaetze[i].stack += b;
    this.ergebnis = {
      zeigen: true, wertung, toepfe,
      gewinner: Object.entries(gewinn).map(([i, betrag]) => ({ i: +i, betrag, hand: wertung[i].name, kat: wertung[i].kat })),
    };
    return 'ende';
  }

  alleRaus(sieger) {
    const summe = this.pot();
    this.plaetze[sieger].stack += summe;
    this.phase = 'ende'; this.amZug = -1;
    this.ergebnis = { zeigen: false, gewinner: [{ i: sieger, betrag: summe }], toepfe: [{ betrag: summe, berechtigt: [sieger] }] };
    return 'ende';
  }
}
