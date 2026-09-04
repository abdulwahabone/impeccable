// The hero's patch cable: from the word "vocabulary" to the command switcher.
//
// The demo sits left of a centre spine and the text right of it. The cable
// bridges that spine: it leaves the word at its left edge, just under the
// baseline, drops through the gutter with real slack (a cable hangs; it does
// not fly straight) and comes into the right end of the switcher strip from
// the right. Both ends get a plug. It redraws on resize, on font load and
// when the switcher moves, and the pin lights gold once the cable is in.

function measure(hero, from, to, avoid) {
	const h = hero.getBoundingClientRect();
	const a = from.getBoundingClientRect();
	const b = to.getBoundingClientRect();
	// Leave the word a few px before the v, just under the baseline.
	const ax = a.left - h.left - 8;
	const ay = a.bottom - h.top - 8;
	// Enter the strip at its right end, mid height.
	const bx = b.right - h.left + 10;
	const by = b.top - h.top + b.height / 2;
	// The After mark hangs off the card's bottom right corner into the same
	// gutter; the curve has to pass it on the text side.
	let keepOut = null;
	if (avoid) {
		const r = avoid.getBoundingClientRect();
		if (r.width && r.height) keepOut = { left: r.left - h.left - 8, top: r.top - h.top - 8, right: r.right - h.left + 8, bottom: r.bottom - h.top + 8 };
	}
	return { ax, ay, bx, by, keepOut, w: h.width, hh: h.height };
}

// Three shapes, from the most relaxed hang to the most upright drop. Each
// exits the word level to the left (c1 close to ay) and enters the strip
// from the right with a short sag below the socket (c2 under by).
function controls({ ax, ay, bx, by }, k) {
	const dx = ax - bx;
	const dy = by - ay;
	const sag = Math.max(14, Math.min(28, dy * 0.08));
	return {
		c1x: ax - dx * k.exit, c1y: ay + 2,
		c2x: bx + dx * k.enter, c2y: by + sag * k.sag,
	};
}

const SHAPES = [
	{ exit: 0.55, enter: 0.45, sag: 1 },
	{ exit: 0.35, enter: 0.7, sag: 1 },
	{ exit: 0.18, enter: 0.88, sag: 1.3 },
];

function crosses(m, c, box) {
	if (!box) return false;
	for (let i = 0; i <= 48; i++) {
		const t = i / 48;
		const u = 1 - t;
		const x = u * u * u * m.ax + 3 * u * u * t * c.c1x + 3 * u * t * t * c.c2x + t * t * t * m.bx;
		const y = u * u * u * m.ay + 3 * u * u * t * c.c1y + 3 * u * t * t * c.c2y + t * t * t * m.by;
		if (x > box.left && x < box.right && y > box.top && y < box.bottom) return true;
	}
	return false;
}

function path(m) {
	let c = controls(m, SHAPES[SHAPES.length - 1]);
	for (const k of SHAPES) {
		const candidate = controls(m, k);
		if (!crosses(m, candidate, m.keepOut)) { c = candidate; break; }
	}
	return `M ${m.ax.toFixed(1)} ${m.ay.toFixed(1)} C ${c.c1x.toFixed(1)} ${c.c1y.toFixed(1)}, ${c.c2x.toFixed(1)} ${c.c2y.toFixed(1)}, ${m.bx.toFixed(1)} ${m.by.toFixed(1)}`;
}

export function initHeroCable() {
	const hero = document.querySelector('.hero-rebuild');
	const svg = hero?.querySelector('[data-hero-cable]');
	const from = hero?.querySelector('[data-cable-from]');
	const to = hero?.querySelector('[data-cable-to]');
	if (!hero || !svg || !from || !to) return;
	const paths = svg.querySelectorAll('path');
	const plugA = svg.querySelector('.hero-cable-plug--a');
	const plugB = svg.querySelector('.hero-cable-plug--b');
	let drawn = false;

	const draw = () => {
		if (getComputedStyle(svg).display === 'none') { svg.classList.remove('is-ready'); return; }
		const avoid = hero.querySelector('.hero-proof-panel:not([hidden]) .hero-proof-side-label--after text');
		const m = measure(hero, from, to, avoid);
		// Two halves only: the strip must sit left of the word, across the spine.
		if (m.ax - m.bx < 24) { svg.classList.remove('is-ready'); return; }
		svg.setAttribute('viewBox', `0 0 ${m.w} ${m.hh}`);
		const d = path(m);
		paths.forEach((p) => p.setAttribute('d', d));
		plugA.setAttribute('transform', `translate(${m.ax} ${m.ay})`);
		plugB.setAttribute('transform', `translate(${m.bx} ${m.by})`);
		const len = paths[1].getTotalLength();
		svg.style.setProperty('--cable-len', `${Math.ceil(len)}`);
		svg.classList.add('is-ready');
		if (!drawn) {
			drawn = true;
			// is-drawing carries the dash that reveals the lead. Chromium does
			// not repaint the finished fill-forwards state reliably once the
			// path has been re-measured under it, so the class comes off when
			// the draw-in ends and the lead paints as a plain stroke.
			svg.classList.add('is-drawing');
			let settled = false;
			const done = () => {
				if (settled) return;
				settled = true;
				svg.classList.remove('is-drawing');
				svg.classList.add('is-live');
			};
			const lead = paths[1];
			lead.addEventListener('animationend', done, { once: true });
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
			else setTimeout(done, 1900);
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
