# Build floor

Apply this only after analysis and direction are settled. Build without announcing the checklist.

- **Contrast:** body and placeholder text ≥4.5:1; large text ≥3:1. On colored surfaces, tint secondary text from that hue or the foreground instead of using gray.
- **Depth:** shadows describe light with offset and soft blur; zero-offset colored halos are decoration.
- **Spacing:** tight groups, generous separation, no cramped containers; space above a heading exceeds space below. Verify computed values.
- **Type:** body measure 65–75ch; display max 6rem and tracking floor -0.04em; balance headings; use clear scale/weight contrast; test overflow at every breakpoint.
- **Motion:** author one coherent moment instead of scattered effects. Use exponential ease-out and an already-visible default. Premium motion may add focus, depth, masks, light, or material change through blur/filter, backdrop-filter, clip-path/masks, or shadow when smooth; do not rely on transform/opacity alone.
- **Shipping:** real content, working controls, responsive composition, keyboard focus, and the states users hit: hover, disabled, loading, error, and empty.
- **Copy:** use the product's language; controls name their action, errors name the problem and recovery.
- **Coverage:** every brief requirement must exist and be findable within seconds.

Before finishing changed UI, follow the quality guidance supplied by `context.mjs` and hooks. Context requests a manual scan only when no automatic detector is active; never add a second detector pass.

- Display tracking stops at -0.04em; -0.02 to -0.03em is usually enough.
- Declare elevation once: border or shadow, not both as decoration. Keep container radii modest; reserve pills for small controls.
- Use real illustration or none. Treat backgrounds as surfaces and add texture only from the subject's world. Claims, evidence, and configuration come from supplied truth; label illustrative behavior and unresolved values honestly.

