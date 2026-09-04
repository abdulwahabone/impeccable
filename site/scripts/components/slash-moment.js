// The slash moment on the docs index: the agent's composer types "/impeccable "
// and the whole command set unfolds beneath the cursor. Arrow, type or click
// to browse; the page on the left is the visitor's product (Ledger, an
// invoicing app) as it is, the page on the right is what the highlighted
// command makes of it. Return runs the command: the menu folds and the left
// page becomes the right one.
//
// The rows are rendered by SlashMoment.astro as links to /docs/<command>, so
// the menu is a real index without this script; the script adds the
// composer, the filter, the tour and the pages. A modifier-click on a row
// still follows the link.

import { COMMANDS, CAPTIONS, DEFAULT_INDEX } from '../../data/slash-moment.mjs';

/* ---- Ledger, the visitor's page ---- */
const D = {
  h1: 'Invoices that get paid.',
  p: 'Send an invoice in a minute. Track it until the money lands.',
  form: { label: 'Work email', value: 'mara@northwind.co', button: 'Create account' },
  cards: [['2,400', 'teams'], ['4.9', 'rating'], ['30 s', 'to first invoice']],
};

function page(o) {
  o = Object.assign({}, D, o);
  const links = o.links || ['Docs', 'Pricing', 'Sign in'];
  let h = '';
  if (o.nav !== false) h += `<div class="pg-nav"><i class="pg-logo"></i><b>${o.brand || 'Ledger'}</b>${o.burger ? '<span class="pg-burger"><i></i><i></i><i></i></span>' : `<span class="pg-links">${links.map((l) => `<a>${l}</a>`).join('')}</span>`}</div>`;
  if (o.top) h += o.top;
  if (o.h1) h += `<div class="pg-h1">${o.h1}</div>`;
  if (o.p) h += `<p class="pg-p">${o.p}</p>`;
  if (o.badges) h += `<div class="pg-badges">${o.badges.map((b) => `<span>${b}</span>`).join('')}</div>`;
  if (o.cta) h += `<div class="pg-cta">${o.cta.map((c, i) => `<span class="pg-btn${i ? '' : ' pri'}">${c}</span>`).join('')}</div>`;
  if (o.mid) h += o.mid;
  if (o.form) { const f = o.form; h += `<div class="pg-form"><label>${f.label}</label><span class="pg-in${f.bad ? ' bad' : ''}">${f.value}</span>${f.help ? `<span class="pg-help${f.err ? ' err' : ''}">${f.help}</span>` : ''}<span class="pg-btn pri wide">${f.button}${f.det || ''}</span></div>`; }
  if (o.cards) h += `<div class="pg-cards">${o.cards.map((c, i) => `<div class="pg-card" style="--n:${i}"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('')}</div>`;
  if (o.foot) h += `<div class="pg-foot">${o.foot.map((f) => `<span>${f}</span>`).join('')}</div>`;
  if (o.extra) h += o.extra;
  if (o.cap) h += `<span class="pg-cap">${o.cap}</span>`;
  return [o.cls || '', h];
}

const tree = (withProduct) => `<div class="pg-file"><span class="k">ledger/</span>
  <span class="k">src/</span>
    components/
    pages/
      signup.tsx
      invoices.tsx
    styles/
  ${withProduct ? '<span class="new">PRODUCT.md</span>\n  <span class="new">DESIGN.md</span>\n  ' : ''}package.json
  README.md</div>`;

const DEMO = {
  impeccable: [page({ cls: 't-raw', links: ['Docs', 'Pricing', 'Sign in'], cards: [['2400', 'teams'], ['4.9', 'rating'], ['30s', 'to first invoice']], cap: 'unstyled markup' }), page({})],
  shape: [page({ nav: false, h1: '', p: '', form: false, cards: false, extra: '<div class="pg-blank"><div>signup.tsx, empty</div></div>' }),
    page({ nav: false, h1: '', p: '', form: false, cards: false, top: '<div class="pg-title"><b>Brief</b> signup</div><div class="pg-file"><span class="h">Who</span>   freelancers who invoice monthly\n<span class="h">Job</span>   first invoice out in under a minute\n<span class="h">Proof</span> teams, rating, time to value\n<span class="h">Tone</span>  calm, exact, no hype</div><div class="pg-wire"><div>nav</div><div>headline, one line of promise</div><div>form, email, one button</div><div class="two"><div>proof</div><div>proof</div></div></div>' })],
  critique: [page({}), page({ h1: 'Invoices that get paid.<i class="pg-pin">1</i>', form: { label: 'Work email<i class="pg-pin">2</i>', value: 'mara@northwind.co', button: 'Create account' }, cards: [['2,400', 'teams'], ['4.9', 'rating<i class="pg-pin">3</i>'], ['30 s', 'to first invoice']], extra: '<ol class="pg-notes"><li><i class="pg-pin">1</i>Headline and nav compete for the first read</li><li><i class="pg-pin">2</i>The form asks before the page has earned it</li><li><i class="pg-pin">3</i>Proof row is decoration, not evidence</li></ol><div class="pg-score"><span>Hierarchy <b>6</b></span><span>Clarity <b>7</b></span><span>Emotion <b>4</b></span><span><b>58</b>/100</span></div>' })],
  audit: [page({ p: '<span style="color:oklch(72% 0 0)">Send an invoice in a minute. Track it until the money lands.</span>', links: ['<span style="font-size:10px">Docs</span>', '<span style="font-size:10px">Pricing</span>', '<span style="font-size:10px">Sign in</span>'], form: { label: 'Work email', value: 'mara@northwind.co', button: '→' } }),
    page({ p: '<span style="color:oklch(72% 0 0)">Send an invoice in a minute. Track it until the money lands.</span><span class="pg-det">contrast 2.8:1</span>', links: ['<span style="font-size:10px">Docs</span>', '<span style="font-size:10px">Pricing</span>', '<span style="font-size:10px">Sign in</span><span class="pg-det">target 18px</span>'], form: { label: 'Work email', value: 'mara@northwind.co', button: '→', det: '<span class="pg-det">no label</span>' }, extra: '<div class="pg-score"><span><b>3</b> findings</span><span>P0 <b>1</b></span><span>P1 <b>2</b></span><span>score <b>71</b></span></div>' })],
  typeset: [page({ cls: 't-flat' }), page({})],
  layout: [page({ cls: 't-cramped', foot: ['Privacy', 'Terms', 'Status'] }), page({ foot: ['Privacy', 'Terms', 'Status'] })],
  colorize: [page({ cls: 't-gray' }), page({ cls: 't-color', h1: 'Invoices that <em>get paid.</em>' })],
  animate: [page({ cap: 'static' }), page({ cls: 't-motion' })],
  delight: [page({ h1: 'Dashboard', p: 'You have 3 invoices.', form: false, cards: [['12', 'sent'], ['9', 'paid'], ['3', 'overdue']], cta: ['New invoice'] }),
    page({ h1: 'Morning, Mara.', p: 'Two invoices got paid while you slept. Coffee first, then the third.', form: false, cards: [['12', 'sent'], ['9 <span class="pg-up">+2</span>', 'paid'], ['1', 'left to chase']], cta: ['New invoice', 'Chase Northwind'] })],
  bolder: [page({ cls: 't-timid' }), page({ cls: 't-bold' })],
  quieter: [page({ cls: 't-loud', h1: 'Invoices that <em>get paid</em>', badges: ['NEW', 'HOT', 'FREE'], cards: [['2,400', 'teams'], ['4.9', 'rating'], ['30 s', 'to first invoice']] }), page({})],
  overdrive: [page({}), page({ cls: 't-over', top: '<div class="pg-sky"><i></i><i></i><i></i></div>' })],
  distill: [page({ cls: 't-clutter', links: ['Product', 'Docs', 'Pricing', 'Blog', 'Login'], badges: ['SOC 2', 'GDPR', '4.9 ★', 'No card needed'], cta: ['Start free', 'Book a demo', 'Watch video'], foot: ['Twitter', 'LinkedIn', 'GitHub', 'Privacy', 'Terms'] }),
    page({ cls: 't-min', links: [], h1: 'Invoices that get paid.', p: 'Send one in a minute.', cta: ['Start free'], form: false, cards: false })],
  clarify: [page({ form: { label: 'Email*', value: 'mara@northwindco', bad: true, help: 'ERR_VALIDATION: invalid input', err: true, button: 'Submit' } }),
    page({ form: { label: 'Work email', value: 'mara@northwindco', help: 'That address is missing a dot. Did you mean northwind.co?', button: 'Create account' } })],
  adapt: [page({ cls: 't-desk', links: ['Product', 'Docs', 'Pricing', 'Blog', 'Sign in'], h1: 'Invoices that get paid.', form: { label: 'Work email', value: 'mara@northwind.co', button: 'Create account' }, cards: [['2,400', 'teams worldwide'], ['4.9', 'average rating'], ['30 s', 'to first invoice']] }),
    page({ cls: 't-mobile', burger: true })],
  polish: [page({ cls: 't-rough', foot: ['Privacy', 'Terms', 'Status'] }), page({ foot: ['Privacy', 'Terms', 'Status'] })],
  optimize: [page({ form: false, mid: '<div class="pg-img"><span class="spin"></span></div><div class="pg-meter slow"><i></i></div><div class="pg-meta"><span>hero.png</span><span>3.8 MB, 4.2 s</span></div>', cards: [['2,400', 'teams'], ['4.9', 'rating'], ['30 s', 'to first invoice']] }),
    page({ form: false, mid: '<div class="pg-img done"></div><div class="pg-meter"><i style="width:100%"></i></div><div class="pg-meta"><span>hero.avif</span><span>142 KB, 0.3 s</span></div>', cards: [['2,400', 'teams'], ['4.9', 'rating'], ['30 s', 'to first invoice']] })],
  harden: [page({ cls: 't-fragile', brand: 'Buchhaltungsabteilung Nordwind GmbH', form: { label: 'Geschäftliche E-Mail-Adresse', value: 'mara.lindqvist-oberhausen@nordwind-buchhaltung.de', button: 'Rechnung erstellen und sofort versenden' }, cards: false, extra: '<div class="pg-cards"></div>' }),
    page({ cls: 't-solid', brand: 'Buchhaltungsabteilung Nordwind GmbH', form: { label: 'Geschäftliche E-Mail-Adresse', value: 'mara.lindqvist-oberhausen@nordwind-buchhaltung.de', button: 'Rechnung erstellen und sofort versenden' }, cards: false, extra: '<div class="pg-empty">Noch keine Rechnungen. Die erste dauert eine Minute.</div>' })],
  onboard: [page({ cls: 't-empty', h1: 'Invoices', p: '', form: false, cards: false, extra: '<div class="pg-empty">No data</div>' }),
    page({ cls: 't-onboard', h1: 'Welcome, Mara.', p: 'Three steps to your first paid invoice.', form: false, cards: false, extra: '<ol class="pg-check"><li class="done"><i>✓</i>Add your business</li><li><i></i>Add a client</li><li><i></i>Send an invoice</li></ol><div class="pg-cta"><span class="pg-btn pri">Add a client</span></div>' })],
  init: [page({ nav: false, h1: '', p: '', form: false, cards: false, top: '<div class="pg-title"><b>ledger</b> project</div>' + tree(false), cap: 'no product context' }),
    page({ nav: false, h1: '', p: '', form: false, cards: false, top: '<div class="pg-title"><b>ledger</b> project</div>' + tree(true) + '<div class="pg-file pg-file--sep"><span class="h">## Register</span>\nproduct\n<span class="h">## Platform</span>\nweb\n<span class="h">## Users</span>\nFreelancers who invoice monthly and\nhate chasing money.</div>' })],
  extract: [page({ h1: 'Buttons', p: 'Five styles across twelve files.', form: false, cards: false, mid: '<div class="pg-drift"><span class="pg-btn">Save</span><span class="pg-btn">Send invoice</span><span class="pg-btn">Cancel</span><span class="pg-btn">Export</span><span class="pg-btn">Learn more</span></div>' }),
    page({ h1: 'Button', p: 'One component, three variants.', form: false, cards: false, mid: '<div class="pg-sys"><span class="pg-btn">Primary</span><span class="pg-btn sec">Secondary</span><span class="pg-btn ter">Tertiary</span></div><div class="pg-tokens"><span><span class="k">--radius-md</span>  6px</span><span><span class="k">--color-primary</span>  oklch(46% .15 258)</span><span><span class="k">--control-h</span>  32px</span><span><span class="k">--space-2</span>  8px</span></div>' })],
  document: [page({ cap: 'no DESIGN.md' }),
    page({ nav: false, h1: '', p: '', form: false, cards: false, top: '<div class="pg-title"><b>DESIGN.md</b> ledger</div><div class="pg-file"><span class="h">## Color</span></div><div class="pg-swatches"><i style="background:oklch(46% .15 258)"></i><i style="background:oklch(93% .03 258)"></i><i style="background:oklch(13% 0 0)"></i><i style="background:oklch(46% 0 0)"></i><i style="background:oklch(95% 0 0)"></i></div><div class="pg-file"><span class="h">## Type</span></div><div class="pg-scale"><span><em>display</em><span class="pg-scale-display">Alumni Sans 300</span></span><span><em>body</em><span class="pg-scale-body">Albert Sans 400</span></span><span><em>label</em><span class="pg-scale-label">JetBrains Mono 500</span></span></div><div class="pg-file"><span class="h">## Atmosphere</span>\nQuiet, exact, unhurried. Color\nmarks the one thing that matters.\n<span class="h">## Spacing</span>  4 · 8 · 16 · 24 · 32</div>' })],
  live: [page({}), page({ cls: 't-live', h1: '<span class="pg-sel-lbl">h1</span><span class="pg-sel">Invoices that get paid.</span>', extra: '<div class="pg-picker"><i></i>typeset<span>A</span><span class="on">B</span><span>C</span></div>' })],
};

export function initSlashMoment() {
  const root = document.querySelector('[data-slash-moment]');
  if (!root) return;
  const $ = (name) => root.querySelector(`[data-sm="${name}"]`);
  const stage = $('stage'), menu = $('menu'), wrap = $('menu-wrap'), input = $('input');
  const typed = $('typed'), ghost = $('ghost'), caret = $('caret'), hint = $('hint'), led = $('led'), pre = $('pre');
  const beforePage = $('before-page'), afterPage = $('after-page');
  const beforeCap = $('before-cap'), afterCap = $('after-cap'), beforeTag = $('before-tag');
  const desc = $('desc'), pairs = $('pairs'), docsLink = $('docs-link');
  const rows = Array.from(menu.querySelectorAll('[data-sm-row]'));
  if (!stage || !rows.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PRE = '/impeccable ';
  const HINT_IDLE = '<span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> run</span><span><kbd>esc</kbd> clear</span>';
  let q = '', hi = DEFAULT_INDEX, open = false, running = false, tour = null, userTouched = false, last = null;

  root.classList.add('is-scripted');

  rows.forEach((r) => {
    r.addEventListener('mouseenter', () => { touch(); setHi(+r.dataset.i); });
    r.addEventListener('click', (e) => {
      // A modifier-click is a request for the docs page; leave the link alone.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      touch(); setHi(+r.dataset.i); commit();
    });
  });

  const visible = () => rows.filter((r) => !r.hidden);

  function filter() {
    const s = q.trim().toLowerCase();
    rows.forEach((r) => { r.hidden = !!s && !COMMANDS[+r.dataset.i].name.includes(s); });
    const vis = visible();
    menu.classList.toggle('is-empty', vis.length === 0);
    if (vis.length) {
      const pref = vis.find((r) => COMMANDS[+r.dataset.i].name.startsWith(s));
      const keep = vis.find((r) => +r.dataset.i === hi);
      setHi(+(s ? (pref || vis[0]) : (keep || vis[0])).dataset.i);
    } else {
      ghost.textContent = '';
    }
    layoutCaps();
  }

  // Group captions sit in the margin beside the first visible row of their
  // group, set like folio notes.
  function layoutCaps() {
    const top = menu.getBoundingClientRect().top;
    root.querySelectorAll('[data-sm-cap]').forEach((c) => {
      const first = rows.find((r) => r.dataset.g === c.dataset.smCap && !r.hidden);
      if (!first) { c.hidden = true; return; }
      c.hidden = false;
      c.style.top = `${first.getBoundingClientRect().top - top}px`;
    });
  }

  function setHi(n) {
    hi = n;
    rows.forEach((r) => {
      const on = +r.dataset.i === n;
      r.classList.toggle('is-on', on);
      r.setAttribute('aria-selected', String(on));
    });
    const c = COMMANDS[n];
    const s = q.trim();
    ghost.textContent = open && c.name.startsWith(s) ? c.name.slice(s.length) : '';
    render(c);
  }

  function paint(el, state) {
    el.className = `pg ${state[0]}`;
    el.innerHTML = state[1];
    el.classList.remove('is-swapping');
    void el.offsetWidth;
    el.classList.add('is-swapping');
  }

  function render(c) {
    if (last === c.name) return;
    last = c.name;
    const [b, a] = DEMO[c.name];
    paint(beforePage, b);
    paint(afterPage, a);
    beforeCap.textContent = CAPTIONS[c.name][0];
    afterCap.textContent = CAPTIONS[c.name][1];
    desc.innerHTML = `<b>/${c.name}</b> ${c.long}`;
    pairs.innerHTML = c.pairs.map((p) => `<button type="button" data-p="${p}">/${p}</button>`).join('');
    docsLink.href = `/docs/${c.name}`;
    docsLink.textContent = `Read /${c.name}`;
  }

  pairs.addEventListener('click', (e) => {
    const p = e.target.closest('[data-p]')?.dataset.p;
    if (!p) return;
    touch();
    if (!open) reopen();
    q = ''; input.value = ''; typed.textContent = '';
    filter();
    setHi(COMMANDS.findIndex((c) => c.name === p));
  });

  // Caret rhythm: solid while typing, blinking when idle.
  let solidTimer;
  function tick() {
    caret.classList.add('is-solid');
    clearTimeout(solidTimer);
    solidTimer = setTimeout(() => caret.classList.remove('is-solid'), 420);
  }

  // Opening: the composer types the prefix, the menu unfolds on the space.
  function boot() {
    if (reduced) { pre.textContent = PRE; openMenu(); setHi(hi); return; }
    pre.textContent = '';
    let k = 0;
    const step = () => {
      if (k < PRE.length) {
        pre.textContent += PRE[k++];
        tick();
        setTimeout(step, k === 1 ? 260 : 52 + Math.random() * 70);
      } else {
        openMenu(); setHi(hi); startTour();
      }
    };
    setTimeout(step, 420);
  }

  function openMenu() {
    open = true;
    wrap.classList.remove('is-closed');
    menu.classList.add('is-unfolding');
    setTimeout(() => menu.classList.remove('is-unfolding'), 700);
    layoutCaps();
    setHi(hi);
  }

  function closeMenu() {
    open = false;
    wrap.classList.add('is-closed');
    ghost.textContent = '';
  }

  // Idle tour: the highlight walks the list until someone touches it.
  function startTour() {
    stopTour();
    if (reduced) return;
    tour = setInterval(() => {
      if (!open || running) return;
      const vis = visible();
      const idx = vis.findIndex((r) => +r.dataset.i === hi);
      setHi(+vis[(idx + 1) % vis.length].dataset.i);
    }, 2400);
  }
  function stopTour() { clearInterval(tour); tour = null; }
  function touch() { if (userTouched) return; userTouched = true; stopTour(); }

  function move(d) {
    const vis = visible();
    if (!vis.length) return;
    const idx = vis.findIndex((r) => +r.dataset.i === hi);
    setHi(+vis[(idx + d + vis.length) % vis.length].dataset.i);
  }

  stage.addEventListener('keydown', (e) => {
    const typing = e.key.length === 1 || e.key === 'Backspace';
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape' || typing) {
      touch();
      if (document.activeElement !== input) input.focus({ preventScroll: true });
    }
    if (running) return;
    if (!open && (e.key.length === 1 || e.key === 'Enter')) {
      reopen();
      if (e.key === 'Enter') { e.preventDefault(); return; }
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); q = ''; input.value = ''; typed.textContent = ''; filter(); }
    else if (e.key === 'Tab' && ghost.textContent) { e.preventDefault(); q = COMMANDS[hi].name; input.value = q; typed.textContent = q; filter(); }
  });

  input.addEventListener('input', () => {
    if (running) return;
    q = input.value.replace(/^\/?(impeccable\s*)?/, '').replace(/\s+$/, '');
    typed.textContent = q;
    tick();
    filter();
  });

  $('composer').addEventListener('click', () => {
    touch();
    stage.focus({ preventScroll: true });
    input.focus({ preventScroll: true });
    if (!open && !running) reopen();
  });
  stage.addEventListener('mousemove', touch, { once: true });
  stage.addEventListener('focus', () => { if (!running) input.focus({ preventScroll: true }); });

  function reopen() {
    running = false;
    hint.classList.remove('is-status');
    hint.innerHTML = HINT_IDLE;
    led.classList.remove('is-busy');
    q = ''; input.value = ''; typed.textContent = '';
    beforeTag.textContent = 'Before';
    filter();
    openMenu();
    render(COMMANDS[hi]);
  }

  // Return: the menu folds, the agent runs, the page on the left becomes the
  // page on the right.
  function commit() {
    const c = COMMANDS[hi];
    if (!c || running) return;
    running = true;
    q = c.name; input.value = q; typed.textContent = q; ghost.textContent = '';
    tick();
    closeMenu();
    led.classList.add('is-busy');
    hint.classList.add('is-status');
    hint.innerHTML = `<span>running <b>/${c.name}</b></span>`;
    const [, a] = DEMO[c.name];
    const wait = reduced ? 0 : 900;
    setTimeout(() => {
      beforePage.classList.add('is-fading');
      setTimeout(() => {
        paint(beforePage, a);
        beforePage.classList.remove('is-fading');
        beforeTag.textContent = 'Now';
        beforeCap.textContent = CAPTIONS[c.name][1];
        led.classList.remove('is-busy');
        hint.innerHTML = `<span><b>/${c.name}</b> done</span><span><kbd>/</kbd> run another</span>`;
      }, reduced ? 0 : 220);
    }, wait);
    // In tour mode, come back on our own.
    if (!userTouched) setTimeout(() => { if (running && !userTouched) { reopen(); startTour(); } }, 4200);
  }

  window.addEventListener('resize', layoutCaps);
  if (document.fonts?.ready) document.fonts.ready.then(boot); else boot();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSlashMoment);
  else initSlashMoment();
}
