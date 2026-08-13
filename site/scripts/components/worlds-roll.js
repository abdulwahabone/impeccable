/**
 * Worlds section: deal a live hand from /api/roll and animate it like cards
 * hitting a table. One coherent moment: staggered dealt-cards entry with a
 * slight fan and an exponential ease-out; a re-roll sweeps the hand away and
 * deals fresh worlds under the same key (the API's reroll chain), so every
 * hand a visitor sees is reproducible from the roll meta line.
 *
 * The page renders only what a roll deals. No catalog data is imported here.
 */

const SCOPE = 'direction';
const RATING = 2; // two-star and up, not flagship-only; keep the lead copy's count in sync
const MAX_REROLL = 8; // API cap; past it we start a fresh key
const FAN_ANGLES = [-2.1, 1.4, -1.1, 1.9, -1.6, 1.2];
const DEAL_STAGGER_MS = 75;
const SWEEP_MS = 460;
const IMAGE_WAIT_MS = 1200;

function rollKey() {
  return Math.random().toString(36).slice(2, 10);
}

export function initWorldsRoll() {
  const section = document.querySelector('[data-worlds-section]');
  if (!section) return;

  const hand = section.querySelector('[data-worlds-hand]');
  const status = section.querySelector('[data-worlds-status]');
  const meta = section.querySelector('[data-worlds-meta]');
  const rerollButton = section.querySelector('[data-worlds-reroll]');
  const cardsBase = section.dataset.cardsBase || '/worlds/cards';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let key = rollKey();
  let reroll = 0;
  let busy = false;
  let pendingRoll = null;
  let loadFailed = false;
  let inView = false;
  let dealtOnce = false;

  const fetchRoll = async () => {
    const params = new URLSearchParams({ scope: SCOPE, rating: String(RATING), key, reroll: String(reroll) });
    const response = await fetch(`/api/roll?${params}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`roll failed: ${response.status}`);
    const roll = await response.json();
    if (!Array.isArray(roll.challengers) || roll.challengers.length === 0) {
      throw new Error('roll dealt no worlds');
    }
    return roll;
  };

  const cardImageUrl = (world, roll) =>
    // The pool revision doubles as a cache stamp: card URLs change exactly
    // when the approved pool does, matching the R2 route's immutable caching.
    `${cardsBase}/${world.id}-hero.webp?v=${roll.poolRevision || ''}`;

  const buildCard = (world, index, roll) => {
    const item = document.createElement('li');
    item.className = 'worlds-card';
    item.style.setProperty('--fan', `${FAN_ANGLES[index % FAN_ANGLES.length]}deg`);

    const image = document.createElement('img');
    image.src = cardImageUrl(world, roll);
    image.alt = `${world.name}: desktop hero render in the world's own graphic system`;
    image.width = 2048;
    image.height = 1152;
    image.decoding = 'async';
    // The art area shimmers until the render decodes; a card whose image never
    // arrives settles on flat graphite instead of shimmering forever.
    image.addEventListener('load', () => item.classList.add('is-loaded'), { once: true });
    image.addEventListener('error', () => item.classList.add('is-missing'), { once: true });

    const caption = document.createElement('span');
    caption.className = 'worlds-card-caption';
    const tier = document.createElement('span');
    tier.className = 'worlds-card-tier';
    // DESIGN.md label-role micro caps; waived from the 11px functional floor.
    tier.setAttribute('data-impeccable-ignore', 'undersized-ui-text');
    tier.textContent = world.wellTier || '';
    const name = document.createElement('strong');
    name.className = 'worlds-card-name';
    name.textContent = world.name || world.id;
    caption.append(tier, name);

    const spark = document.createElement('span');
    spark.className = 'worlds-card-spark';
    spark.textContent = world.spark || '';

    item.append(image, caption, spark);
    return item;
  };

  const waitForImages = items => {
    const images = items.map(item => item.querySelector('img'));
    const settled = Promise.all(images.map(image => (image.complete
      ? Promise.resolve()
      : new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }))));
    return Promise.race([settled, new Promise(resolve => setTimeout(resolve, IMAGE_WAIT_MS))]);
  };

  // Where the deck sits: the middle of the hand. Cards deal out from there and
  // collapse back into it, which is what makes the motion read as dealing
  // rather than as a grid of panels sliding up. Ported from the skill's
  // decision page (serve-question.mjs), which does the same trick.
  const offsetToDeck = card => {
    const deck = hand.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    return {
      dx: (deck.left + deck.width / 2) - (rect.left + rect.width / 2),
      dy: (deck.top + deck.height / 2) - (rect.top + rect.height / 2) + 14,
    };
  };

  const dealHand = async roll => {
    const cards = roll.challengers.map((world, index) => buildCard(world, index, roll));
    status.classList.remove('is-error');
    status.textContent = '';
    meta.textContent = `roll ${roll.key}:${roll.reroll} · pool ${roll.poolRevision}`;
    // Decode off-DOM while the skeletons keep holding the grid; the swap
    // happens only once the art is ready (or the wait times out and the
    // in-card shimmer takes over).
    await waitForImages(cards);
    hand.replaceChildren(...cards);

    if (!reducedMotion) {
      // Stack every card on the deck first, unblurred order preserved by
      // z-index so the top of the pile is the first one dealt.
      cards.forEach((card, index) => {
        const { dx, dy } = offsetToDeck(card);
        card.style.transition = 'none';
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${index % 2 ? 5 : -4}deg) scale(0.9)`;
        card.style.opacity = '0';
        card.style.filter = 'blur(10px)';
        card.style.zIndex = String(cards.length - index);
      });
      // Two frames: one to paint the stacked state, one to start the deal.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    for (const [index, card] of cards.entries()) {
      card.classList.add('is-dealt');
      if (reducedMotion) continue;
      const delay = index * DEAL_STAGGER_MS;
      card.style.transition =
        `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms,`
        + ` opacity 0.45s ease ${delay}ms,`
        + ` filter 0.55s ease ${delay}ms`;
      card.style.transform = '';
      card.style.opacity = '';
      card.style.filter = '';
      // Hand the card back to CSS once it lands, so hover and focus states are
      // not fighting an inline transition.
      card.addEventListener('transitionend', function settle(event) {
        if (event.propertyName !== 'transform') return;
        card.style.transition = '';
        card.style.zIndex = '';
        card.removeEventListener('transitionend', settle);
      });
    }

    status.textContent = `Dealt ${roll.challengers.map(world => world.name).join(', ')}.`;
  };

  const skeletonCards = (count, height) => Array.from({ length: count }, () => {
    const skeleton = document.createElement('li');
    skeleton.className = 'worlds-card worlds-card--skeleton';
    if (height) skeleton.style.height = `${height}px`;
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.innerHTML =
      '<span class="worlds-skeleton-media"></span>'
      + '<span class="worlds-card-caption">'
      + '<span class="worlds-skeleton-line worlds-skeleton-line--tier"></span>'
      + '<span class="worlds-skeleton-line worlds-skeleton-line--name"></span>'
      + '</span>';
    return skeleton;
  });

  // Collapse the hand back onto the deck, then hold shimmer skeletons in the
  // grid while the next roll is in flight. Without the skeletons the section
  // empties out and the page reads as broken for the length of the fetch.
  const sweepHand = async () => {
    const cards = [...hand.children];
    if (cards.length === 0) return;

    if (!reducedMotion) {
      cards.forEach((card, index) => {
        const { dx, dy } = offsetToDeck(card);
        card.style.transition =
          `transform 0.5s cubic-bezier(0.5, 0, 0.75, 0) ${index * 60}ms,`
          + ` opacity 0.4s ease ${index * 60 + 120}ms,`
          + ` filter 0.45s ease ${index * 60}ms`;
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${index % 2 ? 6 : -5}deg) scale(0.9)`;
        card.style.opacity = '0';
        card.style.filter = 'blur(8px)';
      });
      await new Promise(resolve => setTimeout(resolve, SWEEP_MS));
    }

    const height = cards[0]?.getBoundingClientRect().height ?? 0;
    hand.replaceChildren(...skeletonCards(cards.length, height));
  };

  const showError = () => {
    hand.replaceChildren();
    meta.textContent = '';
    status.classList.add('is-error');
    status.textContent = 'The table went quiet. Deal again to retry.';
  };

  const maybeDeal = () => {
    if (!inView || dealtOnce || !pendingRoll) return;
    dealtOnce = true;
    rerollButton.disabled = false;
    dealHand(pendingRoll).catch(showError);
  };

  const load = async () => {
    try {
      pendingRoll = await fetchRoll();
      maybeDeal();
    } catch {
      loadFailed = true;
      rerollButton.disabled = false;
      if (inView) showError();
    }
  };

  rerollButton.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    rerollButton.disabled = true;
    if (reroll >= MAX_REROLL) {
      key = rollKey();
      reroll = 0;
    } else {
      reroll += 1;
    }
    try {
      const [roll] = await Promise.all([fetchRoll(), sweepHand()]);
      pendingRoll = roll;
      await dealHand(roll);
    } catch {
      showError();
    } finally {
      busy = false;
      rerollButton.disabled = false;
    }
  });

  // Hold the table with skeletons from the first paint. Without them the
  // initial fetch leaves an empty hand and the section reads as broken for
  // exactly the visitors the roll is meant to impress.
  hand.replaceChildren(...skeletonCards(FAN_ANGLES.length));

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      inView = true;
      if (pendingRoll) maybeDeal();
      else if (loadFailed) showError();
      observer.disconnect();
    }
  }, { rootMargin: '160px 0px' });
  observer.observe(section);

  load();
}
