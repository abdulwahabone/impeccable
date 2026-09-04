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
	// Where the left arm of the v ends at the top, found on the ink itself:
	// the glyph is rasterised offscreen at its on-page size and the topmost
	// run of ink is the arm's terminal. Its centre is where the cable's
	// centre line has to start, so letter and cable share one stroke.
	const r = vEl.getBoundingClientRect();
	const h = hero.getBoundingClientRect();
	const cs = getComputedStyle(vEl);
	const size = parseFloat(cs.fontSize);
	const canvas = glyphTerminal.canvas || (glyphTerminal.canvas = document.createElement('canvas'));
	const scale = 2;
	const pad = Math.ceil(size * 0.3);
	canvas.width = Math.ceil((size + pad * 2) * scale);
	canvas.height = Math.ceil((size * 1.4 + pad) * scale);
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.setTransform(scale, 0, 0, scale, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
	ctx.fillStyle = '#000';
	const baselineC = size * 1.1;
	ctx.fillText('v', pad, baselineC);
	const m = ctx.measureText('v');
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const W = canvas.width;
	// The glyph's ink box first, so the search can stay on the LEFT arm:
	// the right arm's tip can sit a pixel higher and would otherwise win.
	let minX = W, maxX = -1;
	for (let y = 0; y < canvas.height; y++) for (let x = 0; x < W; x++) if (img[(y * W + x) * 4 + 3] > 128) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
	const midX = (minX + maxX) / 2;
	let top = -1, runL = 0, runR = 0;
	for (let y = 0; y < canvas.height && top < 0; y++) {
		for (let x = 0; x < W; x++) {
			if (img[(y * W + x) * 4 + 3] > 128) {
				const start = x;
				while (x < W && img[(y * W + x) * 4 + 3] > 128) x++;
				const end = x - 1;
				if ((start + end) / 2 < midX) { top = y; runL = start; runR = end; break; }
			}
		}
	}
	// Fall back to the metrics box if the raster gave nothing.
	const asc = m.fontBoundingBoxAscent || size * 0.9;
	const desc = m.fontBoundingBoxDescent || size * 0.25;
	const baselineP = r.top + (r.height - (asc + desc)) / 2 + asc;
	const stroke = Math.max(2, Math.min(4, size * 0.036));
	if (top < 0) return { x: r.left - h.left + stroke * 0.5, y: baselineP - (m.actualBoundingBoxAscent || size * 0.5) - h.top, stroke, ux: -0.3, uy: -0.95 };
	// A few rows down the terminal is a full stroke wide; measure the width
	// there rather than at the very tip, which is a single anti-aliased row.
	const y2 = top + Math.round(stroke * scale);
	let l2 = -1, r2 = -1;
	for (let x = 0; x < midX; x++) if (img[(y2 * W + x) * 4 + 3] > 128) { if (l2 < 0) l2 = x; r2 = x; if (r2 - l2 > stroke * scale * 2.5) break; }
	const cx = ((l2 >= 0 ? (l2 + r2) / 2 : (runL + runR) / 2)) / scale;
	const cy = (top / scale) + stroke * 0.5;
	// The stem's real width at this size, so the cable starts exactly as
	// heavy as the arm it continues (the horizontal run of a slanted stem
	// overstates the width by 1/cos, corrected below once the angle is known).
	const runW = l2 >= 0 ? (r2 - l2 + 1) / scale : stroke;
	// The arm's direction: the run centre a few strokes further down.
	const y3 = top + Math.round(stroke * scale * 4);
	let l3 = -1, r3 = -1;
	for (let x = 0; x < midX; x++) if (img[(y3 * W + x) * 4 + 3] > 128) { if (l3 < 0) l3 = x; r3 = x; if (r3 - l3 > stroke * scale * 2.5) break; }
	const cx3 = l3 >= 0 ? (l3 + r3) / 2 / scale : cx + stroke;
	const dirX = cx3 - cx, dirY = (y3 - top) / scale;
	const len = Math.hypot(dirX, dirY) || 1;
	const ux = -dirX / len, uy = -dirY / len;
	const stem = Math.max(1.5, runW * Math.abs(dirY / len));
	// Start a little way down inside the arm, so the cable's round cap is
	// buried in the letter's own ink and the two strokes overlap.
	const inset = stem * 0.9;
	return {
		x: r.left - h.left + (cx - pad) - ux * inset,
		y: (baselineP - h.top) + (cy - baselineC) - uy * inset,
		stroke: stem,
		ux, uy,
	};
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
	// Continue the arm along its own direction, then keep that tangent into
	// the curve so the join has no kink; one long sweep down arrives at the
	// socket level from the right: a cable's S, not a hook.
	const armLen = 14;
	const ax = t.x + t.ux * armLen;
	const ay = t.y + t.uy * armLen;
	const dx = ax - bx;
	const dy = by - ay;
	const rise = Math.min(72, Math.max(36, dy * 0.28));
	const c1x = ax + t.ux * rise * 1.1;
	const c1y = ay + t.uy * rise * 1.1;
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
	const plug = svg.querySelector('.hero-cable-plug');
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
		// The plug body: the last 14px of the cable, thicker and ink, entering
		// the hole along the cable's own tangent.
		const total = lead.getTotalLength();
		const pIn = lead.getPointAtLength(Math.max(0, total - 15));
		if (plug) plug.setAttribute('d', `M ${pIn.x.toFixed(1)} ${pIn.y.toFixed(1)} L ${m.bx.toFixed(1)} ${m.by.toFixed(1)}`);
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
