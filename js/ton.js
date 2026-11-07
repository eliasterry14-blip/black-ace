// Töne werden live erzeugt (kein Download, keine Dateien): Karte, Chips, Gewinn, Klick.
import { stand } from './daten.js';

let ctx = null;
export function tonStart() {                     // iPhone erlaubt Ton erst nach einer Berührung
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function rauschen(dauer, { hoch = 2000, laut = .3, start = 0 } = {}) {
  const n = Math.floor(ctx.sampleRate * dauer);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const q = ctx.createBufferSource(); q.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hoch;
  const g = ctx.createGain(); g.gain.value = laut;
  q.connect(f).connect(g).connect(ctx.destination);
  q.start(ctx.currentTime + start);
}
function klang(freq, dauer, { laut = .15, start = 0, typ = 'sine' } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = typ; o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dauer);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dauer + .05);
}

export function ton(art) {
  if (!ctx || !stand.einstellungen.ton) return;
  if (art === 'karte') rauschen(.07, { hoch: 3500, laut: .25 });
  else if (art === 'chips') { rauschen(.04, { hoch: 5000, laut: .3 }); rauschen(.04, { hoch: 4500, laut: .25, start: .06 }); klang(2400, .05, { laut: .04, start: .02, typ: 'triangle' }); }
  else if (art === 'gewinn') [523, 659, 784, 1046].forEach((f, i) => klang(f, .5, { laut: .08, start: i * .08 }));
  else if (art === 'fold') rauschen(.12, { hoch: 1200, laut: .15 });
  else if (art === 'klick') klang(900, .04, { laut: .05, typ: 'triangle' });
  else if (art === 'check') { klang(180, .06, { laut: .12 }); klang(170, .06, { laut: .1, start: .09 }); }
}
