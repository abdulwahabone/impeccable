> **Additional context needed**: only the target element, when the request does not name one that resolves uniquely on the page.

Generate is the fast lane into live mode: the user names an element, a direction, and a count in one sentence, and within a minute they are cycling through variants in their browser. You boot the helper, open the page, and hand the element to `impeccable live-generate`; the overlay scrolls to it, selects it, and fires the same Go a click fires. This file is the whole contract for that lane. **Do not read [live.md](live.md) for it**: every tool output carries `_instructions` with the next move for that exact situation, and they win over anything you remember. Open live.md only for a situation this file names as outside the lane.

**Web only.** Live mode's browser overlay has no native equivalent; on `ios` / `android` / `adaptive` projects, decline this command and offer `bolder` or `quieter` on the source instead.

Speed is the product here. Every tool call before the variants land is a second the user spends staring at a selected element. The lane below is five commands and one edit; anything beyond it needs a reason from the output in front of you. This lane also replaces Setup step 3 for the preview edit: the floors craft-floor.md guards are written into Step 4, so do not open craft-floor.md, and read the action's reference only when Step 4 says so.

Four prohibitions cover the known ways this command goes wrong:

- **Never run init or document, and never ask for PRODUCT.md or DESIGN.md.** When they exist, the boot prints them and you use them. When they do not, the boot says so and you extract the identity from the page (Step 4). A missing file is never a reason to interview the user inside this command; offer `init` in one line after the session ends.
- **Never hand-write a variants wrapper or invent a session id.** Only the browser mints session ids (8 hex characters, at Go). A missing event is fixed in Step 2 or Step 3, never with a direct source edit.
- **Open the page yourself** (Step 2). A pasted link usually means no page ever connects.
- **Do not act on hook findings while live markers are in the file**, and do not restyle variants to appease them; `impeccable live-complete` verifies the file once the accepted variant is permanent.

## Step 1: Parse the request

Three parts, all from the user's sentence:

- **A number in the request**: that is the count. **No number**: 3. The protocol caps count at 8.
- **The direction wording** maps onto the live action vocabulary; never invent a new action value:
  - **bold, bolder, stronger, punchier**: `bolder`
  - **quiet, calmer, softer, toned down**: `quieter`
  - **simpler, minimal, stripped**: `distill`
  - **refined, tightened, polished**: `polish`
  - **font and type words**: `typeset`
  - **color words**: `colorize`
  - **arrangement and spacing words**: `layout`
  - **device and breakpoint words**: `adapt`
  - **motion words**: `animate`
  - **playful words**: `delight`
  - **rule-breaking words**: `overdrive`
  - **Nothing fits**: `impeccable`, with the user's wording passed as the prompt.
  - **An action fits AND extra intent rides along** ("bolder, but keep it monochrome"): that action, with the rest as the prompt.
- **The element description** ("the pricing cards", "the hero heading"): Step 3 resolves it to a selector.

Done when you hold an action from the vocabulary, a count from 1 to 8, and the element description.

## Step 2: Boot and open the page

One command. Pass `--target` with the file that renders the element when the request or the project makes it obvious; skip it otherwise. Always pass both flags: `--allow-missing-context` lets the boot proceed when PRODUCT.md or DESIGN.md is absent (it changes nothing when both exist), and `--dev-url` asks the boot to find the dev server. Neither touches a plain `live` session.

```bash
{{scripts_path}}/impeccable live --target src/App.jsx --allow-missing-context --dev-url
```

Read three fields of the output and nothing else:

- `product` / `design` (or `contextMissing` with a `contextNote`): the design context you have. Present means use it; missing means the page is the source of truth, per the note. Either way, continue.
- `devUrl`: the dev server that is serving this app right now. **Open it**: Cursor `browser_navigate`, any other harness its browser tool. `devUrl: null` means no dev server is serving the page yet: start the project's dev script in a background terminal (`npm run dev` or the framework's equivalent), open the URL it prints, and never kill or restart it afterwards.
- `pageFiles`: the page the helper injected into; the URL that serves it is the one to open (never `serverPort`, that is the helper).

**No browser tool in this harness**: tell the user the exact URL in one line, and pass `--wait-for-browser 120000` in Step 3 so the command fires the moment their page connects.

**`config_missing` / `config_invalid`**: follow [live-setup.md](live-setup.md) first, then rerun the boot.

Done when the boot printed `"ok": true` and a page is open. You do not need to read `package.json`, the dev-server config, terminal logs, or the page source to get here.

## Step 3: Target the element

One command. Derive the selector from what the user said and what you already know of the project: an id first, then a unique class, then a landmark tag plus class. **The request names a repeated component in plural** ("the pricing cards"): target the container that holds the set, so one scoped stylesheet restyles every instance. One read of the source file that renders the element is allowed when the selector is not obvious; `--dry-run` resolves and reports without starting anything when it is not certain.

```bash
{{scripts_path}}/impeccable live-generate --selector "#pricing" --action bolder --count 3
```

Flags: `--selector` (required), `--action`, `--count`, `--prompt`, `--text` (keep only matches whose visible text contains a snippet), `--index` (1-based pick among matches), `--dry-run`, `--wait-for-browser <ms>`.

Every verdict carries `_instructions`; follow them over your recollection of this file. Two deserve naming:

- **`no_browser_connected`**: Step 2's page is not actually open; open it yourself, then rerun.
- **`ambiguous`**: the candidates are listed; target their common container, or rerun with `--text "<visible text>"` or `--index <n>`.

Done when the verdict is `ok: true` with a `sessionId`: the browser has scrolled to the element, selected it, and fired Go.

## Step 4: Generate

Start the poll. Harness policy: **Cursor** runs `{{scripts_path}}/impeccable live-poll` one-shot in a background terminal with notify on `"type":"(generate|accept|discard|variant_mount_failed|exit)"`, handles the event, replies, and restarts the poll; **Claude Code** runs it as a background task; **Codex** runs it one-shot in a yielded foreground exec session and services it; never pass a short `--timeout=`.

The first event is the `generate` for your `sessionId`, and its `_instructions` are the whole plan: the fast path names the identity sources (the event's `element.computedStyles`, `cssCustomProperties`, and `parentContext`, plus whatever the boot printed), the three dimensions your variants vary for this action, the no-knobs default, and the exact splice. Do it in ONE edit and reply done. Concretely:

1. **Identity, one sentence, from the event.** Real colors, faces, corners, borders, shadows, and the layout topology on screen. DESIGN.md wins when the boot printed one. Never read PRODUCT.md, DESIGN.md, live.md, or craft-floor.md for this; never screenshot the page.
2. **The action's reference is optional.** Read `reference/<action>.md` only when the prompt or the element makes the direction unclear; the `_instructions` already carry the action's three dimensions.
3. **Write the splice.** The event's `scaffold` tells you where: `sourceWritten: false` hands you `wrapperBlock` and the source range to replace (`replaceStartLine` to `replaceEndLine`); a written wrapper hands you `file` and `insertLine`. Either way, one edit lands the preview CSS plus all variants:

```html
<!-- Variants: insert below this line -->
<style data-impeccable-css="SESSION_ID">
  @scope ([data-impeccable-variant="1"]) { :scope > .pricing { ... } }
  @scope ([data-impeccable-variant="2"]) { :scope > .pricing { ... } }
  @scope ([data-impeccable-variant="3"]) { :scope > .pricing { ... } }
</style>
<div data-impeccable-variant="1"><!-- full element, variant 1 --></div>
<div data-impeccable-variant="2" style="display: none"><!-- variant 2 --></div>
<div data-impeccable-variant="3" style="display: none"><!-- variant 3 --></div>
```

   Rules that keep the browser mounting what you wrote: each variant div holds exactly ONE top-level element, same tag as the original, with the copy verbatim; first variant visible, the rest `display: none`; every `:scope` rule steps into a descendant (`:scope > .card`, never a bare `:scope`); use the `styleTag` and selector strategy from the event's `cssAuthoring` when it differs from the sketch above. **JSX / TSX**: wrap the `<style>` content in a template literal, use `className=` and `style={{ display: 'none' }}`, keep `data-impeccable-*` attributes as plain strings.
4. **No parameter knobs** unless the user asked for something tunable. A variant is a finished design to choose from, not a control panel.
5. **Floors, by construction**: body text contrast 4.5:1 or better, no text under 12px, controls at least 40px tall, focus states kept. Do not verify beyond that; the overlay preview is the review channel until accept.
6. **Reply done** with the file you wrote: `{{scripts_path}}/impeccable live-poll --reply EVENT_ID done --file src/App.jsx`, then poll again. If the edit fails after the browser flipped to GENERATING, `--reply EVENT_ID error "Short reason"` so the bar resets.

Then tell the user, in one line, where their variants are: *"Three [bolder] variants are live on [the pricing cards]: cycle with the floating bar's arrows and Accept the keeper."*

Outside the lane, read the matching live.md section before acting: `scaffold.previewMode: "svelte-component"` (Svelte previews are edited as components), `mode: "insert"`, `variant_mount_failed`, `steer`, `manual_edit_apply`, and any `fallback: "agent-driven"` wrap error.

## Step 5: Accept and close

`accept` and `discard` arrive on the poll. The poll script has already run `impeccable live-accept`; the browser is already showing the choice. **Discard**: nothing to do; go to the close below. **Accept with `carbonize: false`**: same. **Accept with `carbonize: true`**: the accepted variant sits in source between `impeccable-carbonize-start/end SESSION_ID` markers with an inline `<style data-impeccable-css>`; make it permanent in one pass over `_acceptResult.file` and the stylesheet that already owns the element's styling:

1. Move the accepted variant's rules into that stylesheet, rewriting `@scope ([data-impeccable-variant="N"]) { :scope > .x }` to the real selectors (`.pricing > .x`).
2. Unwrap: keep the accepted element, delete the variant div (and on JSX the outer `data-impeccable-carbonize` div), drop every `data-impeccable-*` and `data-p-*` attribute.
3. Delete the inline `<style>` block, both markers, and any rules for the other variants.

Then `{{scripts_path}}/impeccable live-complete --id SESSION_ID` and confirm `phase: "completed"`; it refuses with `source_dirty` and findings while any live-mode leftover remains, so fix and rerun. **That command is the verification for this lane**: no `detect` pass, no document or init, no DESIGN.md edits, no reading of `document.md`. Reads before the bake: `_acceptResult.file` and the stylesheet, nothing else.

Close without being asked, the moment the accept or discard is complete:

```bash
{{scripts_path}}/impeccable live-server stop
```

Stopping removes the injected script and reloads the page once: the user sees the accepted design with no overlay chrome, still served by their dev server. **Never kill or restart the dev server**, including one you started in Step 2.

- **The user asks for more variants before you closed**: skip the close, target the next element through the same session (Step 3), and close after the last accept.
- **Interrupted or unsure of the state**: `{{scripts_path}}/impeccable live-status`, then `live-resume`; the journal under `.impeccable/live/sessions/` is canonical.

Done when the helper is stopped and the dev site still answers with the accepted design.
