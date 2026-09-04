/**
 * The command console (site/components/CommandConsole.astro).
 *
 * Twenty three channels, one subject. A fader sets --amt on the subject and
 * the CSS does the rest; the animate and overdrive channels drive WAAPI
 * timelines that the fader scrubs. Keys are discrete: press for 1, press
 * again for 0. The console is solo: selecting a channel glides every other
 * one home.
 *
 * Each fader's engraved label performs its own command as the cap moves
 * (word-performances.js `set`), and a key's label performs once when it is
 * pressed. A few effects do not survive 10px and are skipped; see SKIP.
 *
 * Deep links: #cmd-<name> selects that channel on load. Other components
 * select a channel by dispatching `impeccable:select-command` with the id;
 * the console answers every selection with `impeccable:command-selected`.
 */
import { CONSOLE_COMMANDS, DEFAULT_CHANNEL } from '../../data/console-channels.mjs';
import { set as poseWord, perform as performWord, COMMANDS as PERFORMED } from '../word-performances.js';

const byId = Object.fromEntries(CONSOLE_COMMANDS.map((c) => [c[0], c]));

/* Effects that do not read at 10px mono: 1px grid lines between 6px letters
   (layout), a 6px blur that reads as a rendering glitch (clarify), a text
   stroke that fills the counters (shape, harden), 1.3px check boxes (audit),
   and letters swapping to a 4px mono (document). */
const SKIP = new Set(['layout', 'clarify', 'shape', 'harden', 'audit', 'document']);

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const TRAVEL = 90;

export function initCommandConsole() {
  const root = document.querySelector('[data-command-console]');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = 'true';

  const q = (sel) => root.querySelector(sel);
  const ui = q('[data-cc-ui]');
  const well = q('[data-cc-well]');
  const overlays = [...root.querySelectorAll('[data-cc-ov]')];
  const readout = {
    kindTag: q('[data-cc-r-kind-tag]'),
    group: q('[data-cc-r-group]'),
    name: q('[data-cc-r-name]'),
    cmd: q('[data-cc-r-cmd]'),
    desc: q('[data-cc-r-desc]'),
    docs: q('[data-cc-r-docs]'),
    patch: q('[data-cc-r-patch]'),
  };
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the controls, by command
  const ctl = {};
  root.querySelectorAll('[data-cmd]').forEach((node) => { ctl[node.dataset.cmd] = node; });
  const isFader = (node) => node.classList.contains('cc-ch');
  const labelOf = (node) => node.querySelector('.cc-lbl');
  const amtOf = (node) => parseFloat(node.style.getPropertyValue('--amt') || 0);

  /* ---- the labels perform their command ---- */
  const canPerform = (id) => PERFORMED.includes(id) && !SKIP.has(id);
  // Put a label back at rest. `set` releases at the effect's rest value,
  // which is 0 for a pulse and 1 for a settle; the split word carries an
  // aria-label, so the one that did not release is the one to call again.
  const restLabel = (node, id) => {
    const el = labelOf(node);
    // a label that is not split is already at rest
    if (!el || !canPerform(id) || !el.hasAttribute('aria-label')) return;
    poseWord(el, id, 0);
    if (el.hasAttribute('aria-label')) poseWord(el, id, 1);
  };
  const poseLabel = (node, id, v) => {
    const el = labelOf(node);
    if (!el || !canPerform(id)) return;
    if (v <= 0.02) restLabel(node, id);
    else poseWord(el, id, v);
  };
  const performLabel = (node, id) => {
    const el = labelOf(node);
    if (!el || !canPerform(id)) return;
    performWord(el, id);
  };

  /* ---- scrubbable timelines (animate, overdrive) ----
     A fader is a timeline scrubber: dragging sets currentTime, a jump plays
     at real speed, exit runs faster than entrance. */
  function makeTimeline(build, duration) {
    let anims = null;
    let cur = 0;
    let raf = 0;
    const ensure = () => {
      if (anims) return;
      anims = build().map(([el, k, o]) => {
        const a = el.animate(k, Object.assign({ fill: 'both' }, o));
        a.pause();
        return a;
      });
    };
    const apply = (t) => { ensure(); cur = t; anims.forEach((a) => { a.currentTime = t; }); };
    return {
      scrub(v) { cancelAnimationFrame(raf); apply(v * duration); },
      seek(v) {
        cancelAnimationFrame(raf);
        const target = v * duration;
        let last = performance.now();
        const step = (now) => {
          const dt = now - last;
          last = now;
          const back = target < cur;
          const next = back ? Math.max(target, cur - dt * 1.6) : Math.min(target, cur + dt);
          apply(next);
          if (next !== target) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      reset() {
        cancelAnimationFrame(raf);
        cur = 0;
        if (anims) { anims.forEach((a) => a.cancel()); anims = null; }
      },
    };
  }
  const rows = [...ui.querySelectorAll('.fn-list > .fn-li:not(.fn-li--ghost)')];
  // spring: damping ratio .5, settles inside the window, overshoots by about
  // 16% (8px on a 51px shift)
  const spring = (t) => {
    const z = 0.5;
    const w = 10;
    const wd = w * Math.sqrt(1 - z * z);
    const s = t * 0.75;
    return 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z * w / wd) * Math.sin(wd * s));
  };
  const TL = {
    animate: makeTimeline(() => rows.map((r, i) => [
      r,
      RM ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 380, delay: i * 70, easing: EASE },
    ]), 520),
    overdrive: makeTimeline(() => {
      const fly = q('[data-cc-fly]');
      const wrap = q('[data-cc-fresh-wrap]');
      const fresh = q('[data-cc-fresh]');
      const typed = q('[data-cc-typed]');
      const btn = q('[data-cc-btn]');
      // measure the flight: where the chip starts against where the fresh
      // row's avatar lands
      wrap.style.gridTemplateRows = '1fr';
      const k = ui.getBoundingClientRect().width / ui.offsetWidth || 1;
      const D = RM ? 0 : (fresh.querySelector('.fn-av').getBoundingClientRect().top - fly.querySelector('.fn-av').getBoundingClientRect().top) / k;
      wrap.style.gridTemplateRows = '';
      const H = fresh.offsetHeight || 51;
      // the room the new row takes opens on the same spring the chip rides,
      // so the list overshoots with it and the card breathes once
      const N = 32;
      const flight = [];
      const room = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const sv = RM ? u : spring(u);
        flight.push({ offset: u, transform: `translateY(${(D * sv).toFixed(2)}px)` });
        room.push({ offset: u, gridTemplateRows: `${Math.max(0, H * sv).toFixed(2)}px` });
      }
      const win = { duration: 750, delay: 100, easing: 'linear' };
      return [
        [btn, [{ transform: 'scale(1)' }, { transform: 'scale(.96)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 160, composite: 'add' }],
        [typed, [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 160 }],
        [fly, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.86 }, { opacity: 0 }], { duration: 950, easing: 'linear' }],
        [fly, flight, win],
        [wrap, room, win],
        [fresh, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: 820 }],
        [ui, [{ '--od-seat': 0 }, { '--od-seat': 1 }], { duration: 150, delay: 850 }],
      ];
    }, 1000),
  };

  /* ---- state ---- */
  let active = null;

  function setAmt(v, instant) {
    v = Math.max(0, Math.min(1, v));
    ui.style.setProperty('--amt', v);
    overlays.forEach((o) => o.style.setProperty('--p', o.dataset.ccOv === active ? v : 0));
    const node = ctl[active];
    if (node && isFader(node)) {
      node.style.setProperty('--amt', v);
      node.setAttribute('aria-valuenow', Math.round(v * 100));
      poseLabel(node, active, v);
    }
    if (node && !isFader(node)) node.setAttribute('aria-pressed', String(v > 0.5));
    if (node) node.classList.toggle('is-on', v > 0.02);
    const tl = TL[active];
    if (tl) (ui.classList.contains('is-dragging') || instant) ? tl.scrub(v) : tl.seek(v);
  }

  function select(id, { announce = true } = {}) {
    if (active === id || !byId[id]) return;
    // solo: every other control glides home
    Object.entries(ctl).forEach(([k, n]) => {
      if (k === id) return;
      n.classList.remove('is-on', 'is-dragging');
      n.style.setProperty('--amt', '0');
      if (isFader(n)) { n.setAttribute('aria-valuenow', '0'); restLabel(n, k); }
      else n.setAttribute('aria-pressed', 'false');
    });
    if (TL[active]) TL[active].reset();
    active = id;
    const c = byId[id];
    ui.dataset.fx = id;
    overlays.forEach((o) => { if (o.dataset.ccOv === 'impeccable') o.classList.toggle('is-on', id === 'impeccable'); });
    readout.kindTag.textContent = c[2];
    readout.group.textContent = c[1];
    readout.name.textContent = id;
    readout.cmd.textContent = `/impeccable ${id}`;
    readout.desc.textContent = c[3];
    readout.docs.href = `/docs/${id}`;
    readout.patch.replaceChildren(...c[4].map((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cc-jack';
      b.dataset.to = r;
      b.innerHTML = '<i></i>';
      const s = document.createElement('span');
      s.textContent = r;
      b.appendChild(s);
      return b;
    }));
    if (announce) window.dispatchEvent(new CustomEvent('impeccable:command-selected', { detail: { id } }));
  }

  function pressKey(id) {
    const node = ctl[id];
    if (active === id && node.classList.contains('is-on')) { setAmt(0); node.classList.remove('is-on'); return; }
    select(id);
    ui.classList.remove('is-dragging');
    setAmt(1);
    performLabel(node, id);
  }

  function wireFader(node, id) {
    let drag = false;
    let rect = null;
    let off = 0;
    const fromY = (y) => (rect.bottom - 7 - y) / TRAVEL;
    node.addEventListener('pointerdown', (e) => {
      drag = true;
      rect = node.querySelector('.cc-trk').getBoundingClientRect();
      node.setPointerCapture(e.pointerId);
      select(id);
      node.classList.add('is-dragging');
      ui.classList.add('is-dragging');
      // grab the cap where it is and keep the hand's offset; a press
      // elsewhere on the track jumps there
      const cur = amtOf(node);
      const t = fromY(e.clientY);
      if (Math.abs(t - cur) > 0.12) { off = 0; setAmt(t, true); } else { off = cur - t; }
    });
    node.addEventListener('pointermove', (e) => { if (drag) setAmt(fromY(e.clientY) + off, true); });
    const up = () => {
      if (!drag) return;
      drag = false;
      node.classList.remove('is-dragging');
      ui.classList.remove('is-dragging');
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('keydown', (e) => {
      const cur = active === id ? amtOf(node) : 0;
      const step = e.shiftKey ? 0.25 : 0.1;
      let v = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v = cur + step;
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v = cur - step;
      if (e.key === 'Home') v = 0;
      if (e.key === 'End') v = 1;
      if (v === null) return;
      e.preventDefault();
      select(id);
      node.classList.remove('is-dragging');
      ui.classList.remove('is-dragging');
      setAmt(v);
    });
    node.addEventListener('dblclick', () => { select(id); setAmt(1); });
  }

  Object.entries(ctl).forEach(([id, node]) => {
    if (isFader(node)) wireFader(node, id);
    else node.addEventListener('click', () => pressKey(id));
  });

  readout.patch.addEventListener('click', (e) => {
    const j = e.target.closest('.cc-jack');
    if (!j) return;
    const to = j.dataset.to;
    select(to);
    ui.classList.remove('is-dragging');
    setAmt(1);
    if (!isFader(ctl[to])) performLabel(ctl[to], to);
    ctl[to].focus({ preventScroll: true });
  });

  /* ---- bypass: hold to see the untouched subject. Pointer and keyboard,
     press and release. ---- */
  const byp = q('[data-cc-bypass]');
  let held = 0;
  const hold = (on) => {
    if (on === held) return;
    held = on;
    byp.classList.toggle('is-held', !!on);
    byp.setAttribute('aria-pressed', String(!!on));
    const node = ctl[active];
    const v = node && isFader(node) ? amtOf(node) : (node && node.classList.contains('is-on') ? 1 : 0);
    ui.classList.remove('is-dragging');
    ui.style.setProperty('--amt', on ? 0 : v);
    overlays.forEach((o) => o.style.setProperty('--p', o.dataset.ccOv === active ? (on ? 0 : v) : 0));
    const tl = TL[active];
    if (tl) on ? tl.scrub(0) : tl.seek(v);
  };
  byp.addEventListener('pointerdown', (e) => { byp.setPointerCapture(e.pointerId); hold(1); });
  byp.addEventListener('pointerup', () => hold(0));
  byp.addEventListener('pointercancel', () => hold(0));
  byp.addEventListener('lostpointercapture', () => hold(0));
  byp.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(1); } });
  byp.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') hold(0); });
  byp.addEventListener('blur', () => hold(0));

  /* ---- stacked layout: the stage scales to the window ---- */
  const STAGE_W = 600;
  const fit = () => {
    const w = well.clientWidth;
    root.style.setProperty('--cc-fit', String(Math.min(1, (w - 24) / STAGE_W)));
  };
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(well);
  fit();

  /* ---- selection from outside: deep links and other components ---- */
  const bring = (id, { scroll = true, focus = false } = {}) => {
    if (!byId[id]) return false;
    select(id, { announce: false });
    ui.classList.remove('is-dragging');
    setAmt(1);
    if (!isFader(ctl[id])) performLabel(ctl[id], id);
    if (scroll) root.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
    if (focus) ctl[id].focus({ preventScroll: true });
    return true;
  };
  window.addEventListener('impeccable:select-command', (e) => {
    const id = e.detail?.id;
    if (bring(id, { focus: true })) window.dispatchEvent(new CustomEvent('impeccable:command-selected', { detail: { id } }));
  });
  const fromHash = () => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith('cmd-')) return false;
    // the page's own anchor jump handles the scroll; only select here
    return bring(hash.slice(4), { scroll: false });
  };
  window.addEventListener('hashchange', () => fromHash());

  // initial state: the default channel up, unless the URL names another
  if (!fromHash()) {
    select(root.dataset.start || DEFAULT_CHANNEL, { announce: false });
    setAmt(1, true);
  }
}
