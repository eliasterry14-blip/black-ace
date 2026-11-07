// Start-Animation: Licht, Staub, vier schwarze Asse, Fächer, Glanz, Name → wird zum Hauptmenü.
import { $ } from './ansicht.js';

const PIK = 'M50 4C50 4 8 42 8 66c0 16 12 26 25 26 8 0 13-4 15-8-1 12-6 22-14 28h32c-8-6-13-16-14-28 2 4 7 8 15 8 13 0 25-10 25-26C92 42 50 4 50 4Z';
const ASSE = [{ s: '♦' }, { s: '♣' }, { s: '♥' }, { s: '♠', gross: true }];
const ZIEL = [{ r: -19, x: -1.6, y: 1.2 }, { r: -8, x: -.8, y: .3 }, { r: 4, x: .6, y: -.2 }, { r: 15, x: 2.2, y: .8 }];   // in em
const SANFT = 'cubic-bezier(.16,1,.3,1)', FEDER = 'cubic-bezier(.34,1.45,.64,1)', WEG = 'cubic-bezier(.7,0,.2,1)';
const T = '︎';
const an = (el, kf, o) => el.animate(kf, { fill: 'forwards', ...o });
const zielTransform = (i) => `translate(${ZIEL[i].x}em, ${ZIEL[i].y}em) rotate(${ZIEL[i].r}deg)`;

/* ---------- Staub im Licht (läuft auch leise im Menü weiter) ---------- */
let staubZiel = 0, staubAlpha = 0, laeuft = false;
function staubStarten() {
  if (laeuft) return; laeuft = true;
  const cv = $('staub'), cx = cv.getContext('2d');
  let B = 0, H = 0;
  const groesse = () => { const d = Math.min(2, devicePixelRatio || 1); B = cv.clientWidth; H = cv.clientHeight; cv.width = B * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); };
  groesse(); addEventListener('resize', groesse);
  const neu = (irgendwo) => ({ x: Math.random() * B, y: irgendwo ? Math.random() * H : H + 10, r: Math.random() * 1.4 + .3, v: Math.random() * .25 + .05, w: Math.random() * 6.3 });
  const teile = Array.from({ length: 70 }, () => neu(true));
  const bild = () => {
    if ($('v-menue').classList.contains('an')) {
      if (!B) groesse();
      staubAlpha += (staubZiel - staubAlpha) * .04;
      cx.clearRect(0, 0, B, H);
      for (const p of teile) {
        p.y -= p.v; p.w += .01; p.x += Math.sin(p.w) * .15;
        if (p.y < -10) Object.assign(p, neu(false));
        const d = Math.hypot((p.x - B / 2) / (90 + p.y * .35), (p.y - H * .38) / (H * .5));
        const a = Math.max(0, 1 - d) * staubAlpha;
        if (a <= .01) continue;
        cx.globalAlpha = a * .85; cx.fillStyle = '#fff';
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
      }
    }
    requestAnimationFrame(bild);
  };
  requestAnimationFrame(bild);
}

function aufbauen() {
  $('faecher').innerHTML = ASSE.map((k) => {
    const mitte = k.gross
      ? `<svg viewBox="0 0 100 120"><path d="${PIK}" fill="url(#silber)" filter="url(#gehaemmert)" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`
      : `<span class="zeichen">${k.s}${T}</span>`;
    return `<div class="ass"><span class="ecke o"><b>A</b><i>${k.s}${T}</i></span>${mitte}<span class="ecke u"><b>A</b><i>${k.s}${T}</i></span><div class="glanz"></div></div>`;
  }).join('');
  $('logo').innerHTML = [...'BLACK ACE'].map((c) => (c === ' ' ? '<span class="luecke"></span>' : `<span>${c}</span>`)).join('');
}

/** Zeigt die Asse sofort im Endzustand (für Rückkehr ins Menü oder Überspringen). */
function endzustand() {
  [...$('faecher').children].forEach((k, i) => { k.getAnimations().forEach((a) => a.cancel()); k.style.opacity = 1; k.style.transform = zielTransform(i); });
}

export function startIntro(fertig) {
  aufbauen(); staubStarten();
  const menue = $('v-menue');
  menue.classList.add('intro');
  staubZiel = 1;
  const karten = [...$('faecher').children];
  const animationen = [];
  const merk = (a) => { animationen.push(a); return a; };
  let vorbei = false;

  const abschluss = () => {
    if (vorbei) return; vorbei = true;
    animationen.forEach((a) => a.cancel());
    endzustand();
    [...$('logo').children].forEach((b) => { b.style.opacity = 1; });
    menue.classList.remove('intro');
    staubZiel = .3;
    fertig();
  };

  an($('kegel'), [{ opacity: 0 }, { opacity: 1 }], { duration: 1100, easing: 'ease-out' });
  karten.forEach((k, i) => {
    const dreh = (i % 2 ? 1 : -1) * (25 + i * 9);
    merk(an(k, [
      { opacity: 0, transform: `translate(${(i - 1.5) * 6}em, 62em) rotate(${dreh}deg) rotateX(58deg) scale(.82)` },
      { opacity: 1, offset: .35 },
      { opacity: 1, transform: `translate(${i * .15}em, ${-i * .15}em) rotate(${(i - 1.5) * 2}deg)` },
    ], { duration: 950, delay: 450 + i * 170, easing: SANFT }));
  });
  const facher = 450 + 3 * 170 + 900;
  karten.forEach((k, i) => merk(an(k, [
    { opacity: 1, transform: `translate(${i * .15}em, ${-i * .15}em) rotate(${(i - 1.5) * 2}deg)` },
    { opacity: 1, transform: zielTransform(i) },
  ], { duration: 760, delay: facher + (3 - i) * 45, easing: FEDER })));
  const glanz = facher + 650;
  karten.forEach((k, i) => merk(an(k.querySelector('.glanz'), [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 1000, delay: glanz + i * 90, easing: 'ease-in-out' })));
  merk(an(karten[3].querySelector('svg'), [
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 #fff0)' },
    { transform: 'scale(1.08)', filter: 'drop-shadow(0 0 16px #ffffffaa)', offset: .45 },
    { transform: 'scale(1)', filter: 'drop-shadow(0 0 4px #ffffff33)' },
  ], { duration: 900, delay: glanz + 300, easing: 'ease-out' }));
  const name = glanz + 250;
  [...$('logo').children].forEach((b, j) => merk(an(b, [
    { opacity: 0, transform: 'translateY(20px)', filter: 'blur(10px)' },
    { opacity: 1, transform: 'none', filter: 'blur(0)' },
  ], { duration: 750, delay: name + j * 75, easing: SANFT, fill: 'both' })));
  merk(an($('lade'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: name + 900 }));
  const ladeBalken = merk(an($('lade').firstElementChild, [{ width: '0%' }, { width: '100%' }], { duration: 1500, delay: name + 1000, easing: 'cubic-bezier(.65,0,.35,1)' }));

  // Übergang: Fächer wird zum Emblem, Name zum Logo (FLIP: erst messen, umschalten, zurückrechnen).
  // Startet erst, wenn der Ladebalken wirklich voll ist – so stimmt die Reihenfolge auch auf langsamen Geräten.
  const weiter = name + 2700;
  let timer;
  ladeBalken.finished.then(() => { timer = setTimeout(uebergang, 200); }, () => {});
  function uebergang() {
    if (vorbei) return;
    const f = $('faecher'), l = $('logo');
    const a1 = f.getBoundingClientRect(), a2 = l.getBoundingClientRect();
    menue.classList.remove('intro');
    const b1 = f.getBoundingClientRect(), b2 = l.getBoundingClientRect();
    const von = (a, b) => `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width})`;
    f.animate([{ transform: von(a1, b1) }, { transform: 'none' }], { duration: 900, easing: WEG });
    l.animate([{ transform: von(a2, b2) }, { transform: 'none' }], { duration: 900, delay: 40, easing: WEG, fill: 'backwards' });
    staubZiel = .3;
    [...document.querySelector('.menue-inhalt').children].forEach((m, i) => m.animate(
      [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, delay: 600 + i * 110, easing: SANFT, fill: 'backwards' }));
    vorbei = true;
    setTimeout(() => { endzustand(); fertig(); }, 950);
  }

  // Tippen überspringt
  const ueberspringen = () => { clearTimeout(timer); abschluss(); };
  menue.addEventListener('pointerdown', ueberspringen, { once: true });
  setTimeout(() => menue.removeEventListener('pointerdown', ueberspringen), weiter);
}

/** Menü ohne Intro (z. B. nach dem Tisch): Emblem und Logo direkt fertig. */
export function introFertigOhneAnimation() {
  if (!$('faecher').children.length) aufbauen();
  staubStarten(); staubZiel = .3;
  endzustand();
  $('v-menue').classList.remove('intro');
}
