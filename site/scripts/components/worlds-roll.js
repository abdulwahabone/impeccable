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
const RATING = 2; // flagship tier only
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
    item.style.setProperty('--deal-delay', `${index * DEAL_STAGGER_MS}ms`);
    item.style.setProperty('--fan', `${FAN_ANGLES[index % FAN_ANGLES.length]}deg`);

    const image = document.createElement('img');
    image.src = cardImageUrl(world, roll);
    image.alt = `${world.name}: desktop hero render in the world's own graphic system`;
    image.width = 2048;
    image.height = 1152;
    image.decoding = 'async';

    const caption = document.createElement('span');
    caption.className = 'worlds-card-caption';
    const tier = document.createElement('span');
    tier.className = 'worlds-card-tier';
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

  const dealHand = async roll => {
    const cards = roll.challengers.map((world, index) => buildCard(world, index, roll));
    hand.replaceChildren(...cards);
    status.classList.remove('is-error');
    status.textContent = '';
    meta.textContent = `roll ${roll.key}:${roll.reroll} · pool ${roll.poolRevision}`;
    await waitForImages(cards);
    // Force a layout so the undealt state paints before transitions start.
    hand.getBoundingClientRect();
    requestAnimationFrame(() => {
      for (const card of cards) card.classList.add('is-dealt');
    });
    status.textContent = `Dealt ${roll.challengers.map(world => world.name).join(', ')}.`;
  };

  const sweepHand = () => {
    const cards = [...hand.children];
    if (cards.length === 0 || reducedMotion) return Promise.resolve();
    cards.forEach((card, index) => {
      card.style.setProperty('--sweep-delay', `${index * 40}ms`);
      card.classList.add('is-swept');
    });
    return new Promise(resolve => setTimeout(resolve, SWEEP_MS));
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
