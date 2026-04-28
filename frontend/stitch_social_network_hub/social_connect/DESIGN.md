---
name: Social Connect
colors:
  surface: '#f8f9fe'
  surface-dim: '#d9dade'
  surface-bright: '#f8f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f8'
  surface-container: '#edeef2'
  surface-container-high: '#e7e8ec'
  surface-container-highest: '#e1e2e7'
  on-surface: '#191c1f'
  on-surface-variant: '#414754'
  inverse-surface: '#2e3134'
  inverse-on-surface: '#f0f0f5'
  outline: '#727785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005bc0'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#54606a'
  on-secondary: '#ffffff'
  secondary-container: '#d8e4f0'
  on-secondary-container: '#5a6670'
  tertiary: '#116b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#188700'
  on-tertiary-container: '#f8ffef'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#d8e4f0'
  secondary-fixed-dim: '#bcc8d3'
  on-secondary-fixed: '#111d25'
  on-secondary-fixed-variant: '#3d4852'
  tertiary-fixed: '#86fd68'
  tertiary-fixed-dim: '#6adf4f'
  on-tertiary-fixed: '#022100'
  on-tertiary-fixed-variant: '#0b5300'
  background: '#f8f9fe'
  on-background: '#191c1f'
  surface-variant: '#e1e2e7'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  container-max: 1200px
  sidebar-width: 320px
  feed-width: 680px
---

## Brand & Style

The brand personality of this design system is approachable, reliable, and community-focused. It aims to evoke a sense of familiarity and ease of use, prioritizing content and human connection over decorative flair. The target audience is broad and multi-generational, requiring a UI that feels intuitive and stable.

The design style follows a **Corporate / Modern** approach. It leverages a clean, high-clarity aesthetic that balances white space with structured information density. By utilizing a "content-first" philosophy, the interface remains unobtrusive, allowing user-generated media and social interactions to take center stage. The result is a professional yet friendly environment that feels both high-utility and welcoming.

## Colors

This design system utilizes a clean, light-mode default palette optimized for readability and long-session comfort. 

- **Primary Blue (#1877F2):** Used for primary actions, active navigation states, and brand-critical elements.
- **Secondary Blue (#E7F3FF):** A soft tint used for button backgrounds and highlight states to provide contrast without visual fatigue.
- **Success Green (#42B72A):** Reserved for positive confirmation and online status indicators.
- **Neutral Grays:** A scale ranging from deep charcoal (#1C1E21) for headings to medium gray (#65676B) for secondary text and light gray (#F0F2F5) for global background fills.

Contrast ratios are strictly maintained to ensure accessibility across all interactive elements.

## Typography

The choice of **Plus Jakarta Sans** provides a modern, soft, and welcoming feel that enhances the friendly nature of the platform. It features high x-heights and open counters, which ensure exceptional legibility on mobile and desktop screens alike.

Type scales are used to create a clear information hierarchy. Bold weights are reserved for names and section headers, while regular weights handle the bulk of user-generated content. Secondary information, such as timestamps and metadata, uses a reduced font size and a muted neutral color to recede visually.

## Layout & Spacing

The layout utilizes a **fixed grid** system for the main content feed to maintain focus, while the surrounding navigation elements respond to the viewport width. 

- **Feed-Centric Design:** The central column is optimized for readability at a maximum width of 680px.
- **Sidebar Navigation:** A structured left-hand sidebar (320px) houses primary navigation links and user shortcuts.
- **Spacing Rhythm:** An 8px linear scale (with 4px increments for tight UI) governs all padding and margins, ensuring vertical and horizontal rhythm throughout the cards and containers.
- **Guttering:** 16px gutters provide breathing room between the sidebars and the primary feed.

## Elevation & Depth

This design system uses **Tonal Layers** and **Ambient Shadows** to define hierarchy. Depth is not meant to be aggressive but rather to suggest a physical stacking of information.

- **Background:** The lowest layer is the global background (#F0F2F5).
- **Surface:** Post cards and navigation bars sit on the surface layer (#FFFFFF).
- **Shadows:** Elements on the surface layer use a very soft, diffused shadow (0px 2px 4px rgba(0,0,0,0.05)) to separate them from the background.
- **Interaction:** On hover, cards may transition to a slightly deeper shadow or a subtle gray tint to indicate interactivity.

## Shapes

The shape language is defined by a **Rounded** philosophy. Circular elements are used for biological entities (avatars), while rounded rectangles are used for structural containers (cards, buttons).

- **Avatars:** Strictly circular (50% border-radius) to emphasize the human element.
- **Cards & Containers:** 0.5rem (8px) base radius to soften the interface.
- **Input Fields & Buttons:** 0.5rem (8px) to match the container language, ensuring a cohesive look across all interactive components.

## Components

### Cards
Post cards are the primary unit of the feed. They feature a white background, 8px corner radius, and 16px internal padding. The header contains a circular avatar, the user's name in bold, and a timestamp.

### Buttons
- **Primary:** Solid #1877F2 with white text.
- **Secondary:** Light blue (#E7F3FF) background with #1877F2 text.
- **Ghost:** No background, #65676B text, turning to a light gray tint on hover.

### Interaction Icons
Like, Comment, and Share actions are represented by clear, medium-weight stroke icons. When active (e.g., "Liked"), the icon and label transition to the primary blue.

### Sidebar Navigation
The sidebar uses a list-item format with 8px of vertical spacing between items. Each item includes a 36px icon (often colored) and a 14px semi-bold label. Hover states are indicated by a subtle gray background (#E4E6EB).

### Input Fields
Search bars and comment inputs utilize a pill-shaped or 8px rounded container with a light gray fill (#F0F2F5) and no border, providing a soft, modern appearance.