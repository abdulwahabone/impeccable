// The slash menu on the docs index: every command, in the groups the menu
// shows them in. Each entry is [name, menu line, long line, combines with].
// The menu line is what the agent's composer shows beside the name; the long
// line is the sentence under the Before page while the command is
// highlighted. Rendered server-side as links to /docs/<name> and driven
// client-side by site/scripts/components/slash-moment.js.

export const GROUPS = [
  ['create', [
    ['impeccable', 'Build or redesign anything, from one sentence.', 'Design or redesign a feature from a plain-language brief. The skill sets the bar, picks a direction, and builds it.', ['shape', 'polish']],
    ['shape', 'Plan the UX before code. Interview, then brief.', 'Runs a discovery interview and writes a design brief you confirm before any code is written.', ['impeccable', 'critique']],
  ]],
  ['evaluate', [
    ['critique', 'Score hierarchy, flow and cognitive load.', 'Reviews a design the way a senior designer would: hierarchy, information architecture, emotional register, with scores and a fix list.', ['polish', 'distill']],
    ['audit', 'Check a11y, performance, theming, anti-patterns.', 'Runs technical checks across accessibility, performance, theming and responsive behavior, with P0 to P3 findings.', ['harden', 'optimize']],
  ]],
  ['refine', [
    ['typeset', 'Fix font choice, hierarchy, size and measure.', 'Improves typography: font pairing, scale, weight, line length and rhythm, so text reads as intended.', ['layout', 'polish']],
    ['layout', 'Fix spacing, rhythm and alignment.', 'Repairs monotonous grids, uneven spacing and weak hierarchy so the composition holds together.', ['typeset', 'distill']],
    ['colorize', 'Add strategic color to a gray interface.', 'Introduces color with intent: one accent that carries meaning, applied where the eye should land.', ['bolder', 'quieter']],
    ['animate', 'Add motion that explains and rewards.', 'Adds purposeful transitions and micro-interactions that show cause and effect without slowing anyone down.', ['delight', 'overdrive']],
    ['delight', 'Add moments of personality and joy.', 'Finds the places where a little warmth or wit makes the product feel made by people.', ['animate', 'bolder']],
    ['bolder', 'Push a safe design toward impact.', 'Amplifies a timid design: bigger type, stronger contrast, a clearer point of view.', ['colorize', 'overdrive']],
    ['quieter', 'Calm a loud design without losing it.', 'Tones down an overstimulating interface while keeping its energy where it matters.', ['distill', 'polish']],
    ['overdrive', 'Past convention: shaders, physics, 60fps.', 'Pushes a surface past the ordinary with technically ambitious motion and rendering, kept smooth.', ['animate', 'optimize']],
  ]],
  ['simplify', [
    ['distill', 'Strip a design to its essence.', 'Removes what does not earn its place until what remains is simple, clear and strong.', ['clarify', 'layout']],
    ['clarify', 'Rewrite copy so the UI explains itself.', 'Fixes labels, error messages and instructions so people know what to do and why.', ['harden', 'onboard']],
    ['adapt', 'Make it work on every screen and platform.', 'Adapts a layout across viewports, devices and platforms: breakpoints, fluid grids, real tap targets.', ['harden', 'audit']],
  ]],
  ['harden', [
    ['polish', 'A last pass on alignment, spacing, detail.', 'The final sweep before shipping: alignment, spacing, consistency, the small things people feel but cannot name.', ['audit', 'typeset']],
    ['optimize', 'Make it load and render fast.', 'Diagnoses and fixes performance: load time, rendering, image weight, bundle size.', ['audit', 'harden']],
    ['harden', 'Survive real data: overflow, i18n, errors.', 'Prepares a surface for the world: long strings, other languages, empty and error states, edge cases.', ['audit', 'clarify']],
    ['onboard', 'Design first runs and empty states.', 'Designs the first-run experience so a new user reaches value: welcome, setup, empty states, the aha.', ['clarify', 'delight']],
  ]],
  ['system', [
    ['init', 'Write PRODUCT.md and set the project up.', 'Interviews you once and writes PRODUCT.md, the context every other command reads before it works.', ['shape', 'document']],
    ['extract', 'Pull repeated patterns into the system.', 'Finds drift across the codebase and consolidates it into components and tokens.', ['document', 'polish']],
    ['document', 'Write DESIGN.md from the code you have.', 'Extracts the visual system already in the code and records it as a spec an agent can follow.', ['init', 'extract']],
    ['live', 'Iterate on elements in the browser.', 'Pick an element on the running page, choose an action, and compare AI-made variants in place.', ['typeset', 'bolder']],
  ]],
];

// The Before and After captions per command.
export const CAPTIONS = {
  impeccable: ['a brief, unstyled', 'designed'],
  shape: ['an empty file', 'a brief'],
  critique: ['the page', 'the review'],
  audit: ['the page', 'findings'],
  typeset: ['one size fits all', 'a scale'],
  layout: ['crowded', 'breathing'],
  colorize: ['gray', 'one accent'],
  animate: ['static', 'in motion'],
  delight: ['functional', 'warm'],
  bolder: ['timid', 'with a point of view'],
  quieter: ['shouting', 'calm'],
  overdrive: ['ordinary', 'extraordinary'],
  distill: ['everything', 'the essential'],
  clarify: ['machine copy', 'human copy'],
  adapt: ['desktop, squeezed', 'mobile, native'],
  polish: ['almost right', 'right'],
  optimize: ['3.8 MB, 4.2 s', '142 KB, 0.3 s'],
  harden: ['breaks on real data', 'survives it'],
  onboard: ['no data', 'a first run'],
  init: ['no context', 'PRODUCT.md'],
  extract: ['five buttons', 'one Button'],
  document: ['undocumented', 'DESIGN.md'],
  live: ['the page', 'picking a variant'],
};

export const COMMANDS = GROUPS.flatMap(([group, list]) =>
  list.map(([name, short, long, pairs]) => ({ group, name, short, long, pairs })),
);

// The command the menu rests on before anyone touches it.
export const DEFAULT_INDEX = COMMANDS.findIndex((c) => c.name === 'typeset');
