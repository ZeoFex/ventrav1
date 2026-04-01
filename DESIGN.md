# The Design System: Editorial Precision & Organic Depth

## 1. Overview & Creative North Star: "The Financial Atelier"
This design system rejects the "SaaS-in-a-box" aesthetic. Our Creative North Star is **The Financial Atelier**—a space where business management feels less like data entry and more like high-end curation. We combine the architectural rigor of a Swiss bank with the tactile, inviting warmth of a boutique retail space.

We break the traditional rigid grid through **Intentional Asymmetry**. Dashboards should not be a uniform 3x3 grid; they should use varying card widths and "Editorial Overlaps" (e.g., a floating action button or a secondary metric slightly overlapping a primary container) to create visual interest. This system signals that the software is sophisticated enough to handle complex financial records, yet refined enough to be a joy to use.

---

## 2. Colors: Tonal Integrity & The "No-Line" Rule
Our palette is rooted in the authority of `primary` (#003527) and the freshness of `secondary` (#006c49). We treat color as a structural element, not just an accent.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or tonal transitions. To separate a sidebar from a main content area, use a shift from `surface` (#f7f9fb) to `surface-container-low` (#f2f4f6). Lines create visual "noise"; tonal shifts create "atmosphere."

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
- **Base Layer:** `surface` (#f7f9fb)
- **Primary Layout Sections:** `surface-container-low` (#f2f4f6)
- **Standard Cards:** `surface-container-lowest` (#ffffff)
- **Active/Hover States:** `surface-container-high` (#e6e8ea)

### The "Glass & Gradient" Rule
To achieve a "top-tier agency" look, use Glassmorphism for floating overlays (Modals, Dropdowns). Use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur. 
**Signature Textures:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#003527) to `primary-container` (#064e3b) at a 135-degree angle to provide a deep, lustrous finish.

---

## 3. Typography: Sophisticated Hierarchy
We use a dual-font approach to balance character with readability.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Editorial" voices. Use `display-lg` to `headline-sm` for high-level data summaries and page titles. The generous x-height and modern curves of Plus Jakarta Sans convey warmth and "expensive" taste.
*   **Body & UI (Inter):** For financial records, density, and functional labels, Inter provides unmatched clarity. 

**Visual Hierarchy Tip:** Always pair a `headline-md` (Plus Jakarta Sans) with a `label-md` (Inter) in `on-surface-variant` (#404944) for subtext. The contrast between the serif-like personality of Jakarta and the utilitarian nature of Inter creates an authoritative, polished look.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty." In this design system, depth is achieved through light and layering.

*   **The Layering Principle:** Place a `surface-container-lowest` card (#ffffff) on a `surface-container-low` (#f2f4f6) background. This creates a natural "lift" using the `xl` (0.75rem) roundedness scale without a single pixel of shadow.
*   **Ambient Shadows:** When a float is required (e.g., a primary action menu), use a shadow with a blur of `32px` at 4% opacity. The shadow color must be a tint of our primary: `rgba(0, 53, 39, 0.04)`. This mimics natural light passing through a green forest canopy.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use a "Ghost Border": `outline-variant` (#bfc9c3) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Primitives

### Buttons & Interaction
- **Primary:** Gradient (`primary` to `primary-container`), `md` (0.375rem) radius. Text in `on-primary` (#ffffff).
- **Secondary:** `surface-container-highest` (#e0e3e5) with `on-surface` (#191c1e) text. No border.
- **Tertiary:** Text-only in `secondary` (#006c49) with a 2px underline appearing only on hover.

### Inputs & Fields
- **Container:** Use `surface-container-lowest` (#ffffff) with a 1px "Ghost Border." 
- **Focus State:** Transition the Ghost Border to 100% opacity `primary-fixed-dim` (#95d3ba) and add a `2px` soft outer glow in the same color.

### Cards & Lists (The "No Divider" Rule)
Forbid the use of divider lines in lists. 
- Use **Vertical White Space**: Utilize the `3` (1rem) or `4` (1.4rem) spacing tokens to separate items.
- Use **Subtle Alternation**: Use `surface-container-low` for every second item in a high-density financial list to maintain readability without structural clutter.

### Signature Component: The "Metric Glass" Card
For retail management stats, use a card with:
- Background: `surface-container-lowest` at 70% opacity.
- Blur: `12px`.
- Border: `px` width, `outline-variant` at 20% opacity.
- Accent: A `2px` top-border in `secondary-fixed` (#6ffbbe).

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetric Spacing:** Use a larger spacing token (e.g., `8`) for the top of a section and a smaller one (e.g., `4`) for the bottom to create an editorial "pull."
*   **Embrace Mint Accents:** Use `secondary-fixed` (#6ffbbe) sparingly for "Success" states and positive financial trends—it provides a "glow" against the deep greens.
*   **Prioritize Breathing Room:** When in doubt, increase the white space. High-end software feels "expensive" because it isn't cramped.

### Don't:
*   **Never Use Pure Black Shadows:** This kills the professional green palette. Always tint shadows with `primary`.
*   **No 100% Opaque Borders:** This is the quickest way to make the design system look like a generic template.
*   **Don't Center Everything:** Modern SaaS thrives on left-aligned editorial layouts. Avoid centered text for anything other than empty states or ultra-minimal modals.
