# Field Terminal — the design system behind Pokenode·Dex

A Pokédex that reads like a piece of field equipment: instrument-like, dense,
and quiet. Not skeuomorphic — there is no plastic shell and no D-pad. The
hardware reference is in the *behaviour* of the surface (hairlines, tight radii,
tabular figures, a live status rail) rather than in a picture of a device.

The app exists to demonstrate [pokenode-ts](https://pokenode-ts.vercel.app/), so
the design has one unusual requirement: the machinery has to be visible. A cache
hit, a 304, a cancelled request — these are *content* here, and the system gives
them a permanent home instead of hiding them in devtools.

---

## 1. Principles

**Type colour is data ink.** The eighteen type colours encode identity in chips,
stat bars, matchup cells and evolution edges. They are never used for decoration,
never for a background wash, never to make a page feel "fire-y". If a colour is
on screen, it means something.

**Hairlines, not shadows.** Structure comes from 1px `--color-line` borders and
from three surface levels. Shadows are reserved for things that genuinely float
above the page — currently only the command palette's backdrop.

**Figures align.** Every number is monospace with `tabular-nums`. A dex is read
by scanning columns; proportional digits make that harder for no gain.

**The instrument reports.** The status rail is always present and always honest.
It shows what the transport did, including the boring answers.

---

## 2. Colour

### Structure

Three layers, in `src/styles/theme.css`:

1. `@theme` — static tokens that never change with the theme (fonts, radii, easing).
2. `@theme inline` — semantic names (`--color-surface-1`, `--color-ink-hi`) that
   forward to the flipping variables. `inline` matters: it resolves the reference
   at definition time, so the generated utilities follow the flip.
3. `:root` and `.dark` — the actual values.

Tailwind v4 is CSS-first. There is no `tailwind.config.js` and there should not be one.

### The rule that keeps components clean

Components use semantic tokens — `bg-surface-1`, `text-ink-mid`, `border-line` —
so a `dark:` variant is rare by construction. **A component sprinkled with `dark:`
is a missing token.** Reach for the variant only where a token cannot express the
difference (image treatment, shadow strength).

### Surfaces and ink

| Token | Role |
|---|---|
| `surface-0` | the page |
| `surface-1` | panels, the top bar, the status rail |
| `surface-2` | wells — inputs, insets, the active nav item |
| `line` / `line-strong` | hairlines; `-strong` is the hover state |
| `ink-hi` | headings, values, anything being read for its content |
| `ink-mid` | body text |
| `ink-lo` | labels, units, metadata |
| `accent` | focus, selection, the current item |
| `positive` / `negative` / `caution` | cache hit / error / network, in the rail |

### The type palette

The canonical Pokémon type colours are the **hue source only**. Several fail
contrast outright — electric yellow and ice blue are unreadable on a light
surface — so the values are derived rather than copied:

1. Take the hue angle of the canonical hex in OKLCH.
2. Keep the *relative* lightness and chroma of the canonical colour, remapped into
   a theme-safe band (`L 0.72–0.88` dark, `L 0.40–0.56` light).
3. Push lightness away from the surface until the pairing clears 4.5:1.

Step 2 is the one that matters. An earlier pass forced uniform lightness and
chroma, which was contrast-safe and useless: hue alone had to carry eighteen
values, and dragon/steel and fire/dark came out **byte-identical**. Preserving
the canonical relationships keeps steel pale, dragon vivid, dark muddy — the
distinctions people already know.

**Known limitation.** Some pairs remain perceptually close — electric/ground,
psychic/fairy, bug/rock — because their canonical hues genuinely are. This is
acceptable *only* because colour is never the sole channel: every chip carries
its name. Do not remove the label to save space.

### Applying a type colour

Tailwind extracts class names statically, so `` bg-type-${name} `` emits nothing.
Type colour is passed as a custom property instead:

```tsx
<span className="type-chip" style={{ '--t': typeVar(name) } as CSSProperties}>
  {name}
</span>
```

`typeVar()` (`src/lib/types.ts`) is the only place that maps a name to a token,
and it falls back to `ink-lo` for anything that is not a battle type.

### Enforcement

`node tools/check-contrast.mjs` parses `theme.css` and asserts all 134 pairings —
every type and ink colour against all three surfaces, in both themes, plus
`accent-ink` on `accent`. It reads the shipped values rather than a copy, so it
fails when the tokens drift. It is part of `pnpm check`.

---

## 3. Typography

| Family | Used for |
|---|---|
| **Space Grotesk** | UI, headings, body — technical without being a default |
| **JetBrains Mono** | every number, id, code sample, and the status rail |

`th`, `td`, `output`, `time` and anything marked `data-numeric` get the mono
family and `tabular-nums` from the base layer, so alignment is the default rather
than something each table remembers.

- Dex numbers are always four-digit zero-padded: `#0025`. Five-digit alternate-form
  ids are left intact rather than truncated.
- `--text-micro` (0.6875rem, uppercase, wide tracking) is the label size — used for
  every field name, unit and rail entry.

---

## 4. Layout and motion

- Content maxes at `1400px`. The top bar and status rail are sticky; the main
  column scrolls between them.
- **The shell is fixed and only `main` scrolls**, on a phone as much as a desk.
  That costs the mobile address bar's auto-hide, and buys a status rail that is
  never scrolled away from — which is the point of the app. The bar and the rail
  are held to ~92px and ~44px on a phone so the trade stays worth making: the bar
  gives the nav a row of its own below `sm`, and the rail scrolls sideways rather
  than wrapping to three lines.
- **A phone is the narrow case, not the broken one.** Anything the reader acts on
  — a move menu, a guess field, a filter — belongs on screen with whatever it
  acts on, at 375×667 and up. The battle is the worked example: its two
  combatants sit side by side at *every* width, because stacking them put the
  scene at 500px and pushed the move menu below the fold.
- Radii are tight: `--radius-panel: 6px`, `--radius-well: 4px`, chips fully round.
- The dex grid is virtualized by row, with the column count derived from the
  container width so the virtualizer always knows the row height.
- Motion reports a state change and nothing else: a page arriving, a panel
  swapping under a picker, a tally moving, a transport tier answering. Decoration
  does not qualify.
- Every animation eases on `--ease-instrument` (`cubic-bezier(0.16, 1, 0.3, 1)`)
  and takes its duration from `--dur-quick` / `--dur-base` / `--dur-slow`, so
  pacing is tuned in one place. A hard-coded `ms` belongs only to a keyframe with
  its own rhythm (`art-shake`, `art-bloom`).
- The vocabulary is small and reused: `.rise` / `.rise-fast` for arrival,
  `.fade-in` for a swap, `.pop` for a figure that moved, `.stagger` for a series.
  A new keyframe needs a reason none of those covers.
- Motion never carries meaning on its own — the tier that answered is named in
  the rail whether or not the line moved.
- Nothing inside a scroll container is animated per item. Virtualized rows mount
  and unmount as they scroll, so the container fades, never the row.
- Everything is behind `prefers-reduced-motion`, killed globally in the base layer.

---

## 5. Components

**Status rail** — the signature element, and the reason the app is a demo rather
than a Pokédex that happens to use a library. Fed by pokenode-ts's `logger`, it
reports the last request, which tier answered (`L2 hit`, `304`, `coalesced`,
`network`), running tallies, and a *clear caches* control that drops both tiers.
Colour follows meaning: green for a hit, amber for a real round trip, red for a
failure.

**Type chip** — colour plus label, always both. Links to the type page unless it
is a matchup cell, where it is a label.

**Stat bar** — `role="meter"` with real `aria-valuenow/min/max`, tinted with the
Pokémon's primary type, scaled against 255 (Blissey's HP, the highest base stat).

**Sprite viewer** — the sets the API publishes, switchable, with shiny / back /
female as facets. The controls mirror `PokemonSpriteOptions`, which is a
discriminated union: `home` has no back-facing sprite, `official-artwork` has no
gendered one, `dream-world` has no shiny. Unsupported facets are **disabled and
explained on hover, never hidden** — the constraint is part of what the page is
teaching. The sprite repository is also incomplete, so a missing image falls back
to a note rather than a broken icon.

**Evolution graph** — a real directed graph, laid out by recursion rather than by
measuring coordinates: each species sits beside a column of what it evolves into,
so Eevee's eight branches fan out with no layout maths. Edges carry the trigger
("level 30", "trade: holding metal coat"), and the species being viewed is marked
with `aria-current`.

**Dex filters** — name, generation and type, all in the URL as typed search
params, so any view is shareable. Generation and type resolve to id sets through
their own cached queries and intersect client-side. A set still in flight is
skipped rather than treated as empty, so the grid narrows as filters land instead
of blanking and refilling.

**Command palette** — a native `<dialog>`, which supplies focus trapping, Escape
and the backdrop for free. Combobox semantics with `aria-activedescendant`;
prefix matches rank above substring matches.

**Error state** — renders `PokenodeError`'s status, status text and URL. A failure
should say which request failed, never "something went wrong".

---

## 6. Accessibility contract

Non-negotiable, and checked as part of the build where a machine can check it:

- Every type is identified by its **name**, not only its colour.
- All 134 colour pairings clear 4.5:1 — enforced by `check:contrast`.
- **Every control clears 2rem on a coarse pointer**, against the 24px WCAG 2.5.8
  asks for. Enforced once, in `index.css`, rather than per component: `button`
  and `select` take a `min-height` and `.type-chip` takes the padding that lifts
  a chip-shaped button with them.
- **No form control is under 16px on a coarse pointer.** iOS Safari zooms into
  anything smaller on focus and never zooms back out. Same block in `index.css`,
  and it carries `!important` deliberately — Tailwind emits its utilities in a
  later layer, so `text-sm` would otherwise win.
- Nothing is reachable by shortcut alone. The command palette answers ⌘K *and* a
  button in the top bar, because a phone has no ⌘K.
- `autoFocus` is for fine pointers only. On a phone it answers with the on-screen
  keyboard, over the content the field is about.
- Stat bars are meters with real values.
- The palette traps focus and closes on Escape (native `<dialog>`).
- All motion respects `prefers-reduced-motion`.
- Sprites are cross-origin, so they carry `loading="lazy"`, `decoding="async"`,
  `referrerPolicy="no-referrer"` and explicit dimensions to prevent layout shift.
- Decorative sprites use `alt=""`; the name beside them is the accessible label.
