// Orte, Speicherstand, Einstellungen und Bestenliste.
export const START_KAPITAL = 5000;

export const ORTE = [
  { id: 'garage',  name: "Dave's Garage",  sb: 5,       bb: 10,      min: 200,      max: 400,       ab: 0,         icon: 'garage', farbe: ['#3a2c1a', '#141011'] },
  { id: 'pub',     name: 'The Pub',        sb: 50,      bb: 100,     min: 2000,     max: 4000,      ab: 10000,     icon: 'pub',    farbe: ['#2a1d14', '#121011'] },
  { id: 'jazz',    name: 'Jazz Club',      sb: 500,     bb: 1000,    min: 20000,    max: 40000,     ab: 60000,     icon: 'jazz',   farbe: ['#1a1630', '#0f0e15'] },
  { id: 'skyline', name: 'Skyline Lounge', sb: 5000,    bb: 10000,   min: 200000,   max: 400000,    ab: 600000,    icon: 'skyline', farbe: ['#122434', '#0d1117'] },
  { id: 'yacht',   name: 'The Yacht',      sb: 50000,   bb: 100000,  min: 2000000,  max: 4000000,   ab: 6000000,   icon: 'yacht',  farbe: ['#0f2a2c', '#0b1213'] },
  { id: 'vault',   name: 'The Vault',      sb: 1000000, bb: 2000000, min: 50000000, max: 100000000, ab: 150000000, icon: 'vault',  farbe: ['#2c2410', '#100d06'] },
];

export const KARTEN_STILE = [['kitsch', 'Kitsch-Gold'], ['onyx', 'Onyx'], ['klassisch', 'Klassisch'], ['neon', 'Neon'], ['royal', 'Royal']];
export const RUECKEN = [['gold', 'Goldraute'], ['pik', 'Black Ace'], ['rubin', 'Rubin'], ['saphir', 'Saphir'], ['neonr', 'Neon']];
export const TISCHE = [['onyx', 'Onyx'], ['filz', 'Filz'], ['samt', 'Samt'], ['nacht', 'Nacht']];
export const HINTERGRUENDE = [['schwarz', 'Schwarz'], ['lounge', 'Lounge'], ['skyline', 'Skyline'], ['holz', 'Holz']];
export const AKZENTE = {
  gold:    ['#f3d98b', '#d8b25a', '#8a6a26'],
  silber:  ['#ffffff', '#c4c6cc', '#6d6f76'],
  rose:    ['#ffd6c8', '#e0957f', '#8c4f40'],
  smaragd: ['#9ff5c8', '#3fbf7f', '#1d6b45'],
  rubin:   ['#ffa3ae', '#d8394c', '#7a1424'],
  blau:    ['#c2d8ff', '#5b8ef0', '#22417f'],
};
export const AVATAR_ICONS = ['krone', 'pik', 'wuerfel', 'stern', 'blitz'];

const SCHLUESSEL = 'blackace.v1';
const STANDARD = () => ({
  kapital: START_KAPITAL, stufe: 0, name: 'Du',
  avatar: { art: 'buchstabe', wert: '' },
  einstellungen: { karten: 'kitsch', ruecken: 'gold', tisch: 'onyx', hintergrund: 'schwarz', akzent: 'gold', ton: true },
  statistik: { haende: 0, gewonnen: 0, groessterPot: 0, besteHand: -1, hoechstes: START_KAPITAL, pleiten: 0 },
  amTisch: 0,
});

export let stand = laden();

function laden() {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL));
    if (roh) {
      const s = { ...STANDARD(), ...roh, einstellungen: { ...STANDARD().einstellungen, ...roh.einstellungen }, statistik: { ...STANDARD().statistik, ...roh.statistik } };
      if (s.amTisch > 0) { s.kapital += s.amTisch; s.amTisch = 0; }   // App wurde am Tisch geschlossen → Chips zurück
      return s;
    }
  } catch { /* kaputter Speicher → neu anfangen */ }
  return STANDARD();
}

export function speichern() {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(stand)); } catch { /* Speicher voll oder gesperrt */ }
}

export const gesamt = () => stand.kapital + stand.amTisch;

/** Freischalten: was einmal offen ist, bleibt offen – bis zur Pleite. */
export function freischalten() {
  let neu = false;
  ORTE.forEach((o, i) => { if (i > stand.stufe && gesamt() >= o.ab) { stand.stufe = i; neu = true; } });
  if (gesamt() > stand.statistik.hoechstes) stand.statistik.hoechstes = gesamt();
  return neu;
}

export const istPleite = () => gesamt() < ORTE[0].min;

export function pleiteNeustart() {
  stand.kapital = START_KAPITAL; stand.amTisch = 0; stand.stufe = 0;
  stand.statistik.pleiten++;
  speichern();
}

// ---- Gegner: Namen für den Tisch und die Bestenliste ----
export const BOT_NAMEN = ['Viktor', 'Lena', 'Marco', 'Jules', 'Sofia', 'Dave', 'Nina', 'Tom', 'Ivy', 'Rico', 'Mila', 'Oskar', 'Zoe', 'Hank', 'Yuki', 'Bruno', 'Carla', 'Felix', 'Ada', 'Leon'];

const LISTE = [
  ['Viktor „The Shark“', 184e6, 'vault'], ['Lena Ace', 9.6e6, 'yacht'], ['Marco Bluff', 2.1e6, 'skyline'],
  ['Jules', 310000, 'jazz'], ['Sofia Royal', 95000, 'jazz'], ['Hank', 42000, 'pub'], ['Nina', 18000, 'pub'],
  ['Rico', 9500, 'garage'], ['Ivy', 7200, 'garage'], ['Tom', 6100, 'garage'], ['Oskar', 3800, 'garage'],
];

export function bestenliste() {
  const ich = { name: stand.name || 'Du', wert: gesamt(), ort: ORTE[stand.stufe].id, ich: true };
  return [...LISTE.map(([name, wert, ort]) => ({ name, wert, ort })), ich].sort((a, b) => b.wert - a.wert).map((e, i) => ({ ...e, platz: i + 1 }));
}

// ---- Geld schön schreiben ----
export function euro(x) {
  if (x >= 1e9) return (x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mrd €';
  if (x >= 1e6) return (x / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mio €';
  return Math.round(x).toLocaleString('de-DE') + ' €';
}
export function kurz(x) {
  if (x >= 1e6) return (x / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' M';
  if (x >= 1e4) return (x / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' K';
  return Math.round(x).toLocaleString('de-DE');
}
