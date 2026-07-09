---
name: Luminous Professional Dashboard
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f2'
  surface-container: '#efedec'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1b'
  on-surface-variant: '#574140'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0ef'
  outline: '#8b7170'
  outline-variant: '#debfbe'
  surface-tint: '#a93539'
  primary: '#a93539'
  on-primary: '#ffffff'
  primary-container: '#f06a6a'
  on-primary-container: '#62000e'
  inverse-primary: '#ffb3b0'
  secondary: '#5b5f64'
  on-secondary: '#ffffff'
  secondary-container: '#dde0e6'
  on-secondary-container: '#5f6368'
  tertiary: '#006c48'
  on-tertiary: '#ffffff'
  tertiary-container: '#00aa74'
  on-tertiary-container: '#003522'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410006'
  on-primary-fixed-variant: '#881d24'
  secondary-fixed: '#dfe3e8'
  secondary-fixed-dim: '#c3c7cc'
  on-secondary-fixed: '#181c20'
  on-secondary-fixed-variant: '#43474c'
  tertiary-fixed: '#77fbbd'
  tertiary-fixed-dim: '#58dea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fbf9f8'
  on-background: '#1b1c1b'
  surface-variant: '#e4e2e1'
  surface-main: '#FBF9F8'
  surface-card: '#FFFFFF'
  border-subtle: '#E5E1E0'
  text-heading: '#202124'
  text-body: '#5F6368'
  broadcast-blue: '#1A73E8'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 260px
  container-max-width: 1600px
  gutter: 1.5rem
  margin-page: 2rem
  row-height-dense: 40px
  row-height-standard: 56px
---

## Brand & Style
The brand personality is authoritative yet approachable, blending high-efficiency broadcast management with a sophisticated "Luminous" aesthetic. It targets broadcast professionals who require precision and clarity over long working hours. 

The design style is **Corporate Modern with a Soft Minimalist twist**. It prioritizes a high-density, professional layout but avoids the coldness of traditional enterprise software by using warm-toned backgrounds and soft coral accents. The interface uses crisp borders for structural definition and generous white space within components to ensure readability during complex task management.

## Colors
This design system utilizes a specialized "Warm Professional" palette. The **Primary Coral (#F06A6A)** is used sparingly for call-to-action elements, critical status indicators, and active navigation states to maintain its "Luminous" impact without causing visual fatigue. 

The **Neutral Surface (#FBF9F8)** provides a soft, warm-gray foundation that reduces screen glare compared to pure white. **Pure White (#FFFFFF)** is reserved for elevated cards and data containers to create a clear "layer" effect. Secondary actions and metadata utilize the **Cool Gray (#5F6368)** for clear visual de-prioritization.

## Typography
The typography is centered on **Hanken Grotesk**, a sharp, contemporary sans-serif that balances Swiss-style neutrality with modern approachability. This is used for all branding and primary UI headings. 

For data-heavy environments, **Inter** is employed as the secondary label and tabular font due to its exceptional legibility at small sizes and its optimized numeric glyphs. This ensures that broadcast schedules and timestamps remain readable in high-density tables. Headlines use tight letter spacing for a more "designed" editorial feel, while labels are slightly tracked out for clarity.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model optimized for large desktop displays. A fixed **260px left-hand sidebar** houses primary navigation, while the main content area utilizes a fluid 12-column grid that caps at **1600px** to maintain readability on ultra-wide monitors.

Information density is managed through two specific modes: **Standard** (for configuration and settings) and **Dense** (for broadcast schedules and asset logs). The vertical rhythm is built on an 8px base unit. In dense data views, gutters are reduced to 1rem to maximize the number of visible columns without horizontal scrolling.

## Elevation & Depth
Depth is conveyed primarily through **Tonal Layers** and **Crisp Outlines** rather than heavy shadows. 
- **Level 0 (Base):** The main background uses the warm Neutral (#FBF9F8).
- **Level 1 (Containers):** Cards and tables use a white background with a 1px solid border (#E5E1E0).
- **Level 2 (Interaction):** Hover states use a subtle 4px blur shadow with a tint of the primary color at 5% opacity to indicate interactivity without breaking the clean aesthetic.
- **Level 3 (Modals):** Overlays use a more pronounced 16px soft shadow and a backdrop blur of 8px to focus the user on the task at hand.

## Shapes
The shape language is **Soft and Architectural**. A subtle 0.25rem (4px) corner radius is applied to all standard components (inputs, buttons, cards) to maintain a professional, "efficient" feel that doesn't lean too heavily into consumer-grade playfulness. Larger containers like the main sidebar or dashboard panels use 0.5rem (8px) for a slightly more refined structural appearance.

## Components

### Buttons & Inputs
- **Primary Button:** Solid #F06A6A with white text. No gradient. 4px border radius.
- **Secondary Button:** Ghost style with #F06A6A border and text.
- **Input Fields:** #FFFFFF background with 1px #E5E1E0 border. On focus, the border changes to #F06A6A with a 2px outer "glow" of 10% opacity coral.

### Data Tables (The Core)
- **Header:** Light gray (#F1EEEB) background, uppercase Inter labels.
- **Rows:** Alternating "zebra" stripes are not used; instead, use thin 1px horizontal dividers. 
- **High-Density View:** Cell padding reduced to 8px top/bottom. Use status dots (Coral for 'Live', Blue for 'Scheduled', Gray for 'Draft').

### Side Navigation
- **Active State:** A vertical coral bar (4px width) on the left edge of the menu item, with a light coral (5% opacity) background fill across the row.
- **Icons:** Use 20px stroke-based icons with a 1.5px weight for a crisp, technical look.

### Cards & Metrics
- Dashboards use white cards with "Title-sm" headers. 
- Important broadcast metrics (e.g., Viewers, Bitrate) should be displayed in "Display-lg" coral text for immediate visibility.