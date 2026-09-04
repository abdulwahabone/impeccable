// The hero's patch cable: the v of "vocabulary" becomes a cable that runs
// into the command switcher.
//
// The demo sits left of a centre spine and the text right of it. The left
// arm of the v continues past its top terminal, swings round and drops as a
// cable across the spine straight into the right end of the switcher
// strip. The stroke starts at the glyph's own weight and colour and fades
// to cable grey (a gradient in user space, set from the endpoints), so the
// letter and the cable read as one line. Redraws on resize, on font load
// and when the strip moves.

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
	// The arm's direction, fitted over the straight part of the arm with
	// alpha-weighted centroids (sub-pixel), from just under the tip to a
	// little past a third of the glyph's height, before the arms converge.
	let bottom = top;
	for (let y = canvas.height - 1; y > top; y--) { let ink = false; for (let x = minX; x <= maxX; x++) if (img[(y * W + x) * 4 + 3] > 128) { ink = true; break; } if (ink) { bottom = y; break; } }
	const centroid = (y) => { let sw = 0, sx = 0; for (let x = 0; x < midX; x++) { const a = img[(y * W + x) * 4 + 3]; if (a > 24) { sw += a; sx += a * x; } } return sw ? sx / sw : null; };
	const yA = top + Math.round(stroke * scale * 1.5);
	const yB = top + Math.round((bottom - top) * 0.38);
	let sumX = 0, sumY = 0, sumXY = 0, sumYY = 0, n = 0;
	for (let y = yA; y <= yB; y++) { const c = centroid(y); if (c == null) continue; sumX += c; sumY += y; sumXY += c * y; sumYY += y * y; n++; }
	let slope = 0.2; // dx per dy, fallback
	if (n > 2) { const den = n * sumYY - sumY * sumY; if (den) slope = (n * sumXY - sumX * sumY) / den; }
	const dirX = slope, dirY = 1;
	const len = Math.hypot(dirX, dirY) || 1;
	const ux = -dirX / len, uy = -dirY / len;
	// A hair under the measured stem: the raster's anti-aliased edge counts
	// as ink, and a cable fractionally wider than the arm shows as a notch.
	const stem = Math.max(1.5, runW * Math.abs(dirY / len) * 0.88);
	// Start well inside the arm, so the cable's round cap is buried in the
	// letter's own ink and the two strokes overlap.
	const inset = stem * 1.3;
	return {
		x: r.left - h.left + (cx - pad) - ux * inset,
		y: (baselineP - h.top) + (cy - baselineC) - uy * inset,
		stroke: stem,
		ux, uy,
	};
}

// The other anchor: the tail of the y. In Alumni Sans the descender runs
// straight down and hooks left at the foot, so its terminal already points
// the way an underline runs. Found on the ink the same way: the glyph is
// rasterised at its on-page size, the foot is the lowest run of ink and the
// terminal is its leftmost end.
function descenderTerminal(yEl, hero) {
	const r = yEl.getBoundingClientRect();
	const h = hero.getBoundingClientRect();
	const cs = getComputedStyle(yEl);
	const size = parseFloat(cs.fontSize);
	const canvas = descenderTerminal.canvas || (descenderTerminal.canvas = document.createElement('canvas'));
	const scale = 2;
	const pad = Math.ceil(size * 0.3);
	canvas.width = Math.ceil((size + pad * 2) * scale);
	canvas.height = Math.ceil((size * 1.6 + pad) * scale);
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.setTransform(scale, 0, 0, scale, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
	ctx.fillStyle = '#000';
	const baselineC = size * 1.1;
	ctx.fillText('y', pad, baselineC);
	const m = ctx.measureText('y');
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const W = canvas.width, H = canvas.height;
	const ink = (x, y) => img[(y * W + x) * 4 + 3] > 128;
	const asc = m.fontBoundingBoxAscent || size * 0.9;
	const desc = m.fontBoundingBoxDescent || size * 0.25;
	const baselineP = r.top + (r.height - (asc + desc)) / 2 + asc;
	const stroke = Math.max(2, Math.min(4, size * 0.036));
	let bottom = -1;
	for (let y = H - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < W; x++) if (ink(x, y)) { bottom = y; break; }
	if (bottom < 0) return { x: r.left - h.left, y: baselineP + size * 0.2 - h.top, stroke, ux: -1, uy: 0 };
	// The foot: the rows within a stroke and a half of the bottom. Its
	// leftmost ink is the terminal; the foot's thickness is the stem weight
	// the cable has to match.
	const footTop = bottom - Math.round(stroke * scale * 1.6);
	let left = W;
	for (let y = footTop; y <= bottom; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { if (x < left) left = x; break; }
	// The weight to match is the descender's stem, read where it runs
	// straight, a little above the foot: the hook thins toward its tip, and
	// a cable matched to the tip came out lighter than the letter.
	const widths = [];
	for (let y = bottom - Math.round(size * 0.22 * scale); y <= bottom - Math.round(size * 0.12 * scale); y++) {
		if (y < 0) continue;
		let x = 0; while (x < W && !ink(x, y)) x++;
		const s0 = x; while (x < W && ink(x, y)) x++;
		if (x > s0) widths.push(x - s0);
	}
	widths.sort((a, b) => a - b);
	const runW = widths.length ? widths[widths.length >> 1] / scale : stroke;
	// The raster's threshold reads a light stem wider than the screen draws
	// it (4.5 in the raster against 3.7 on screen at 90px), and an unbroken
	// horizontal line reads heavier again than a glyph stem of the same
	// width; two thirds is where the two look like one weight.
	const stem = Math.max(1.5, runW * 0.67);
	// The cable's centre line is the foot's belly, where the hook is full
	// weight, not the tip, which lifts a hair as it thins. It starts just
	// inside the tip, so its own round cap becomes the terminal: the hook's
	// taper is under the cable's ink and the join shows no step.
	const centroid = (x) => { let sw = 0, sy = 0; for (let y = footTop; y <= bottom; y++) { const a = img[(y * W + x) * 4 + 3]; if (a > 24) { sw += a; sy += a * y; } } return sw ? sy / sw : null; };
	// Just inside the tip, before the hook meets the stem: a column further
	// in picks up the stem's rows and pulls the centre up.
	const xBelly = Math.min(W - 1, left + Math.round(stem * scale * 1.2));
	const cy0 = centroid(xBelly);
	const cy = (cy0 == null ? (footTop + bottom) / 2 : cy0) / scale;
	const cx = left / scale;
	const ux = -1, uy = 0;
	const inset = stem * 0.6;
	return {
		x: r.left - h.left + (cx - pad) - ux * inset,
		y: (baselineP - h.top) + (cy - baselineC) - uy * inset,
		stroke: stem,
		ux, uy,
	};
}

// The y route: out of the foot, level under the word to just past its left
// edge, one rounded turn down the middle of the spine, a straight drop, and
// a rounded turn into the strip's right end. Routed like a trace, not
// slung like a cable: the underline is the point, and a swoop above the
// headline was the busy part of the v route.
function buildY(m) {
	const { t, bx, by, wordLeft, stripRight } = m;
	const k = 0.5523;
	const ly = t.y;
	// The drop sits in the middle of the spine; the turn's radius is what
	// room there is between the word's edge and that line, capped.
	const xDrop = (wordLeft + stripRight) / 2;
	const r1 = Math.max(12, Math.min(48, wordLeft - xDrop));
	const r2 = Math.max(10, Math.min(28, xDrop - bx - 6));
	const p1x = xDrop + r1, p1y = ly;
	const q1x = xDrop, q1y = ly + r1;
	const p2x = xDrop, p2y = by - r2;
	const q2x = xDrop - r2, q2y = by;
	const f = (v) => v.toFixed(1);
	const d = [
		`M ${f(t.x)} ${f(t.y)}`,
		`L ${f(p1x)} ${f(p1y)}`,
		`C ${f(p1x - k * r1)} ${f(p1y)}, ${f(q1x)} ${f(q1y - k * r1)}, ${f(q1x)} ${f(q1y)}`,
		`L ${f(p2x)} ${f(p2y)}`,
		`C ${f(p2x)} ${f(p2y + k * r2)}, ${f(q2x + k * r2)} ${f(q2y)}, ${f(q2x)} ${f(q2y)}`,
		`L ${f(bx)} ${f(by)}`,
	].join(' ');
	return { d, lineY: ly, xDrop, turnX: p1x };
}

function measure(hero, vEl, to, avoid) {
	const h = hero.getBoundingClientRect();
	const b = to.getBoundingClientRect();
	const t = glyphTerminal(vEl, hero);
	// The cable ends just inside the strip's right edge, mid height, so it
	// reads as run straight into the bar.
	const bx = b.right - h.left - 14;
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
// the strip from the right with a little slack.
function build(m, k) {
	const { t, bx, by } = m;
	// Continue the arm along its own direction, then keep that tangent into
	// the curve so the join has no kink; one long sweep down arrives at the
	// strip end level from the right: a cable's S, not a hook.
	const armLen = 14;
	const ax = t.x + t.ux * armLen;
	const ay = t.y + t.uy * armLen;
	const dx = ax - bx;
	const dy = by - ay;
	// The exit run and the entry pull both scale with the horizontal room: on
	// a narrow spine a long run down the arm's line hugs the copy's left edge
	// and cuts through the lead, so the curve bows into the gutter sooner.
	const room = Math.min(1, dx / 130);
	const rise = Math.min(72, Math.max(20, dy * 0.28 * room));
	const c1x = ax + t.ux * rise * 1.1;
	const c1y = ay + t.uy * rise * 1.1;
	const c2x = bx + dx * k.enter * room;
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
	const yEl = hero?.querySelector('[data-cable-y]');
	const word = hero?.querySelector('[data-cable-from]');
	const to = hero?.querySelector('[data-cable-to]');
	if (!hero || !svg || !vEl || !to) return;
	// Which letter the cable grows from: the y's foot by default, the v's
	// arm on request (?cable=v, or data-anchor="v" on the svg).
	let anchor = svg.dataset.anchor || 'y';
	try { anchor = new URLSearchParams(location.search).get('cable') || anchor; } catch {}
	if (anchor === 'y' && !(yEl && word)) anchor = 'v';
	const lead = svg.querySelector('.hero-cable-lead');

	const grad = svg.querySelector('#hero-cable-ink');
	let drawn = false;

	const draw = () => {
		if (getComputedStyle(svg).display === 'none') { svg.classList.remove('is-ready'); return; }
		const avoid = hero.querySelector('.hero-proof-panel:not([hidden]) .hero-proof-side-label--after text');
		let m, c;
		if (anchor === 'y') {
			const h = hero.getBoundingClientRect();
			const b = to.getBoundingClientRect();
			const w = word.getBoundingClientRect();
			m = { t: descenderTerminal(yEl, hero), bx: b.right - h.left - 14, by: b.top - h.top + b.height / 2, wordLeft: w.left - h.left, stripRight: b.right - h.left, w: h.width, hh: h.height };
			if (m.wordLeft - m.stripRight < 24) { svg.classList.remove('is-ready'); return; }
			svg.setAttribute('viewBox', `0 0 ${m.w} ${m.hh}`);
			c = buildY(m);
			lead.setAttribute('d', c.d);
			if (svg.dataset.debug != null) window.__heroCable = { m, c };
			// Ink at the foot, cable grey two thirds of the way along the
			// underline; the turn and the drop are all cable.
			if (grad) {
				const x2 = m.t.x - (m.t.x - c.turnX) * 0.66;
				grad.setAttribute('x1', m.t.x); grad.setAttribute('y1', c.lineY);
				grad.setAttribute('x2', x2); grad.setAttribute('y2', c.lineY);
			}
		} else {
			m = measure(hero, vEl, to, avoid);
			if (m.t.x - m.bx < 24) { svg.classList.remove('is-ready'); return; }
			svg.setAttribute('viewBox', `0 0 ${m.w} ${m.hh}`);
			c = build(m, SHAPES[SHAPES.length - 1]);
			for (const k of SHAPES) { const cand = build(m, k); if (!crosses(m, cand, m.keepOut)) { c = cand; break; } }
			lead.setAttribute('d', c.d);
			// Ink at the letter, grey by the time the cable has left the word.
			if (grad) {
				grad.setAttribute('x1', m.t.x); grad.setAttribute('y1', m.t.y);
				grad.setAttribute('x2', m.bx); grad.setAttribute('y2', m.by);
			}
		}
		svg.style.setProperty('--cable-w', `${m.t.stroke}px`);
		svg.style.setProperty('--cable-len', `${Math.ceil(lead.getTotalLength())}`);
		svg.classList.add('is-ready');
		if (!drawn) {
			drawn = true;
			svg.classList.add('is-drawing');
			let settled = false;
			const done = () => { if (settled) return; settled = true; svg.classList.remove('is-drawing'); svg.classList.add('is-live'); };
			lead.addEventListener('animationend', done, { once: true });
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
			else setTimeout(done, 2400);
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
