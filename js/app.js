// Start: Design anwenden, Bildschirme verdrahten, Intro abspielen.
import { stand, speichern, ORTE, KARTEN_STILE, RUECKEN, TISCHE, HINTERGRUENDE, AKZENTE, AVATAR_ICONS, gesamt, euro, kurz, bestenliste, istPleite, pleiteNeustart, freischalten } from './daten.js';
import { $, zeige, wennGezeigt, ico, iconsEinsetzen, avatarHTML, meldung } from './ansicht.js';
import { karteHTML } from './karten.js';
import { startIntro, introFertigOhneAnimation } from './intro.js';
import { TischUI } from './tischui.js';
import { tonStart, ton } from './ton.js';

/* ---------- Design ---------- */
export function anwenden() {
  const e = stand.einstellungen, app = $('app');
  app.className = 'bg-' + e.hintergrund;
  const [a1, a2, a3] = AKZENTE[e.akzent] || AKZENTE.gold;
  app.style.setProperty('--a1', a1); app.style.setProperty('--a2', a2); app.style.setProperty('--a3', a3);
}

/* ---------- Menü ---------- */
function listeHTML(eintraege) {
  return `<h3><span>Bestenliste</span><span>Kapital</span></h3>` + eintraege.map((e) => `
    <div class="platz ${e.ich ? 'ich' : ''} ${e.platz === 1 ? 'eins' : ''}"><i>${e.platz}</i>${avatarHTML(e.ich ? { mensch: true } : e)}
      <div class="nm">${e.ich ? stand.name || 'Du' : e.name}<small>${ORTE.find((o) => o.id === e.ort).name}</small></div><b>${euro(e.wert)}</b></div>`).join('');
}
wennGezeigt('v-menue', () => {
  $('m-kapital').textContent = euro(gesamt());
  $('m-ort').textContent = `Level ${stand.stufe + 1} · ${ORTE[stand.stufe].name}`;
  const alle = bestenliste();
  const ich = alle.find((e) => e.ich);
  const oben = alle.slice(0, 4);
  $('m-liste').innerHTML = listeHTML(oben.includes(ich) ? alle.slice(0, 5) : [...oben, ich]);
});
$('m-cash').addEventListener('click', () => { ton('klick'); zeige('v-orte'); });
document.querySelectorAll('.kachel').forEach((k) => k.addEventListener('click', () => { ton('klick'); zeige(k.dataset.ziel); }));
document.querySelectorAll('.zurueck').forEach((z) => z.addEventListener('click', () => { ton('klick'); zeige('v-menue'); }));

/* ---------- Orte + Einkaufen ---------- */
let gewaehlt = null;
wennGezeigt('v-orte', () => {
  $('o-geld').textContent = euro(stand.kapital);
  $('o-liste').innerHTML = ORTE.map((o, i) => {
    const offen = i <= stand.stufe;
    const tag = offen ? (stand.kapital >= o.min ? 'Offen' : euro(o.min)) : `ab ${euro(o.ab)}`;
    return `<button class="ort ${offen ? 'offen' : 'zu'}" data-i="${i}">
      <div class="bild" style="background:linear-gradient(160deg,${o.farbe[0]},${o.farbe[1]})">${ico(offen ? o.icon : 'schloss', 28)}</div>
      <div class="info"><b>${o.name}</b><small>Blinds ${kurz(o.sb)} / ${kurz(o.bb)} · ${euro(o.min)}–${euro(o.max)}</small></div><span class="tag">${tag}</span></button>`;
  }).join('');
  $('o-liste').querySelectorAll('.ort').forEach((el) => el.addEventListener('click', () => {
    const i = +el.dataset.i, o = ORTE[i];
    if (i > stand.stufe || stand.kapital < o.min) { el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 260); return; }
    ton('klick'); oeffneBlatt(o);
  }));
  schliesseBlatt();
});
function reglerFarbe(r) { r.style.setProperty('--p', ((r.value - r.min) / Math.max(1, r.max - r.min)) * 100 + '%'); }
function oeffneBlatt(o) {
  gewaehlt = o;
  const r = $('b-regler'), max = Math.min(o.max, stand.kapital);
  r.min = o.min; r.max = max; r.step = o.sb; r.value = Math.min(max, Math.round((o.min + o.max) / 2 / o.sb) * o.sb);
  $('b-name').textContent = o.name; $('b-min').textContent = euro(o.min); $('b-max').textContent = euro(max);
  $('b-betrag').textContent = euro(+r.value); reglerFarbe(r);
  $('o-blatt').classList.add('an'); $('o-schleier').classList.add('an');
}
function schliesseBlatt() { $('o-blatt').classList.remove('an'); $('o-schleier').classList.remove('an'); }
$('o-schleier').addEventListener('click', schliesseBlatt);
$('b-regler').addEventListener('input', (e) => { $('b-betrag').textContent = euro(+e.target.value); reglerFarbe(e.target); });
$('b-los').addEventListener('click', () => { ton('chips'); schliesseBlatt(); tisch.start(gewaehlt, +$('b-regler').value); });

/* ---------- Tisch ---------- */
const tisch = new TischUI({
  beimVerlassen() {
    if (freischalten()) meldung(`${ORTE[stand.stufe].name} freigeschaltet`);
    speichern();
    if (istPleite()) { $('pleite').classList.add('an'); return; }
    zeige('v-menue');
  },
});

/* ---------- Pleite ---------- */
$('p-neu').addEventListener('click', () => { ton('chips'); pleiteNeustart(); $('pleite').classList.remove('an'); zeige('v-menue'); });

/* ---------- Einstellungen ---------- */
function wahlHTML(liste, aktuell, vorschau) {
  return liste.map(([id, name]) => `<button data-w="${id}" class="${id === aktuell ? 'an' : ''}"><div class="rahmen">${vorschau(id)}</div>${name}</button>`).join('');
}
function einstZeichnen() {
  const e = stand.einstellungen;
  $('e-av').querySelector('.av')?.remove();
  $('e-av').insertAdjacentHTML('afterbegin', avatarHTML({ mensch: true }));
  const innen = $('e-av').querySelector('.av'); innen.style.cssText += ';width:100%;height:100%;font-size:28px;border:0';
  $('e-name').value = stand.name;
  $('e-stufe').textContent = `Level ${stand.stufe + 1} · ${euro(gesamt())}`;
  const a = stand.avatar;
  $('e-avwahl').innerHTML =
    `<button class="av ${a.art === 'buchstabe' ? 'an' : ''}" data-av="buchstabe">${(stand.name || 'D')[0].toUpperCase()}</button>` +
    AVATAR_ICONS.map((n) => `<button class="av ${a.art === 'icon' && a.wert === n ? 'an' : ''}" data-av="icon" data-wert="${n}">${ico(n, 18)}</button>`).join('') +
    `<button class="av ${a.art === 'foto' ? 'an' : ''}" data-av="foto">${ico('kamera', 18)}</button>`;
  $('e-karten').innerHTML = wahlHTML(KARTEN_STILE, e.karten, (id) => karteHTML(id === 'klassisch' || id === 'royal' ? 38 : 51, { klasse: 's-' + id }));
  $('e-ruecken').innerHTML = wahlHTML(RUECKEN, e.ruecken, (id) => karteHTML(null, { zu: true, klasse: 'r-' + id }));
  $('e-tisch').innerHTML = wahlHTML(TISCHE, e.tisch, (id) => `<div class="tisch t-${id}" style="position:relative;inset:auto;width:100%;height:34px;border-width:3px;box-shadow:0 0 0 1px var(--a3)"><div class="filz"></div></div>`);
  $('e-bg').innerHTML = wahlHTML(HINTERGRUENDE, e.hintergrund, (id) => `<div class="mbg" style="background:${BG_VORSCHAU[id]}"></div>`);
  $('e-akzent').innerHTML = Object.entries(AKZENTE).map(([id, [x, y]]) => `<button class="${id === e.akzent ? 'an' : ''}" data-a="${id}" style="background:linear-gradient(160deg,${x},${y})"></button>`).join('');
  $('e-ton').classList.toggle('an', e.ton);
}
// Hintergrund-Vorschau: die Klassen hängen an #app, darum hier direkt nachgebaut
const BG_VORSCHAU = {
  schwarz: 'radial-gradient(90% 60% at 50% 0%, #d8b25a33, #0b0b0d 70%)', lounge: 'linear-gradient(160deg,#2b2140,#0b0910)',
  skyline: 'linear-gradient(180deg,#0a1830,#1a0f2e 60%,#3a1a2a)', holz: 'repeating-linear-gradient(90deg,#1d1611 0 8px,#251c15 8px 16px)',
};
wennGezeigt('v-einst', einstZeichnen);
function setze(feld, wert) { stand.einstellungen[feld] = wert; speichern(); anwenden(); ton('klick'); einstZeichnen(); }
$('e-karten').addEventListener('click', (ev) => { const b = ev.target.closest('[data-w]'); if (b) setze('karten', b.dataset.w); });
$('e-ruecken').addEventListener('click', (ev) => { const b = ev.target.closest('[data-w]'); if (b) setze('ruecken', b.dataset.w); });
$('e-tisch').addEventListener('click', (ev) => { const b = ev.target.closest('[data-w]'); if (b) setze('tisch', b.dataset.w); });
$('e-bg').addEventListener('click', (ev) => { const b = ev.target.closest('[data-w]'); if (b) setze('hintergrund', b.dataset.w); });
$('e-akzent').addEventListener('click', (ev) => { const b = ev.target.closest('[data-a]'); if (b) setze('akzent', b.dataset.a); });
$('e-ton').addEventListener('click', () => { setze('ton', !stand.einstellungen.ton); tonStart(); ton('klick'); });
$('e-name').addEventListener('input', (ev) => { stand.name = ev.target.value.trim().slice(0, 16) || 'Du'; speichern(); });
$('e-name').addEventListener('blur', () => einstZeichnen());
$('e-avwahl').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-av]'); if (!b) return;
  if (b.dataset.av === 'foto') { $('e-foto').click(); return; }
  stand.avatar = b.dataset.av === 'icon' ? { art: 'icon', wert: b.dataset.wert } : { art: 'buchstabe', wert: '' };
  speichern(); ton('klick'); einstZeichnen();
});
$('e-foto').addEventListener('change', (ev) => {
  const datei = ev.target.files?.[0]; if (!datei) return;
  const bild = new Image();
  bild.onload = () => {
    const c = document.createElement('canvas'), s = 256, m = Math.min(bild.width, bild.height);
    c.width = c.height = s;
    c.getContext('2d').drawImage(bild, (bild.width - m) / 2, (bild.height - m) / 2, m, m, 0, 0, s, s);
    stand.avatar = { art: 'foto', wert: c.toDataURL('image/jpeg', .85) };
    speichern(); einstZeichnen(); URL.revokeObjectURL(bild.src);
  };
  bild.src = URL.createObjectURL(datei);
  ev.target.value = '';
});

/* ---------- Bestenliste + Statistik ---------- */
wennGezeigt('v-liste', () => { $('l-liste').innerHTML = listeHTML(bestenliste()); });
const HAND = ['Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];
wennGezeigt('v-stat', () => {
  const s = stand.statistik;
  const werte = [
    ['Hände', s.haende.toLocaleString('de-DE')], ['Gewonnen', s.haende ? Math.round((s.gewonnen / s.haende) * 100) + ' %' : '–'],
    ['Größter Pot', euro(s.groessterPot)], ['Beste Hand', s.besteHand >= 0 ? HAND[s.besteHand] : '–'],
    ['Rekord', euro(s.hoechstes)], ['Pleiten', s.pleiten], ['Level', `${stand.stufe + 1} / ${ORTE.length}`], ['Kapital', euro(gesamt())],
  ];
  $('s-werte').innerHTML = werte.map(([n, w]) => `<div><span>${n}</span><b>${w}</b></div>`).join('');
});

/* ---------- Offline (nur über https, sonst würde beim Entwickeln die alte Fassung hängen bleiben) ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

/* ---------- Los ---------- */
document.addEventListener('pointerdown', tonStart, { once: true });
iconsEinsetzen();
anwenden();
zeige('v-menue');
if (istPleite()) $('pleite').classList.add('an');
if (new URLSearchParams(location.search).has('ohneintro')) introFertigOhneAnimation();
else startIntro(() => {});
