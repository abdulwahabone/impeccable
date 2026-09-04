/**
 * Word performances: each of the 23 commands performed on its own name.
 *
 * The word is split into letter spans for the duration of a performance,
 * every visual is an inline style computed from a single value `t`, and the
 * original text node is put back when the word settles. Nothing is added to
 * the page at rest: no stylesheet, no wrapper, no attribute.
 *
 *   perform(el, command, opts)  run the effect once, resolves at rest
 *   set(el, command, t)         pose the effect at t in 0..1, no animation
 *   attach(el, command, opts)   perform on first view, then on hover / focus
 *   COMMANDS                    the names this module knows
 *
 * `t` means "how far the command has been applied". For reversible effects
 * (bolder, harden, adapt...) rest is t = 0 and the performance goes out and
 * back. For settling effects (typeset, polish, impeccable, clarify, onboard,
 * init, optimize) rest is t = 1: the word starts wrong and ends right.
 *
 * Gold appears only as a dot (delight, live). Text is ink, paper, or patina.
 */

const INK = 'var(--ks-ink)';
const PAPER = 'var(--ks-paper)';
const GRAY2 = 'var(--ks-gray-2)';
const PATINA = 'var(--ks-patina)';
const PATINA_DEEP = 'var(--ks-patina-deep)';
const GOLD = 'var(--ks-kinpaku)';
const LED = 'var(--ks-led)';
const MONO = 'var(--ks-mono)';
const VERMILION = 'var(--ks-vermilion)';
const MUTED = 'var(--ks-text-muted)';
const FAINT = 'var(--ks-text-faint)';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const hump = (phase) => 0.5 * (1 - Math.cos(2 * Math.PI * phase));
const mod1 = (v) => v - Math.floor(v);
const pct = (v) => `${(clamp01(v) * 100).toFixed(2)}%`;
/** color-mix from `a` toward `b` by `v` in 0..1. */
const mix = (a, b, v) => `color-mix(in oklch, ${a}, ${b} ${pct(v)})`;
const alpha = (c, v) => `color-mix(in oklch, ${c} ${pct(v)}, transparent)`;
const em = (v) => `${v.toFixed(4)}em`;

/** Per-letter progress when letter `i` of `n` starts `s` units after the one before it. */
function stagger(t, i, n, s) {
  return clamp01(t * (1 + s * (n - 1)) - s * i);
}

/** Small deterministic noise in -1..1 for words the arrays were not tuned for. */
function noise(i, seed) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function styled(tag, css) {
  const node = document.createElement(tag);
  Object.assign(node.style, css);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function absolute(css) {
  return styled('span', { position: 'absolute', pointerEvents: 'none', ...css });
}

// ---------------------------------------------------------------------------
// Effects. Each one is { kind, timing, setup?, frame }.
//   kind 'pulse': rest at t = 0, performance rises, holds, falls.
//   kind 'settle': rest at t = 1, performance rises once and stops. Settle
//   effects ease per letter, so their timeline runs linear.
//   frame(ctx, t): pose every letter and extra for t. ctx.time is ms since
//   the performance started (null under set), for effects that loop.
// ---------------------------------------------------------------------------

const EFFECTS = {
  // impeccable: the letters are set into place, not thrown. A word arriving
  // with intent.
  impeccable: {
    kind: 'settle',
    timing: { rise: 950, ease: 'linear' },
    frame({ letters, n }, t) {
      letters.forEach((l, i) => {
        const p = easeOut(stagger(t, i, n, 0.08));
        l.span.style.opacity = p.toFixed(3);
        l.span.style.transform = `translateY(${em(0.4 * (1 - p))})`;
      });
    },
  },

  // shape: a wireframe before it is a word. Ink drains out, the outline and
  // the dashed bounding box remain.
  shape: {
    kind: 'pulse',
    timing: { rise: 400, hold: 900, fall: 400 },
    setup(ctx) {
      ctx.box = absolute({
        left: em(-0.04), right: em(-0.04), top: em(0.12), bottom: em(0.06),
        border: `1px dashed ${alpha(INK, 0.3)}`, opacity: '0',
      });
      ctx.wrap.appendChild(ctx.box);
    },
    frame(ctx, t) {
      ctx.letters.forEach((l) => {
        l.span.style.color = alpha(INK, 1 - t);
        l.span.style.webkitTextStroke = `1px ${alpha(INK, t)}`;
      });
      ctx.box.style.opacity = t.toFixed(3);
    },
  },

  // critique: the reviewer's pencil, a wavy line under the thing that needs
  // another look.
  critique: {
    kind: 'pulse',
    timing: { rise: 350, hold: 1000, fall: 350 },
    frame({ letters, n }, t) {
      letters.forEach((l, i) => {
        const p = stagger(t, i, n, 0.1);
        l.span.style.textDecoration = 'underline wavy';
        l.span.style.textDecorationThickness = '1px';
        l.span.style.textUnderlineOffset = em(0.08);
        l.span.style.textDecorationColor = alpha(INK, p);
      });
    },
  },

  // audit: three boxes appear beside the word, then three ticks land in
  // them, one at a time. Checks pass in order.
  audit: {
    kind: 'pulse',
    timing: { rise: 1100, hold: 700, fall: 350, ease: 'linear' },
    setup(ctx) {
      const row = absolute({ left: '100%', bottom: em(0.21), marginLeft: em(0.3), display: 'flex', gap: em(0.07) });
      ctx.boxes = [0, 1, 2].map(() => {
        const b = styled('span', {
          position: 'relative', display: 'block', width: em(0.13), height: em(0.13),
          border: `1px solid ${INK}`, borderRadius: '2px', opacity: '0', boxSizing: 'border-box',
        });
        const tick = absolute({
          left: '30%', top: '0', width: '28%', height: '58%',
          borderStyle: 'solid', borderColor: INK, borderWidth: '0 1.5px 1.5px 0',
          transform: 'rotate(45deg) scale(0)', transformOrigin: '50% 50%',
        });
        b.appendChild(tick);
        row.appendChild(b);
        return { b, tick };
      });
      ctx.wrap.appendChild(row);
    },
    frame(ctx, t) {
      ctx.boxes.forEach(({ b, tick }, i) => {
        b.style.opacity = clamp01(t * 2.5 - i * 0.25).toFixed(3);
        const s = backOut(clamp01((t - 0.5 - i * 0.1) / 0.3));
        tick.style.transform = `rotate(45deg) scale(${s.toFixed(3)})`;
      });
    },
  },

  // typeset: at rest the kerning is slightly wrong. The letters settle into
  // their proper spacing; the word does not move, only its rhythm does.
  typeset: {
    kind: 'settle',
    timing: { rise: 700, ease: 'linear' },
    frame({ letters, n }, t) {
      const K = [0, 0.04, -0.03, 0.055, 0, 0.06, -0.03];
      letters.forEach((l, i) => {
        const k = i < K.length ? K[i] : noise(i, 3) * 0.05;
        const p = easeOut(stagger(t, i, n, 0.08));
        l.span.style.marginLeft = `calc(${l.kern}px + ${em(k * (1 - p))})`;
      });
    },
  },

  // layout: the letters take an even rhythm and the grid shows through.
  layout: {
    kind: 'pulse',
    timing: { rise: 450, hold: 900, fall: 450 },
    setup(ctx) {
      ctx.lines = ctx.letters.map((l, i) => {
        const line = absolute({ top: em(0.1), bottom: em(-0.02), width: '1px', background: alpha(INK, 0.25), opacity: '0' });
        l.span.appendChild(line);
        let end = null;
        if (i === ctx.n - 1) {
          end = absolute({ top: em(0.1), bottom: em(-0.02), width: '1px', background: alpha(INK, 0.25), opacity: '0' });
          l.span.appendChild(end);
        }
        return { line, end };
      });
    },
    frame(ctx, t) {
      const gap = 0.075 * t;
      ctx.letters.forEach((l, i) => {
        const p = easeOut(stagger(t, i, ctx.n, 0.06));
        l.span.style.marginLeft = `calc(${l.kern}px + ${em(gap)})`;
        l.span.style.marginRight = em(gap);
        const { line, end } = ctx.lines[i];
        line.style.left = em(-gap);
        line.style.opacity = p.toFixed(3);
        if (end) {
          end.style.right = em(-gap);
          end.style.opacity = p.toFixed(3);
        }
      });
    },
  },

  // colorize: a wash, letter by letter, from ink toward the site's one
  // accent hue. Color arrives with a reason and in order.
  colorize: {
    kind: 'pulse',
    timing: { rise: 500, hold: 900, fall: 500 },
    frame({ letters, n }, t) {
      letters.forEach((l, i) => {
        l.span.style.color = mix(INK, PATINA_DEEP, easeOut(stagger(t, i, n, 0.12)));
      });
    },
  },

  // animate: it moves. A bob that travels through the word, and stops.
  animate: {
    kind: 'pulse',
    timing: { rise: 300, hold: 1600, fall: 300 },
    frame({ letters, n, time }, t) {
      letters.forEach((l, i) => {
        const h = time == null
          ? Math.sin(Math.PI * stagger(t, i, n, 0.2))
          : hump(mod1((time - i * 80) / 1000));
        l.span.style.transform = `translateY(${em(-0.14 * t * h)})`;
      });
    },
  },

  // delight: the dot on the i lights up gold and hops, and the other letters
  // wiggle in reply. One small thing, done with feeling.
  delight: {
    kind: 'pulse',
    timing: { rise: 700, hold: 500, fall: 400 },
    setup(ctx) {
      const iLetter = ctx.letters.find((l) => l.ch === 'i');
      if (!iLetter) return;
      iLetter.span.textContent = 'ı';
      ctx.dot = absolute({
        left: '50%', top: em(0.19), width: em(0.1), height: em(0.1), marginLeft: em(-0.05),
        borderRadius: '50%', background: INK,
      });
      iLetter.span.appendChild(ctx.dot);
      ctx.dotIndex = iLetter.i;
    },
    frame(ctx, t) {
      const rising = ctx.phase !== 'fall';
      ctx.letters.forEach((l, i) => {
        if (i === ctx.dotIndex) {
          if (ctx.dot) {
            ctx.dot.style.background = mix(INK, GOLD, t);
            ctx.dot.style.boxShadow = t > 0.05 ? LED : 'none';
            const h = rising ? Math.sin(Math.PI * t) : 0;
            ctx.dot.style.transform = `translateY(${em(-0.22 * h)}) scale(${(1 + 0.3 * h).toFixed(3)})`;
          }
          return;
        }
        const p = stagger(t, i, ctx.n, 0.07);
        const w = rising ? Math.sin(Math.PI * p) : 0;
        l.span.style.transform = `translateY(${em(-0.06 * w)}) rotate(${(-3 * w).toFixed(2)}deg)`;
      });
    },
  },

  // bolder: the weight climbs from the hairline the site sets to a
  // slab, and comes back. The same word, with a point of view.
  bolder: {
    kind: 'pulse',
    timing: { rise: 450, hold: 800, fall: 450 },
    frame({ letters }, t) {
      const weight = Math.round(200 + 600 * t);
      letters.forEach((l) => { l.span.style.fontWeight = String(weight); });
    },
  },

  // quieter: it fades and loosens. Less contrast, more air, same message.
  quieter: {
    kind: 'pulse',
    timing: { rise: 450, hold: 900, fall: 450 },
    frame({ letters, wrap }, t) {
      wrap.style.letterSpacing = em(0.09 * t);
      letters.forEach((l) => { l.span.style.opacity = (1 - 0.7 * t).toFixed(3); });
    },
  },

  // overdrive: technically extravagant. Heavy weight, a chromatic split, a
  // 3D wobble and a light streak, all under control and all reversible.
  overdrive: {
    kind: 'pulse',
    timing: { rise: 400, hold: 1800, fall: 400 },
    setup(ctx) {
      ctx.streak = absolute({
        left: em(-0.4), right: em(-0.4), top: em(0.15), bottom: em(0.1), opacity: '0',
        background: `linear-gradient(90deg, transparent 20%, ${alpha(INK, 0.07)} 50%, transparent 80%)`,
      });
      ctx.wrap.appendChild(ctx.streak);
    },
    frame(ctx, t) {
      const { letters, time } = ctx;
      const weight = Math.round(200 + 600 * t);
      letters.forEach((l, i) => {
        const tri = time == null ? t : easeInOut(1 - Math.abs(2 * mod1((time + i * 110) / 2600) - 1));
        const rot = t * (-30 + 60 * tri);
        l.span.style.fontWeight = String(weight);
        l.span.style.transform = `perspective(420px) rotateY(${rot.toFixed(2)}deg) skewX(${(-9 * t).toFixed(2)}deg) translateZ(${em(0.12 * t * tri)})`;
        l.span.style.textShadow = `${em(-0.045 * t)} 0 ${alpha(VERMILION, 0.7)}, ${em(0.045 * t)} 0 ${alpha(PATINA, 0.7)}`;
      });
      const x = time == null ? -60 + 120 * t : -60 + 120 * mod1(time / 900);
      ctx.streak.style.opacity = t.toFixed(3);
      ctx.streak.style.transform = `translateX(${x.toFixed(1)}%)`;
    },
  },

  // distill: drop letters until only the essence remains. The first two
  // fall away and the word closes over the gap ("distill" leaves "still").
  distill: {
    kind: 'pulse',
    timing: { rise: 500, hold: 1000, fall: 500 },
    frame({ letters }, t) {
      letters.slice(0, 2).forEach((l, i) => {
        const p = stagger(t, i, 2, 0.4);
        const fall = easeIn(p);
        l.span.style.transform = `translateY(${em(1.05 * fall)}) rotate(${(16 * fall).toFixed(2)}deg)`;
        l.span.style.opacity = (1 - p).toFixed(3);
        l.span.style.marginRight = `${(-l.w * easeOut(p)).toFixed(2)}px`;
      });
    },
  },

  // clarify: a muddled synonym dissolves and the plain word sharpens.
  clarify: {
    kind: 'settle',
    timing: { rise: 1100, ease: 'linear' },
    setup(ctx) {
      if (ctx.text !== 'clarify') return;
      ctx.ghost = absolute({ left: em(0.02), top: '0', font: 'inherit', color: MUTED, whiteSpace: 'nowrap' });
      ctx.ghost.textContent = 'elucidate';
      ctx.wrap.appendChild(ctx.ghost);
    },
    frame(ctx, t) {
      ctx.letters.forEach((l, i) => {
        const p = easeOut(stagger(t, i, ctx.n, 0.035));
        l.span.style.filter = `blur(${(6 * (1 - p)).toFixed(2)}px)`;
        l.span.style.opacity = (0.35 + 0.65 * p).toFixed(3);
      });
      if (ctx.ghost) {
        const q = t * t;
        ctx.ghost.style.opacity = (0.75 * (1 - q)).toFixed(3);
        ctx.ghost.style.filter = `blur(${(1 + 9 * q).toFixed(2)}px)`;
        ctx.ghost.style.transform = `translateY(${em(-0.25 * q)})`;
      }
    },
  },

  // adapt: the word reflows to a narrower measure, and the brackets show the
  // container it now fits.
  adapt: {
    kind: 'pulse',
    timing: { rise: 450, hold: 900, fall: 450 },
    setup(ctx) {
      const bracket = (text, side) => {
        const b = absolute({
          [side]: '100%', bottom: em(0.2), font: 'inherit', fontSize: em(0.62), fontWeight: '200',
          color: FAINT, opacity: '0', lineHeight: '1',
          [side === 'right' ? 'marginRight' : 'marginLeft']: em(0.08),
        });
        b.textContent = text;
        ctx.wrap.appendChild(b);
        return b;
      };
      ctx.open = bracket('[', 'right');
      ctx.close = bracket(']', 'left');
    },
    frame(ctx, t) {
      const p = easeOut(t);
      ctx.letters.forEach((l) => {
        l.span.style.transformOrigin = '0 100%';
        l.span.style.transform = `scaleX(${(1 - 0.3 * p).toFixed(3)})`;
        l.span.style.marginRight = `${(-0.3 * l.w * p).toFixed(2)}px`;
      });
      ctx.open.style.opacity = p.toFixed(3);
      ctx.close.style.opacity = p.toFixed(3);
    },
  },

  // polish: at rest each letter is a hair off. They snap to one baseline and
  // the baseline itself shows for a moment, then leaves.
  polish: {
    kind: 'settle',
    timing: { rise: 900, ease: 'linear' },
    setup(ctx) {
      ctx.line = absolute({ left: em(-0.12), right: em(-0.12), bottom: em(0.15), height: '1px', background: INK, opacity: '0', transformOrigin: '0 50%' });
      ctx.wrap.appendChild(ctx.line);
    },
    frame(ctx, t) {
      const DY = [-0.02, 0.025, -0.015, 0.03, -0.025, 0.018];
      const R = [-1.2, 0.9, -0.6, 1.3, -1, 0.8];
      ctx.letters.forEach((l, i) => {
        const dy = i < DY.length ? DY[i] : noise(i, 5) * 0.025;
        const r = i < R.length ? R[i] : noise(i, 7) * 1.2;
        const p = easeOut(stagger(t, i, ctx.n, 0.08));
        l.span.style.transform = `translateY(${em(dy * (1 - p))}) rotate(${(r * (1 - p)).toFixed(2)}deg)`;
      });
      const q = easeOut(t);
      ctx.line.style.transform = `scaleX(${(0.15 + 0.85 * q).toFixed(3)})`;
      ctx.line.style.opacity = (t < 0.6 ? clamp01(t / 0.25) : clamp01((1 - t) / 0.4)).toFixed(3);
    },
  },

  // optimize: it gets faster. A progress bar over the word fills in a
  // fraction of the time it should take, and the letters tighten up.
  optimize: {
    kind: 'settle',
    timing: { rise: 1300, ease: 'linear' },
    setup(ctx) {
      ctx.bar = absolute({ left: em(0.04), right: em(0.04), top: em(-0.02), height: '2px', background: INK, transformOrigin: '0 50%', transform: 'scaleX(0)' });
      ctx.wrap.appendChild(ctx.bar);
    },
    frame(ctx, t) {
      const fill = 1 - Math.pow(2, -10 * clamp01(t / 0.35));
      ctx.bar.style.transform = `scaleX(${fill.toFixed(3)})`;
      ctx.bar.style.opacity = (t < 0.8 ? 1 : clamp01((1 - t) / 0.2)).toFixed(3);
      const tight = -0.012 * Math.sin(Math.PI * t);
      ctx.letters.forEach((l) => { l.span.style.letterSpacing = em(tight); });
    },
  },

  // harden: a crisp outline with a hard cast shadow. The word holds its
  // edge under pressure.
  harden: {
    kind: 'pulse',
    timing: { rise: 350, hold: 900, fall: 350 },
    frame({ letters }, t) {
      letters.forEach((l) => {
        l.span.style.color = mix(INK, PAPER, t);
        l.span.style.webkitTextStroke = `1.5px ${alpha(INK, t)}`;
        l.span.style.textShadow = `${em(0.035 * t)} ${em(0.035 * t)} 0 ${alpha(GRAY2, t)}`;
      });
    },
  },

  // onboard: lit in, one letter at a time. Each step leads to the next.
  onboard: {
    kind: 'settle',
    timing: { rise: 1050, ease: 'linear' },
    frame({ letters, n }, t) {
      letters.forEach((l, i) => {
        l.span.style.color = mix(GRAY2, INK, easeOut(stagger(t, i, n, 0.18)));
      });
    },
  },

  // init: typed in, with a cursor that blinks and then gets out of the way.
  init: {
    kind: 'settle',
    timing: { rise: 1500, ease: 'linear' },
    setup(ctx) {
      ctx.cursor = absolute({ left: '0', bottom: em(0.17), width: em(0.06), height: em(0.66), marginLeft: em(0.05), background: INK });
      ctx.wrap.appendChild(ctx.cursor);
    },
    frame(ctx, t) {
      const { letters, n, time } = ctx;
      const typed = Math.min(n, Math.floor(t * (n + 3)));
      letters.forEach((l, i) => { l.span.style.opacity = i < typed ? '1' : '0'; });
      const x = typed < n ? letters[typed].span.offsetLeft : ctx.wrap.offsetWidth;
      ctx.cursor.style.left = `${x}px`;
      const blink = typed < n || time == null ? true : Math.floor(time / 450) % 2 === 0;
      ctx.cursor.style.opacity = t < 1 && blink ? '1' : '0';
    },
  },

  // extract: the repeated letter is lifted out and boxed as a token. What
  // occurs twice becomes one definition.
  extract: {
    kind: 'pulse',
    timing: { rise: 450, hold: 900, fall: 450 },
    setup(ctx) {
      const counts = {};
      ctx.letters.forEach((l) => { counts[l.ch] = (counts[l.ch] || 0) + 1; });
      const rep = Object.keys(counts).filter((c) => counts[c] > 1).sort((a, b) => counts[b] - counts[a])[0];
      ctx.tokens = ctx.letters.filter((l) => l.ch === rep).map((l) => {
        const box = absolute({ left: em(-0.03), right: em(-0.03), top: em(0.14), bottom: em(0.02), border: `1px solid ${INK}`, opacity: '0' });
        l.span.appendChild(box);
        return { l, box };
      });
    },
    frame(ctx, t) {
      const p = easeOut(t);
      ctx.tokens.forEach(({ l, box }) => {
        l.span.style.transform = `translateY(${em(-0.3 * p)})`;
        box.style.opacity = p.toFixed(3);
      });
    },
  },

  // document: written down, letter by letter. The display face becomes the
  // mono of a DESIGN.md, in the order the word is read.
  document: {
    kind: 'pulse',
    timing: { rise: 900, hold: 900, fall: 500, ease: 'linear' },
    frame({ letters, n }, t) {
      const written = Math.min(n, Math.floor(t * (n + 0.999)));
      letters.forEach((l, i) => {
        const on = i < written;
        l.span.style.fontFamily = on ? MONO : '';
        l.span.style.fontSize = on ? em(0.42) : '';
        l.span.style.fontWeight = on ? '400' : '';
      });
    },
  },

  // live: a lit gold dot beside the word, and the word breathes. Something
  // is running.
  live: {
    kind: 'pulse',
    timing: { rise: 400, hold: 2200, fall: 400 },
    setup(ctx) {
      ctx.dot = absolute({ right: '100%', bottom: em(0.44), marginRight: em(0.12), width: em(0.1), height: em(0.1), borderRadius: '50%', background: GRAY2, opacity: '0' });
      ctx.wrap.appendChild(ctx.dot);
    },
    frame(ctx, t) {
      const { letters, time } = ctx;
      letters.forEach((l, i) => {
        const h = time == null ? t : hump(mod1((time + i * 300) / 2200));
        l.span.style.transform = `scale(${(1 + 0.04 * t * h).toFixed(4)}) translateY(${em(-0.02 * t * h)})`;
      });
      const pulse = time == null ? 0 : hump(mod1(time / 1400));
      ctx.dot.style.opacity = clamp01(t * 3).toFixed(3);
      ctx.dot.style.background = mix(GRAY2, GOLD, t);
      ctx.dot.style.boxShadow = t > 0.05 ? `${LED}, 0 0 ${(14 * pulse * t).toFixed(1)}px ${alpha(GOLD, 0.9 * pulse * t)}` : 'none';
    },
  },
};

export const COMMANDS = Object.keys(EFFECTS);

/** Commands whose `set` is a smooth function of t (every other one steps). */
export const CONTINUOUS = COMMANDS.filter((c) => !['audit', 'init', 'document'].includes(c));

// ---------------------------------------------------------------------------
// Wrapping: split the word into letter spans without moving a pixel. Each
// letter's original x is measured first, then handed back as a margin, so the
// face's kerning survives the split.
// ---------------------------------------------------------------------------

const states = new WeakMap();

function wrapWord(el) {
  const original = el.textContent;
  const text = original.trim();
  const offset = original.indexOf(text);
  const node = el.firstChild;
  let lefts = null;
  if (el.childNodes.length === 1 && node && node.nodeType === 3) {
    lefts = [];
    const range = document.createRange();
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, offset + i);
      range.setEnd(node, offset + i + 1);
      lefts.push(range.getBoundingClientRect().left);
    }
  }

  const wrap = document.createElement('span');
  Object.assign(wrap.style, { display: 'inline-block', position: 'relative', whiteSpace: 'nowrap' });
  const letters = [...text].map((ch, i) => {
    const span = document.createElement('span');
    Object.assign(span.style, { display: 'inline-block', position: 'relative', transformOrigin: '50% 100%' });
    span.textContent = ch;
    wrap.appendChild(span);
    return { span, ch, i, kern: 0, w: 0 };
  });

  el.setAttribute('aria-label', text);
  el.textContent = '';
  el.appendChild(wrap);

  letters.forEach((l) => {
    if (lefts) {
      const d = lefts[l.i] - l.span.getBoundingClientRect().left;
      if (Math.abs(d) > 0.05) {
        l.kern = Math.round(d * 100) / 100;
        l.span.style.marginLeft = `${l.kern}px`;
      }
    }
    l.w = l.span.getBoundingClientRect().width;
  });

  return { el, wrap, letters, n: letters.length, text, original, time: null, phase: null };
}

function unwrap(ctx) {
  ctx.el.textContent = ctx.original;
  ctx.el.removeAttribute('aria-label');
}

function getEffect(command) {
  const effect = EFFECTS[command];
  if (!effect) throw new Error(`word-performances: no effect for "${command}"`);
  return effect;
}

function restAt(effect) {
  return effect.kind === 'settle' ? 1 : 0;
}

function release(el) {
  const state = states.get(el);
  if (!state) return;
  states.delete(el);
  if (state.raf) cancelAnimationFrame(state.raf);
  unwrap(state.ctx);
  if (state.resolve) state.resolve();
}

function begin(el, command) {
  release(el);
  const effect = getEffect(command);
  const ctx = wrapWord(el);
  if (effect.setup) effect.setup(ctx);
  const state = { ctx, effect, raf: 0, resolve: null };
  states.set(el, state);
  return state;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pose the effect at `t` (0..1) with no animation. The word stays split
 * while it is posed away from rest and is restored when `t` reaches rest.
 */
export function set(el, command, t) {
  const effect = getEffect(command);
  const v = clamp01(Number(t) || 0);
  if (v === restAt(effect)) {
    release(el);
    return;
  }
  let state = states.get(el);
  if (!state || state.effect !== effect || state.raf) state = begin(el, command);
  state.ctx.time = null;
  state.ctx.phase = null;
  effect.frame(state.ctx, v);
}

/**
 * Perform the command's effect once on the element's text. Resolves when
 * the word is back at rest. Calling it again while running restarts it.
 */
export function perform(el, command, opts = {}) {
  const effect = getEffect(command);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced && !opts.force) {
    release(el);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const state = begin(el, command);
    state.resolve = resolve;
    const { ctx } = state;
    const { rise = 450, hold = 800, fall = 450, ease = 'out' } = effect.timing || {};
    const riseEase = ease === 'linear' ? (x) => x : easeOut;
    const pulse = effect.kind === 'pulse';
    const total = pulse ? rise + hold + fall : rise;
    let start = 0;

    ctx.phase = 'rise';
    ctx.time = 0;
    effect.frame(ctx, 0);

    const tick = (now) => {
      if (states.get(el) !== state) return;
      if (!start) start = now;
      const elapsed = now - start;
      ctx.time = elapsed;
      let t;
      if (elapsed < rise) {
        ctx.phase = 'rise';
        t = riseEase(elapsed / rise);
      } else if (!pulse || elapsed < rise + hold) {
        ctx.phase = 'hold';
        t = 1;
      } else {
        ctx.phase = 'fall';
        t = 1 - easeInOut(clamp01((elapsed - rise - hold) / fall));
      }
      effect.frame(ctx, t);
      if (elapsed >= total) {
        release(el);
        return;
      }
      state.raf = requestAnimationFrame(tick);
    };

    const go = () => {
      if (states.get(el) !== state) return;
      state.raf = requestAnimationFrame(tick);
    };
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(go);
    } else {
      go();
    }
  });
}

/**
 * Perform once when the element first enters the viewport, then again on
 * every mouseenter / focus, never more than once per 1.2 seconds. Returns a
 * function that detaches everything.
 */
export function attach(el, command, opts = {}) {
  const { onView = true, onHover = true } = opts;
  const settle = () => {
    if (document.fonts && document.fonts.status !== 'loaded') return document.fonts.ready;
    return Promise.resolve();
  };
  let last = -Infinity;
  const go = () => {
    const now = performance.now();
    if (now - last < 1200) return;
    last = now;
    settle().then(() => perform(el, command));
  };

  let observer = null;
  if (onView) {
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        observer = null;
        go();
      }, { threshold: 0.6 });
      observer.observe(el);
    } else {
      go();
    }
  }
  if (onHover) {
    el.addEventListener('mouseenter', go);
    el.addEventListener('focus', go);
  }

  return () => {
    if (observer) observer.disconnect();
    el.removeEventListener('mouseenter', go);
    el.removeEventListener('focus', go);
    release(el);
  };
}
