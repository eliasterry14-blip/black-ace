// Kleine Helfer für alle Bildschirme: Wechseln, Icons, Avatare, Meldungen.
import { stand } from './daten.js';

export const $ = (id) => document.getElementById(id);
export const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const beimZeigen = {};
export const wennGezeigt = (id, fn) => { beimZeigen[id] = fn; };
export function zeige(id) {
  document.querySelectorAll('.ansicht').forEach((v) => v.classList.toggle('an', v.id === id));
  beimZeigen[id]?.();
}

const P = {
  zurueck: '<path d="M15 5l-7 7 7 7"/>',
  pokal: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  balken: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  tuer: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  krone: '<path d="M3 18h18l-2-10-4 4-3-6-3 6-4-4z"/>',
  wuerfel: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
  stern: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  blitz: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  pik: '<path d="M12 3C9 7 4 9.5 4 13.5A3.5 3.5 0 0 0 11 15c-.3 2.3-1.3 4-3 5h8c-1.7-1-2.7-2.7-3-5a3.5 3.5 0 0 0 7-1.5C20 9.5 15 7 12 3z"/>',
  garage: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 16h10"/>',
  pub: '<path d="M6 3h12l-1 8a5 5 0 0 1-10 0z"/><path d="M12 16v5M8 21h8"/>',
  jazz: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  skyline: '<path d="M3 21h18M5 21V10h4v11M10 21V4h4v17M15 21v-8h4v8"/>',
  yacht: '<path d="M2 17l2 4h16l2-4zM6 17V9l6-5v13M12 8l6 9"/>',
  vault: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M8 12h1M15 12h1"/>',
  schloss: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
export const ico = (n, s = 20) => `<svg class="i" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
export function iconsEinsetzen(root = document) {
  root.querySelectorAll('[data-i]').forEach((el) => { if (!el.dataset.fertig) { el.insertAdjacentHTML('afterbegin', ico(el.dataset.i)); el.dataset.fertig = 1; } });
}

/** Avatar: für dich aus den Einstellungen, für Bots der Anfangsbuchstabe. */
export function avatarHTML(person, klasse = '') {
  if (person && person.mensch) {
    const a = stand.avatar;
    if (a.art === 'foto' && a.wert) return `<div class="av ich foto ${klasse}" style="--foto:url(${a.wert})"></div>`;
    if (a.art === 'icon') return `<div class="av ich ${klasse}">${ico(a.wert, 20)}</div>`;
    return `<div class="av ich ${klasse}">${(stand.name || 'D')[0].toUpperCase()}</div>`;
  }
  return `<div class="av ${klasse}">${(person?.name || '?')[0].toUpperCase()}</div>`;
}

let meldungTimer;
export function meldung(text) {
  const m = $('meldung');
  m.textContent = text; m.classList.add('an');
  clearTimeout(meldungTimer);
  meldungTimer = setTimeout(() => m.classList.remove('an'), 2600);
}
