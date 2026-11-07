// Der Tisch auf dem Bildschirm: zeichnen, Bots handeln lassen, deine Knöpfe, Wischen zum Aussteigen.
import { Tisch } from './tisch.js';
import { entscheide, CHARAKTERE } from './bot.js';
import { karteHTML } from './karten.js';
import { stand, speichern, BOT_NAMEN, ORTE, euro, kurz, freischalten } from './daten.js';
import { $, zeige, warte, avatarHTML, meldung } from './ansicht.js';
import { ton } from './ton.js';

const TEXT = { fold: () => 'Ausgestiegen', check: () => 'Schiebt', call: (b) => `Mitgegangen ${kurz(b)}`, raise: (b) => `Erhöht auf ${kurz(b)}`, allin: () => 'All in', sb: (b) => `SB ${kurz(b)}`, bb: (b) => `BB ${kurz(b)}` };

export class TischUI {
  constructor({ beimVerlassen }) {
    this.beimVerlassen = beimVerlassen;
    this.laeuft = false;
    $('t-gehen').addEventListener('click', () => this.gehenGedrueckt());
    $('t-check').addEventListener('click', () => this.ich('check'));
    $('t-call').addEventListener('click', () => this.ich('call'));
    $('t-raise').addEventListener('click', () => this.ich('raise', +$('t-regler').value));
    $('t-regler').addEventListener('input', () => this.reglerZeigen());
    $('t-schnell').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) this.schnell(b.dataset.s); });
    $('r-regler').addEventListener('input', (e) => { $('r-betrag').textContent = euro(+e.target.value); farbe(e.target); });
    $('r-los').addEventListener('click', () => this.nachkaufen(+$('r-regler').value));
    $('r-weg').addEventListener('click', () => { this.blatt(false); this.verlassen(); });
    this.wischen();
  }

  /* ---------- Hinsetzen ---------- */
  start(ort, einsatz) {
    this.ort = ort;
    this.t = new Tisch({ sb: ort.sb, bb: ort.bb });
    stand.kapital -= einsatz; stand.amTisch = einsatz; speichern();
    this.t.setze(0, { name: stand.name, stack: einsatz, mensch: true });
    for (let i = 1; i < 5; i++) this.neuerBot(i);
    this.gehen = false; this.laeuft = true; this.boardGezeigt = 0; this.handGezeigt = false;
    $('t-gehen').classList.remove('an');
    $('t-name').textContent = ort.name;
    $('t-blinds').textContent = `Blinds ${kurz(ort.sb)} / ${kurz(ort.bb)}`;
    zeige('v-tisch');
    this.zeichnen();
    setTimeout(() => this.naechsteHand(), 600);
  }

  neuerBot(i) {
    const vergeben = this.t.plaetze.filter(Boolean).map((p) => p.name);
    const frei = BOT_NAMEN.filter((n) => !vergeben.includes(n));
    const name = frei[Math.floor(Math.random() * frei.length)];
    const typen = Object.keys(CHARAKTERE);
    const o = this.ort;
    const stack = Math.round((o.min + Math.random() * (o.max * 1.4 - o.min)) / o.sb) * o.sb;
    this.t.setze(i, { name, stack, charakter: typen[Math.floor(Math.random() * typen.length)], bot: true });
  }

  /* ---------- Ablauf einer Hand ---------- */
  async naechsteHand() {
    if (!this.laeuft) return;
    for (let i = 1; i < 5; i++) if (!this.t.plaetze[i] || this.t.plaetze[i].stack <= 0 || Math.random() < .03) this.neuerBot(i);
    const ich = this.t.plaetze[0];
    if (this.gehen) return this.verlassen();
    if (ich.stack <= 0) return this.pleiteAmTisch();
    this.boardGezeigt = 0; this.handGezeigt = false;
    this.t.neueHand();
    stand.statistik.haende++;
    this.zeichnen();
    for (let k = 0; k < 4; k++) setTimeout(() => ton('karte'), k * 110);
    const t = this.t;
    await warte(700);
    if (t === this.t && this.laeuft) this.ablauf();
  }

  async ablauf() {
    const t = this.t;
    while (this.laeuft) {
      if (t.phase === 'ende') return this.handEnde();
      if (t.amZug < 0) {
        await warte(800); if (t !== this.t || !this.laeuft) return;
        const v = this.vorher(); t.naechsteStrasse(); await this.nachAktion(v); continue;
      }
      if (t.amZug === 0) {
        if (this.gehen) { this.ich('fold'); return; }
        this.zeichnen(); return;                         // warten auf dich
      }
      this.zeichnen();
      await warte(450 + Math.random() * 550);
      if (t !== this.t || !this.laeuft) return;
      if (t.amZug <= 0) continue;
      const i = t.amZug, e = entscheide(t, i), v = this.vorher();
      t.handle(i, e.art, e.auf);
      this.aktionTon(t.plaetze[i].letzte?.art);
      await this.nachAktion(v);
    }
  }

  async ich(art, auf) {
    const t = this.t;
    if (!this.laeuft || t.amZug !== 0) return;
    const v = this.vorher();
    t.handle(0, art, auf);
    this.aktionTon(t.plaetze[0].letzte?.art);
    if (art === 'fold') this.handWeg();
    await this.nachAktion(v);
    this.ablauf();
  }

  vorher() { return { board: this.t.board.length, phase: this.t.phase, einsaetze: this.t.plaetze.map((p) => (p ? p.runde : 0)) }; }

  /** Nach jeder Aktion: neue Straße? → Einsätze fliegen in den Pot, Sprechblasen leeren. */
  async nachAktion(v) {
    const t = this.t;
    const strasse = t.board.length !== v.board || t.phase === 'ende';
    if (strasse && v.einsaetze.some((x) => x > 0)) {
      this.zeichnen(v.einsaetze);
      await this.einsammeln();
    }
    if (strasse && t.phase !== 'ende') t.plaetze.forEach((p) => { if (p && p.letzte && p.letzte.art !== 'fold' && p.letzte.art !== 'allin') p.letzte = null; });
    this.zeichnen();
    if (t.board.length > v.board) ton('karte');
  }

  async einsammeln() {
    const ziel = $('t-pot').getBoundingClientRect(), basis = $('v-tisch').getBoundingClientRect();
    const flieger = [];
    document.querySelectorAll('#t-sitze .einsatz').forEach((e) => {
      const r = e.getBoundingClientRect();
      const f = e.cloneNode(true);
      f.className = 'einsatz flug'; f.style.left = r.left - basis.left + 'px'; f.style.top = r.top - basis.top + 'px'; f.style.translate = 'none';
      $('v-tisch').appendChild(f); e.style.opacity = 0;
      f.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${ziel.left + ziel.width / 2 - r.left - r.width / 2}px, ${ziel.top + ziel.height / 2 - r.top - r.height / 2}px)`, opacity: .2 }], { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      flieger.push(f);
    });
    if (flieger.length) ton('chips');
    await warte(440);
    flieger.forEach((f) => f.remove());
  }

  async handEnde() {
    const t = this.t, erg = t.ergebnis;
    this.zeichnen();
    await warte(erg.zeigen ? 500 : 250);
    // Pot fliegt zum Gewinner
    const basis = $('v-tisch').getBoundingClientRect(), pot = $('t-pot').getBoundingClientRect();
    for (const g of erg.gewinner) {
      const sitz = document.querySelector(`#t-sitze .sitz.s${g.i} .av`); if (!sitz) continue;
      const z = sitz.getBoundingClientRect();
      const f = document.createElement('div');
      f.className = 'einsatz flug'; f.innerHTML = `<span class="chip"></span>${kurz(g.betrag)}`;
      f.style.left = pot.left - basis.left + pot.width / 2 - 20 + 'px'; f.style.top = pot.top - basis.top + 'px';
      $('v-tisch').appendChild(f);
      f.animate([{ transform: 'none' }, { transform: `translate(${z.left - pot.left - pot.width / 2 + 40}px, ${z.top - pot.top}px)`, opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      setTimeout(() => f.remove(), 700);
      const plus = document.createElement('div');
      plus.className = 'plus'; plus.textContent = '+' + euro(g.betrag);
      plus.style.left = z.left - basis.left + z.width / 2 + 'px'; plus.style.top = z.top - basis.top - 22 + 'px';
      setTimeout(() => $('v-tisch').appendChild(plus), 500); setTimeout(() => plus.remove(), 2400);
    }
    $('t-pot').classList.add('leer');
    const ichGewinne = erg.gewinner.find((g) => g.i === 0);
    ton(ichGewinne ? 'gewinn' : 'chips');
    // Statistik + Speichern
    const s = stand.statistik;
    if (ichGewinne) { s.gewonnen++; s.groessterPot = Math.max(s.groessterPot, ichGewinne.betrag); }
    if (erg.zeigen && erg.wertung[0]) s.besteHand = Math.max(s.besteHand, erg.wertung[0].kat);
    stand.amTisch = t.plaetze[0].stack;
    if (freischalten()) setTimeout(() => meldung(`${ORTE[stand.stufe].name} freigeschaltet`), 900);
    speichern();
    this.sieger = erg.gewinner.map((g) => g.i);
    this.zeichnen();
    await warte(erg.zeigen ? 2900 : 1800);
    if (t !== this.t) return;
    this.sieger = [];
    if (this.laeuft) this.naechsteHand();
  }

  /* ---------- Gehen, Nachkaufen ---------- */
  gehenGedrueckt() {
    const t = this.t, ich = t.plaetze[0];
    ton('klick');
    if (t.phase === 'ende' || t.phase === 'warten' || ich.gefoldet || !ich.imSpiel) return this.verlassen();
    this.gehen = !this.gehen;
    $('t-gehen').classList.toggle('an', this.gehen);
    if (this.gehen && t.amZug === 0) this.ich('fold');
  }

  verlassen() {
    if (!this.laeuft) return;
    this.laeuft = false;
    stand.kapital += this.t.plaetze[0].stack; stand.amTisch = 0;
    speichern();
    this.blatt(false);
    this.beimVerlassen();
  }

  pleiteAmTisch() {
    if (stand.kapital < this.ort.min) return this.verlassen();
    const r = $('r-regler'), max = Math.min(this.ort.max, stand.kapital);
    r.min = this.ort.min; r.max = max; r.step = this.ort.sb; r.value = Math.min(max, Math.round((this.ort.min + this.ort.max) / 2 / this.ort.sb) * this.ort.sb);
    $('r-min').textContent = euro(this.ort.min); $('r-max').textContent = euro(max); $('r-betrag').textContent = euro(+r.value); farbe(r);
    this.blatt(true);
  }
  nachkaufen(betrag) {
    stand.kapital -= betrag; this.t.plaetze[0].stack = betrag; stand.amTisch = betrag; speichern();
    ton('chips'); this.blatt(false);
    setTimeout(() => this.naechsteHand(), 400);
  }
  blatt(an) { $('t-blatt').classList.toggle('an', an); $('t-schleier').classList.toggle('an', an); }

  /* ---------- Deine Knöpfe ---------- */
  schnell(art) {
    const t = this.t, o = t.optionen(0), pot = t.pot();
    const werte = { min: o.minAuf, halb: t.einsatz + pot / 2, pot: t.einsatz + pot, allin: o.maxAuf };
    const r = $('t-regler');
    r.value = Math.max(o.minAuf, Math.min(o.maxAuf, Math.round(werte[art] / t.sb) * t.sb));
    if (art === 'allin') r.value = o.maxAuf;
    ton('klick'); this.reglerZeigen(art);
  }
  reglerZeigen(aktiv) {
    const r = $('t-regler'), o = this.t.optionen(0), w = +r.value;
    farbe(r);
    $('t-raise').querySelector('small').textContent = w >= o.maxAuf ? 'All in' : 'auf ' + kurz(w);
    $('t-schnell').querySelectorAll('button').forEach((b) => b.classList.toggle('an', b.dataset.s === aktiv));
  }
  aktionTon(art) { ton(art === 'fold' ? 'fold' : art === 'check' ? 'check' : 'chips'); }

  /* ---------- Wischen nach oben = Aussteigen ---------- */
  wischen() {
    const h = $('t-hand');
    let start = null, dy = 0;
    h.addEventListener('pointerdown', (e) => {
      if (!this.laeuft || this.t.amZug !== 0) return;
      start = e.clientY; dy = 0; h.classList.remove('zurueck'); h.setPointerCapture(e.pointerId);
    });
    h.addEventListener('pointermove', (e) => {
      if (start == null) return;
      dy = Math.min(0, e.clientY - start);
      h.style.transform = `translateY(${dy}px) rotate(${dy / 40}deg)`;
    });
    const los = () => {
      if (start == null) return;
      start = null;
      if (dy < -80 && this.t.amZug === 0) { this.ich('fold'); return; }
      h.classList.add('zurueck'); h.style.transform = '';
    };
    h.addEventListener('pointerup', los); h.addEventListener('pointercancel', los);
  }
  handWeg() {
    const h = $('t-hand');
    h.classList.add('weg');
    setTimeout(() => { h.classList.remove('weg'); h.style.transform = ''; this.zeichnen(); }, 380);
  }

  /* ---------- Zeichnen ---------- */
  zeichnen(einsaetzeVorher) {
    const t = this.t, e = stand.einstellungen;
    const stil = `s-${e.karten}`, ruecken = `r-${e.ruecken}`;
    const k = (c, extra = '') => karteHTML(c, { klasse: `${stil} ${ruecken} ${extra}` });
    const zu = (extra = '') => karteHTML(null, { zu: true, klasse: `${ruecken} ${extra}` });
    $('t-tisch').className = `tisch t-${e.tisch}`;
    const ich = t.plaetze[0];
    $('t-stack').textContent = euro(ich.stack);
    const erg = t.phase === 'ende' ? t.ergebnis : null;
    const sieger = this.sieger || [];

    // Sitze
    let html = '';
    for (let i = 0; i < 5; i++) {
      const p = t.plaetze[i];
      if (!p) continue;
      const marken = (t.dealer === i ? '<span class="marke d">D</span>' : '') + (t.phase !== 'warten' && t.sbI === i && t.sbI !== t.dealer ? '<span class="marke sb">SB</span>' : '') + (t.phase !== 'warten' && t.bbI === i ? '<span class="marke bb">BB</span>' : '');
      const gewinn = erg?.gewinner.find((g) => g.i === i);
      let aktion = p.letzte ? TEXT[p.letzte.art](p.letzte.betrag) : '';
      let aktionKlasse = p.letzte && (p.letzte.art === 'raise' || p.letzte.art === 'allin') ? 'hoch' : '';
      if (gewinn && sieger.includes(i)) { aktion = gewinn.hand || 'Gewinnt'; aktionKlasse = 'sieg'; }
      const zeigen = erg?.zeigen && p.imSpiel && !p.gefoldet && i !== 0;
      const karten = i === 0 ? '' : `<div class="karten ${zeigen ? 'offen' : ''}">${p.imSpiel && !p.gefoldet ? (zeigen ? p.karten.map((c) => k(c)).join('') : zu() + zu()) : ''}</div>`;
      const klassen = ['sitz', 's' + i, t.amZug === i ? 'dran' : '', p.imSpiel && p.gefoldet ? 'raus' : '', sieger.includes(i) ? 'sieg' : ''].join(' ');
      const av = avatarHTML(p.mensch ? { mensch: true } : p).replace('</div>', marken + '</div>');
      html += i === 0
        ? `<div class="${klassen}">${av}<div><b>${stand.name}</b><small>${euro(p.stack)}</small></div><span class="aktion ${aktionKlasse}">${aktion}</span></div>`
        : `<div class="${klassen}">${av}<b>${p.name}</b><small>${euro(p.stack)}</small>${karten}<span class="aktion ${aktionKlasse}">${aktion}</span></div>`;
      const einsatz = einsaetzeVorher ? einsaetzeVorher[i] : p.runde;
      if (einsatz > 0) html += `<div class="einsatz e${i}"><span class="chip"></span>${kurz(einsatz)}</div>`;
    }
    $('t-sitze').innerHTML = html;

    // Pot + Board
    const imPot = einsaetzeVorher ? t.pot() - einsaetzeVorher.reduce((a, b) => a + b, 0) : t.pot() - t.plaetze.reduce((a, p) => a + (p ? p.runde : 0), 0);
    $('t-pot').querySelector('b').textContent = euro(imPot);
    $('t-pot').classList.toggle('leer', imPot <= 0 || (t.phase === 'ende' && sieger.length > 0));
    let board = '';
    for (let n = 0; n < 5; n++) board += t.board[n] != null ? k(t.board[n], n >= this.boardGezeigt ? 'neu' : '') : '<div class="platzhalter"></div>';
    $('t-board').innerHTML = board;
    $('t-board').querySelectorAll('.neu').forEach((el, j) => { el.style.animationDelay = j * 90 + 'ms'; });
    this.boardGezeigt = t.board.length;

    // Deine Hand
    const hand = $('t-hand');
    hand.classList.toggle('gefoldet', ich.gefoldet);
    if (!hand.classList.contains('weg')) {
      hand.innerHTML = ich.imSpiel && ich.karten.length ? ich.karten.map((c) => k(c, this.handGezeigt ? '' : 'neu')).join('') : '';
      this.handGezeigt = ich.karten.length > 0;
    }

    // Leiste
    const dran = t.amZug === 0 && this.laeuft;
    $('t-leiste').classList.toggle('warten', !dran);
    if (dran) {
      const o = t.optionen(0);
      $('t-check').classList.toggle('aus', !o.schieben);
      $('t-call').classList.toggle('aus', o.schieben);
      $('t-call').querySelector('small').textContent = o.schieben ? '' : (o.zuZahlen >= ich.stack ? 'All in' : euro(o.zuZahlen));
      $('t-raise').classList.toggle('aus', !o.kannErhoehen);
      $('t-raise').firstChild.textContent = t.einsatz === 0 ? 'Setzen' : 'Erhöhen';
      $('t-schnell').classList.toggle('aus', !o.kannErhoehen);
      const r = $('t-regler');
      r.classList.toggle('aus', !o.kannErhoehen);
      r.min = o.minAuf; r.max = o.maxAuf; r.step = t.sb; r.value = o.minAuf;
      this.reglerZeigen('min');
    }
  }
}

function farbe(r) { r.style.setProperty('--p', ((r.value - r.min) / Math.max(1, r.max - r.min)) * 100 + '%'); }
