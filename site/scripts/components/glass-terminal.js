import { renderCommandDemo, initCommandDemo } from "../demo-renderer.js";
import { initSplitCompare } from "../effects/split-compare.js";
import { commandCategories, commandRelationships, alphaCommands } from "../data.js";

// ============================================
// COMMAND PALETTE
//
// The Language section's command picker: one row of paper keys (the kit's
// .ks-instrument-strip.is-paper), grouped by category, and a card below it
// carrying the selected command's tag, name, one-line description, its
// related commands and the before/after demo. The same markup serves every
// width: the row wraps on desktop and scrolls sideways under 900px.
// ============================================

// Deprecated shims and compatibility aliases. `craft` is an alias for an
// ordinary build request and adds no behavior, so it has no key.
const PALETTE_DEPRECATED = new Set(['craft', 'teach-impeccable', 'frontend-design', 'arrange', 'normalize', 'impeccable craft', 'impeccable teach', 'impeccable extract']);

const CATEGORY_ORDER = ['create', 'evaluate', 'refine', 'simplify', 'harden', 'system'];
const CATEGORY_LABELS = {
    'create': 'Create', 'evaluate': 'Evaluate', 'refine': 'Refine',
    'simplify': 'Simplify', 'harden': 'Harden', 'system': 'System'
};
// Preferred order within each category (unlisted commands append at end).
const COMMAND_ORDER = {
    'create': ['impeccable', 'shape'],
    'evaluate': ['critique', 'audit'],
    'refine': ['typeset', 'layout', 'colorize', 'animate', 'delight', 'bolder', 'quieter', 'overdrive'],
    'simplify': ['distill', 'clarify', 'adapt'],
    'harden': ['polish', 'optimize', 'harden', 'onboard'],
    'system': ['init', 'extract', 'document', 'live']
};

const DEFAULT_COMMAND = 'clarify';

const state = {
    commands: [],
    index: -1,
    split: null,
    root: null
};

// Group the commands by category in palette order. Returns the groups and
// the flat ordered list the row indices refer to.
function paletteGroups(commands) {
    const byCategory = {};
    commands.forEach(cmd => {
        if (PALETTE_DEPRECATED.has(cmd.id)) return;
        const cat = commandCategories[cmd.id] || 'system';
        (byCategory[cat] ||= []).push(cmd);
    });
    const groups = [];
    const ordered = [];
    CATEGORY_ORDER.forEach(cat => {
        const cmds = byCategory[cat];
        if (!cmds) return;
        const order = COMMAND_ORDER[cat] || [];
        cmds.sort((a, b) => {
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
        groups.push({ id: cat, label: CATEGORY_LABELS[cat] || cat, commands: cmds });
        ordered.push(...cmds);
    });
    return { groups, ordered };
}

// Starting command: a #cmd- hash wins, otherwise the default.
function startIndex(commands) {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#cmd-')) {
        const idx = commands.findIndex(c => c.id === hash.slice(5));
        if (idx >= 0) return { index: idx, fromHash: true };
    }
    return { index: Math.max(0, commands.findIndex(c => c.id === DEFAULT_COMMAND)), fromHash: false };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// The root skill is shown as /impeccable; sub-commands as their bare name.
function keyLabel(cmd) {
    return cmd.id === 'impeccable' ? '/impeccable' : cmd.id;
}

export function initGlassTerminal() {
    // Nothing to prepare before the commands arrive.
}

export function renderTerminalLayout(commands) {
    const container = document.querySelector('.commands-gallery');
    if (!container) return;

    const { groups, ordered } = paletteGroups(commands);
    state.commands = ordered;
    const start = startIndex(ordered);
    state.index = start.index;

    const rowHTML = groups.map(group => `
        <div class="palette-group" role="none">
            <span class="palette-group-label" aria-hidden="true">${group.label}</span>
            <div class="palette-strip ks-instrument-strip is-paper" role="none">
                ${group.commands.map(cmd => renderKey(cmd, ordered.indexOf(cmd) === state.index)).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="palette">
            <div class="palette-row" role="tablist" aria-label="Commands" aria-orientation="horizontal">
                ${rowHTML}
            </div>
            <div class="palette-card" id="palette-card" role="tabpanel">
                <div class="palette-copy"></div>
                <div class="palette-demo"></div>
            </div>
        </div>
    `;

    state.root = container.querySelector('.palette');
    renderCard(state.index);
    setupRow();
    setupExternalSelection();
    revealKey(keys()[state.index], 'instant');

    // A deep link lands on the palette once it exists (the section is
    // rendered after the commands load, so the page's own hash jump ran
    // before there was anything to jump to).
    if (start.fromHash) {
        requestAnimationFrame(() => state.root?.scrollIntoView({ block: 'start' }));
    }
}

function renderKey(cmd, isActive) {
    const isAlpha = alphaCommands.includes(cmd.id);
    return `<button type="button" role="tab" class="ks-instrument-key palette-key${isActive ? ' is-active' : ''}" id="cmd-${cmd.id}" data-id="${cmd.id}" aria-selected="${isActive ? 'true' : 'false'}" aria-controls="palette-card" tabindex="${isActive ? '0' : '-1'}">${keyLabel(cmd)}${isAlpha ? '<span class="palette-key-alpha">alpha</span>' : ''}</button>`;
}

// Related commands, as ink links that select the target key. The links
// show bare names because the invocation is /impeccable <name>.
function renderRelations(cmd) {
    const rel = commandRelationships[cmd.id];
    if (!rel) return '';
    let label = '';
    let ids = [];
    if (rel.pairs) {
        label = 'pairs with';
        ids = [rel.pairs];
    } else if (rel.leadsTo?.length) {
        label = 'leads to';
        ids = rel.leadsTo;
    } else if (rel.combinesWith?.length) {
        label = 'combines with';
        ids = rel.combinesWith;
    }
    ids = ids.filter(id => state.commands.some(c => c.id === id));
    if (!ids.length) return '';
    const links = ids.map(id => `<a class="palette-rel-link" href="#cmd-${id}" data-id="${id}">${id}</a>`).join('');
    return `<p class="palette-rel"><span class="palette-rel-label">${label}</span>${links}</p>`;
}

function renderCard(index) {
    const cmd = state.commands[index];
    if (!cmd || !state.root) return;
    const card = state.root.querySelector('.palette-card');
    const copy = card.querySelector('.palette-copy');
    const demoArea = card.querySelector('.palette-demo');
    const cat = commandCategories[cmd.id] || 'system';
    const isRoot = cmd.id === 'impeccable';
    const isAlpha = alphaCommands.includes(cmd.id);

    card.dataset.category = cat;
    card.setAttribute('aria-labelledby', `cmd-${cmd.id}`);

    const nameHTML = isRoot
        ? 'impeccable'
        : `<span class="palette-namespace">/impeccable</span>${cmd.id}`;

    copy.innerHTML = `
        <div class="palette-tags">
            <span class="ks-tag">${CATEGORY_LABELS[cat] || cat}</span>
            ${isAlpha ? '<span class="ks-tag is-quiet">alpha</span>' : ''}
        </div>
        <h3 class="palette-name">${nameHTML}</h3>
        <p class="palette-desc">${escapeHtml(cmd.tagline || cmd.description)}</p>
        ${renderRelations(cmd)}
        <a class="palette-docs" href="/docs/${cmd.id}">Read the reference &rarr;</a>
    `;

    // Demo. Commands without a visual demo show their invocation and full
    // description in the same slot, so the card never reads as unfinished.
    if (state.split) {
        state.split.destroy();
        state.split = null;
    }
    const html = renderCommandDemo(cmd.id);
    if (html.includes('demo-placeholder')) {
        demoArea.innerHTML = `
            <div class="palette-usage">
                <code class="palette-usage-cmd">/impeccable ${cmd.id}</code>
                <p class="palette-usage-desc">${escapeHtml(cmd.description)}</p>
            </div>
        `;
    } else {
        demoArea.innerHTML = html;
        const splitComparison = demoArea.querySelector('.demo-split-comparison');
        if (splitComparison) {
            state.split = initSplitCompare(splitComparison, {
                defaultPosition: 50,
                skewAngle: 0,
                minPosition: 10,
                maxPosition: 90
            });
        }
        initCommandDemo(cmd.id, demoArea);
    }

    copy.querySelectorAll('.palette-rel-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            select(state.commands.findIndex(c => c.id === link.dataset.id), { focus: true });
        });
    });
}

function keys() {
    return state.root ? [...state.root.querySelectorAll('.palette-key')] : [];
}

// Select a command by index: update the keys, the card and the URL hash.
function select(index, { focus = false } = {}) {
    if (index < 0 || index >= state.commands.length) return;
    const all = keys();
    const changed = index !== state.index;
    state.index = index;

    all.forEach((key, i) => {
        const on = i === index;
        key.classList.toggle('is-active', on);
        key.setAttribute('aria-selected', on ? 'true' : 'false');
        key.setAttribute('tabindex', on ? '0' : '-1');
    });

    const key = all[index];
    if (key) {
        if (focus) key.focus({ preventScroll: true });
        revealKey(key);
    }

    if (changed) {
        history.replaceState(null, '', `#cmd-${state.commands[index].id}`);
        renderCard(index);
    }
}

// Keep the active key in view when the row scrolls sideways (under 900px).
// Only the row moves; the window never does, so the page's section
// tracker cannot overwrite the #cmd- hash.
function revealKey(key, behavior = 'smooth') {
    const row = state.root?.querySelector('.palette-row');
    if (!key || !row || row.scrollWidth <= row.clientWidth) return;
    const rowRect = row.getBoundingClientRect();
    const keyRect = key.getBoundingClientRect();
    const left = keyRect.left - rowRect.left + row.scrollLeft - (row.clientWidth - keyRect.width) / 2;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) behavior = 'instant';
    row.scrollTo({ left: Math.max(0, left), behavior });
}

function selectById(id, options) {
    const idx = state.commands.findIndex(c => c.id === id);
    if (idx >= 0) select(idx, options);
}

function setupRow() {
    const row = state.root?.querySelector('.palette-row');
    if (!row) return;

    row.addEventListener('click', (e) => {
        const key = e.target.closest('.palette-key');
        if (!key) return;
        select(keys().indexOf(key));
    });

    // Roving tabindex: one key in the tab order, arrows move between keys
    // and select as they go.
    row.addEventListener('keydown', (e) => {
        const key = e.target.closest('.palette-key');
        if (!key) return;
        const count = state.commands.length;
        let next = null;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                next = (state.index + 1) % count;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                next = (state.index - 1 + count) % count;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = count - 1;
                break;
            default:
                return;
        }
        e.preventDefault();
        select(next, { focus: true });
    });
}

// Other components (the periodic table) select a command by dispatching
// `impeccable:select-command` with the id. The palette view is brought in
// front and scrolled into view so the selection is visible.
function setupExternalSelection() {
    if (setupExternalSelection.bound) return;
    setupExternalSelection.bound = true;
    window.addEventListener('impeccable:select-command', (e) => {
        const id = e.detail?.id;
        if (!id || !state.commands.some(c => c.id === id)) return;
        const paletteTab = document.querySelector('.language-view-tab[data-view="palette"]');
        if (paletteTab && paletteTab.getAttribute('aria-selected') !== 'true') paletteTab.click();
        selectById(id, { focus: true });
        state.root?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
}
