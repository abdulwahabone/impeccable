/**
 * The command console's channel list: one entry per command, in deck order.
 *
 * [id, group, kind, description, patch]
 *   group  the deck section the channel sits in
 *   kind   'fader' for a continuous command (a slider), 'key' for a discrete
 *          one (a button)
 *   patch  the two commands the readout offers as a next step
 *
 * Read by CommandConsole.astro (which renders the deck) and by
 * command-console.js (which wires it), so the two never disagree.
 */
export const CONSOLE_GROUPS = ['create', 'evaluate', 'refine', 'simplify', 'harden', 'system'];

export const CONSOLE_COMMANDS = [
  ['impeccable', 'create', 'key', 'Build new work from a brief: a direction rolled and committed before any code.', ['shape', 'critique']],
  ['shape', 'create', 'key', 'Plan before code. A discovery interview, then a brief you sign off on.', ['impeccable', 'layout']],
  ['critique', 'evaluate', 'key', 'A design review that scores hierarchy, structure and the things a person would notice.', ['polish', 'distill']],
  ['audit', 'evaluate', 'key', 'Technical checks: accessibility, performance, theming, responsiveness, anti-patterns.', ['harden', 'optimize']],
  ['typeset', 'refine', 'fader', 'Fix type: font choices, hierarchy, sizing, measure, readability.', ['layout', 'polish']],
  ['layout', 'refine', 'fader', 'Fix spacing, rhythm and alignment until the grid is felt, not seen.', ['typeset', 'distill']],
  ['colorize', 'refine', 'fader', 'Add strategic color to work that reads gray or landed on the default gradient.', ['bolder', 'quieter']],
  ['animate', 'refine', 'fader', 'Purposeful motion that shows state. Nothing decorative.', ['delight', 'polish']],
  ['delight', 'refine', 'fader', 'Small moments of personality where the flow can carry them.', ['animate', 'bolder']],
  ['bolder', 'refine', 'fader', 'Amplify a safe design until it has a point of view.', ['colorize', 'overdrive']],
  ['quieter', 'refine', 'fader', 'Turn a loud design down without losing what it meant.', ['distill', 'colorize']],
  ['overdrive', 'refine', 'fader', 'Push past convention: shaders, springs, scroll-driven reveals at 60fps.', ['bolder', 'animate']],
  ['distill', 'simplify', 'fader', 'Subtract until only what earns its place is left.', ['clarify', 'quieter']],
  ['clarify', 'simplify', 'fader', 'Rewrite labels, copy and errors so the interface explains itself.', ['polish', 'onboard']],
  ['adapt', 'simplify', 'fader', 'Make it work at every width and on every device without amputating features.', ['layout', 'harden']],
  ['polish', 'harden', 'key', 'The final pass: alignment, spacing, consistency, micro-detail.', ['audit', 'typeset']],
  ['optimize', 'harden', 'key', 'Find and fix what makes it slow, from LCP to bundle size.', ['audit', 'harden']],
  ['harden', 'harden', 'key', 'Production-ready: long names, other languages, errors, empty data.', ['audit', 'onboard']],
  ['onboard', 'harden', 'key', 'First runs and empty states that lead somewhere.', ['clarify', 'delight']],
  ['init', 'system', 'key', 'Set up a project once: PRODUCT.md, DESIGN.md, live mode, where to start.', ['document', 'extract']],
  ['extract', 'system', 'key', 'Pull repeated patterns and tokens into the design system.', ['document', 'polish']],
  ['document', 'system', 'key', 'Write DESIGN.md from what actually ships.', ['extract', 'init']],
  ['live', 'system', 'key', 'Pick an element in the browser, get three variants, accept one into source.', ['polish', 'animate']],
];

export const DEFAULT_CHANNEL = 'typeset';
