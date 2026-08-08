// Getting a real page into a state worth looking at, shared by the two scripts
// that visit one: site-to-world-image.mjs, which photographs the design, and
// observe-motion.mjs, which watches it move.
//
// Extracted rather than copied. The overlay rules took four unusable worlds to
// arrive at, and a second copy that drifted would produce the same failure again
// somewhere else in the pipeline.

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// Consent banners, geo-gates and promo modals are the failure that produced four
// unusable worlds in the 2026-08-07 batch: the model was handed a screenshot of
// a cookie bar and faithfully rebuilt a cookie bar.
//
// They are REMOVED rather than accepted. Clicking Accept would transmit a
// consent decision on the operator's behalf, which is not ours to give, and
// removing the node photographs the page without answering it.
export async function clearOverlays(page) {
  const removed = await page.evaluate(() => {
    const gone = [];
    const kill = (el, why) => { if (el && el.isConnected) { el.remove(); gone.push(why); } };

    for (const el of document.querySelectorAll('[class*="preload"],[class*="loader"],[id*="preload"],[id*="loader"]')) {
      kill(el, 'preloader');
    }

    // By name first: these are near-universal among consent vendors.
    const NAMED = '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="gdpr" i],[class*="gdpr" i],[aria-label*="cookie" i],[class*="cmp-" i],#onetrust-consent-sdk,#usercentrics-root,[id*="didomi" i],[class*="klaro" i]';
    for (const el of document.querySelectorAll(NAMED)) kill(el, 'consent');

    // Then by behaviour, which catches the unnamed ones: anything pinned over
    // the page, large enough to matter, whose text reads like a gate.
    // English first, then the wordings that actually turned up in the queue.
    // bruegel2018.at came through with its German dialog intact and the world
    // was drawn from a screenshot of a consent box, because every term in the
    // list was English and the sites in this catalog are not.
    const GATE = new RegExp([
      'cookie', 'consent', 'privacy', 'accept all', 'reject all', 'manage preferences',
      'are you over', 'enter site', 'do you still want', 'choose your (country|region)', 'select your (country|region)',
      'datenschutz', 'einstellungen', 'alle akzeptieren', 'zustimmen', 'einwilligung',
      'confidentialit', 'tout accepter', 'gestion des cookies',
      'privacidad', 'aceptar todo', 'configurar cookies',
      'informativa', 'accetta tutti', 'preferenze',
      'privacybeleid', 'alles accepteren',
      'integritetspolicy', 'godkänn alla',
      'プライバシー', 'クッキー', '同意',
    // Leading boundary only, no trailing one: German compounds them, so
    // "Datenschutzeinstellungen" has no word break after "datenschutz" and a
    // closing \\b missed the exact dialog that prompted this list. The words are
    // specific enough that prefix matching costs nothing, and the element still
    // has to be pinned and large before any of this is consulted.
    ].map(term => (/^[\x00-\x7F]+$/.test(term) ? `\\b${term}` : term)).join('|'), 'i');
    for (const el of document.querySelectorAll('body *')) {
      if (!el.isConnected) continue;
      const style = getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'absolute') continue;
      const rect = el.getBoundingClientRect();
      const coverage = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);
      if (coverage < 0.06 || coverage > 1.6) continue;
      if (GATE.test((el.textContent || '').slice(0, 400))) kill(el, 'gate');
    }

    // Scroll locks travel with the things just removed.
    for (const node of [document.documentElement, document.body]) {
      node.style.overflow = 'visible';
      node.style.position = 'static';
    }
    return gone;
  });
  return [...new Set(removed)];
}

// A splash gate is not a banner and cannot be removed: the page behind it has
// not been built yet. This one is entered, which is navigation and not a consent
// decision. Only an exact word matches, so "Enter your email" cannot trigger it.
export async function enterSplashGate(page) {
  const gate = page.locator('a, button').filter({ hasText: /^\s*(enter|enter site|skip intro)\s*$/i }).first();
  if (!(await gate.count().catch(() => 0))) return false;
  await gate.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(3500);
  return true;
}

// Preloaders on these sites can loop forever rather than ending, so waiting for
// one is waiting for nothing. Give the page a fixed budget, clear what stands
// between the camera and the design, then carry on.
export async function settle(page, { budget = 6000, log } = {}) {
  await page.waitForTimeout(budget);
  const removed = await clearOverlays(page);
  if (removed.length && log) log(`  cleared ${removed.length} overlay(s): ${removed.join(', ')}`);
  if (await enterSplashGate(page) && log) log('  entered a splash gate');
  await page.waitForTimeout(1500);
}
