// The hero's patch cable: the v of "vocabulary" becomes a cable that plugs
// into the command switcher.
//
// The demo sits left of a centre spine and the text right of it. The left
// arm of the v continues past its top terminal, swings round and drops as a
// cable across the spine into a socket on the right end of the switcher
// strip. The stroke starts at the glyph's own weight and colour and fades
// to cable grey (a gradient in user space, set from the endpoints), so the
// letter and the cable read as one line. Redraws on resize, on font load
// and when the strip moves; the socket's pin lights gold once plugged in.

function glyphTerminal(vEl, hero) {
	// Where the left arm of the v ends at the top: measured from the font,
	// not guessed. The span wraps only the v.
	const r = vEl.getBoundingClientRect();
	const h = hero.getBoundingClientRect();
	const cs = getComputedStyle(vEl);
	const canvas = glyphTerminal.canvas || (glyphTerminal.canvas = document.createElement('canvas'));
	const ctx = canvas.getContext('2d');
	ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
	const m = ctx.measureText('v');
	const asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.9;
	const desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.25;
	const baseline = r.top + (r.height - (asc + desc)) / 2 + asc;
	const top = baseline - (m.actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.5);
	const left = r.left + (m.actualBoundingBoxLeft ? -m.actualBoundingBoxLeft : 0);
	// Stem weight of the face at this size: the cable starts at that width.
	const stroke = Math.max(2, Math.min(4, parseFloat(cs.fontSize) * 0.036));
	return { x: left - h.left + stroke * 0.5, y: top - h.top + stroke * 0.5, stroke };
}

function measure(hero, vEl, to, avoid) {
	const h = hero.getBoundingClientRect();
	const b = to.getBoundingClientRect();
	const t = glyphTerminal(vEl, hero);
	// The socket sits on the strip's right end, mid height.
	const bx = b.right - h.left + 6;
	const by = b.top - h.top + b.height / 2;
	let keepOut = null;
	if (avoid) {
		const r = avoid.getBoundingClientRect();
		if (r.width && r.height) keepOut = { left: r.left - h.left - 8, top: r.top - h.top - 8, right: r.right - h.left + 8, bottom: r.bottom - h.top + 8 };
	}
	return { t, bx, by, keepOut, w: h.width, hh: h.height };
}

// The path: continue the arm up and to the left for a short run (the v's
// left arm rises to the left), then a cubic that swings left and drops into
// the socket from the right with a little slack.
function build(m, k) {
	const { t, bx, by } = m;
	const armLen = 14;
	const ax = t.x - armLen * 0.36;
	const ay = t.y - armLen;
	const dx = ax - bx;
	const dy = by - ay;
	// Keep rising for a moment past the arm, then one long sweep down that
	// arrives at the socket level from the right: a cable's S, not a hook.
	const c1x = ax - dx * k.exit;
	const c1y = ay - Math.min(72, Math.max(36, dy * 0.28));
	const c2x = bx + dx * k.enter;
	const c2y = by + 2 * k.sag;
	const d = `M ${t.x.toFixed(1)} ${t.y.toFixed(1)} L ${ax.toFixed(1)} ${ay.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${bx.toFixed(1)} ${by.toFixed(1)}`;
	return { d, ax, ay, c1x, c1y, c2x, c2y };
}

const SHAPES = [
	{ exit: 0.25, enter: 0.9, sag: 1 },
	{ exit: 0.1, enter: 1.2, sag: 1 },
	{ exit: 0.05, enter: 1.6, sag: 1 },
];

function crosses(m, c, box) {
	if (!box) return false;
	for (let i = 0; i <= 48; i++) {
		const tt = i / 48, u = 1 - tt;
		const x = u * u * u * c.ax + 3 * u * u * tt * c.c1x + 3 * u * tt * tt * c.c2x + tt * tt * tt * m.bx;
		const y = u * u * u * c.ay + 3 * u * u * tt * c.c1y + 3 * u * tt * tt * c.c2y + tt * tt * tt * m.by;
		if (x > box.left && x < box.right && y > box.top && y < box.bottom) return true;
	}
	return false;
}

export function initHeroCable() {
	const hero = document.querySelector('.hero-rebuild');
	const svg = hero?.querySelector('[data-hero-cable]');
	const vEl = hero?.querySelector('[data-cable-v]');
	const to = hero?.querySelector('[data-cable-to]');
	if (!hero || !svg || !vEl || !to) return;
	const lead = svg.querySelector('.hero-cable-lead');
	const socket = svg.querySelector('.hero-cable-socket');
	const grad = svg.querySelector('#hero-cable-ink');
	let drawn = false;

	const draw = () => {
		if (getComputedStyle(svg).display === 'none') { svg.classList.remove('is-ready'); return; }
		const avoid = hero.querySelector('.hero-proof-panel:not([hidden]) .hero-proof-side-label--after text');
		const m = measure(hero, vEl, to, avoid);
		if (m.t.x - m.bx < 24) { svg.classList.remove('is-ready'); return; }
		svg.setAttribute('viewBox', `0 0 ${m.w} ${m.hh}`);
		let c = build(m, SHAPES[SHAPES.length - 1]);
		for (const k of SHAPES) { const cand = build(m, k); if (!crosses(m, cand, m.keepOut)) { c = cand; break; } }
		lead.setAttribute('d', c.d);
		socket.setAttribute('transform', `translate(${m.bx} ${m.by})`);
		svg.style.setProperty('--cable-w', `${m.t.stroke}px`);
		// Ink at the letter, grey by the time the cable has left the word.
		if (grad) {
			grad.setAttribute('x1', m.t.x); grad.setAttribute('y1', m.t.y);
			grad.setAttribute('x2', m.bx); grad.setAttribute('y2', m.by);
		}
		svg.style.setProperty('--cable-len', `${Math.ceil(lead.getTotalLength())}`);
		svg.classList.add('is-ready');
		if (!drawn) {
			drawn = true;
			svg.classList.add('is-drawing');
			let settled = false;
			const done = () => { if (settled) return; settled = true; svg.classList.remove('is-drawing'); svg.classList.add('is-live'); };
			lead.addEventListener('animationend', done, { once: true });
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
			else setTimeout(done, 1800);
		}
	};

	draw();
	if (document.fonts?.ready) document.fonts.ready.then(draw);
	window.addEventListener('resize', draw);
	if (typeof ResizeObserver !== 'undefined') {
		const ro = new ResizeObserver(draw);
		ro.observe(hero);
		ro.observe(to);
	}
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeroCable);
	else initHeroCable();
}
