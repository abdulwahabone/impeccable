// Instrument strip: the sliding thumb.
//
// Every .ks-instrument-strip gets one raised cap that slides between keys.
// The page's own handlers still toggle is-active / aria-selected /
// aria-pressed on the keys; this script only measures the active key and
// writes --thumb-x / --thumb-w on the strip, on load, on any class or aria
// change, and on resize. Dragging the thumb selects the nearest key by
// clicking it, so the page's handler runs unchanged.

const ACTIVE = '.is-active, [aria-selected="true"], [aria-pressed="true"]';

// Writes only when a value changes: the observer below watches class
// changes on the strip's subtree, and an unconditional classList.add would
// re-trigger it forever.
function place(strip) {
	const key = strip.querySelector(`.ks-instrument-key:is(${ACTIVE})`);
	if (!key) {
		if (strip.classList.contains('has-thumb')) strip.classList.remove('has-thumb');
		return;
	}
	const s = strip.getBoundingClientRect();
	const k = key.getBoundingClientRect();
	const border = parseFloat(getComputedStyle(strip).borderLeftWidth) || 0;
	const x = `${Math.round((k.left - s.left - border + strip.scrollLeft) * 100) / 100}px`;
	const w = `${Math.round(k.width * 100) / 100}px`;
	if (strip.style.getPropertyValue('--thumb-x') !== x) strip.style.setProperty('--thumb-x', x);
	if (strip.style.getPropertyValue('--thumb-w') !== w) strip.style.setProperty('--thumb-w', w);
	if (!strip.classList.contains('has-thumb')) strip.classList.add('has-thumb');
}

function attach(strip) {
	if (strip.dataset.thumb) return;
	strip.dataset.thumb = '1';
	place(strip);
	// Observe the keys, not the strip itself, so the strip's own class and
	// style writes never feed back into the observer.
	const mo = new MutationObserver((records) => {
		if (records.some((r) => r.target !== strip)) place(strip);
	});
	mo.observe(strip, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'aria-pressed'], childList: true });
	if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => place(strip)).observe(strip);

	// Drag: press anywhere on the strip and move; the key under the pointer
	// is clicked when it changes.
	let dragging = false;
	let last = null;
	const keyAt = (x, y) => document.elementFromPoint(x, y)?.closest('.ks-instrument-key');
	strip.addEventListener('pointerdown', (e) => {
		if (e.button !== 0) return;
		dragging = true;
		last = keyAt(e.clientX, e.clientY);
		strip.setPointerCapture?.(e.pointerId);
	});
	strip.addEventListener('pointermove', (e) => {
		if (!dragging) return;
		const key = keyAt(e.clientX, e.clientY);
		if (key && key !== last && strip.contains(key)) {
			last = key;
			key.click();
		}
	});
	const end = () => { dragging = false; last = null; };
	strip.addEventListener('pointerup', end);
	strip.addEventListener('pointercancel', end);
}

export function initInstrumentStrips(root = document) {
	root.querySelectorAll('.ks-instrument-strip').forEach(attach);
	// Strips rendered later (the command palette, the mobile picker).
	const mo = new MutationObserver((records) => {
		for (const r of records) {
			for (const n of r.addedNodes) {
				if (!(n instanceof Element)) continue;
				if (n.matches('.ks-instrument-strip')) attach(n);
				n.querySelectorAll?.('.ks-instrument-strip').forEach(attach);
			}
		}
	});
	mo.observe(root.body || root, { childList: true, subtree: true });
	window.addEventListener('resize', () => root.querySelectorAll('.ks-instrument-strip').forEach(place));
	if (document.fonts?.ready) document.fonts.ready.then(() => root.querySelectorAll('.ks-instrument-strip').forEach(place));
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initInstrumentStrips());
	else initInstrumentStrips();
}
