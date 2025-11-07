# RTO Compliance Dashboard Prototype

A simplified, frontend-focused compliance dashboard demonstrating key UI patterns and workflows for Registered Training Organization compliance management.

**Experience Qualities**:
1. **Professional** - Conveys authority and trustworthiness appropriate for regulatory compliance work
2. **Clarity-focused** - Complex compliance data presented in scannable, hierarchical layouts that prioritize actionable insights
3. **Efficient** - Minimal clicks to surface critical alerts, gaps, and upcoming deadlines

**Complexity Level**: Light Application (multiple features with basic state)
- This is a prototype demonstrating UI patterns for a larger system. It uses mock data and local persistence to simulate core workflows without backend infrastructure.

## Essential Features

### Dashboard Overview
- **Functionality**: At-a-glance compliance health with key metrics and alerts
- **Purpose**: Executives and compliance officers need immediate visibility into risk areas
- **Trigger**: Landing page on app load
- **Progression**: View summary cards → Identify red/amber items → Click through to detailed module
- **Success criteria**: User can identify top 3 priority items within 5 seconds

### Standards Mapping View
- **Functionality**: Visual representation of which RTO standards are mapped to policies/evidence
- **Purpose**: Identify gaps in compliance coverage before audits
- **Trigger**: Navigate to "Standards" from main nav
- **Progression**: View standards list → Filter by coverage status → See mapped artifacts → Identify unmapped items
- **Success criteria**: Coverage percentage visible per standard; gaps highlighted in warning color

### Policy Library
- **Functionality**: Searchable catalog of policies with metadata (owner, review date, version)
- **Purpose**: Centralized access to current governance documents
- **Trigger**: Navigate to "Policies" from main nav
- **Progression**: Browse/search policies → View detail card → See linked standards and review status
- **Success criteria**: Policies due for review within 30 days flagged prominently

### Training Products
- **Functionality**: List of training courses with linked SOPs and assessment materials
- **Purpose**: Ensure each product has required documentation
- **Trigger**: Navigate to "Training" from main nav
- **Progression**: View products → Check completion status → Identify incomplete linkages
- **Success criteria**: Incomplete products visually distinct; status badges clear

### Professional Development Tracker
- **Functionality**: Staff credentials and PD completion status
- **Purpose**: Monitor workforce compliance and expiring credentials
- **Trigger**: Navigate to "PD & Staff" from main nav
- **Progression**: View staff list → See credential expiry alerts → Filter by due/overdue
- **Success criteria**: Credentials expiring in ≤30 days highlighted; overdue items in destructive color

## Edge Case Handling
- **Empty states**: When no data exists, show helpful prompts with suggested actions (e.g., "No policies uploaded yet. Add your first policy to begin tracking.")
- **Search with no results**: Clear messaging with option to reset filters
- **Missing linked data**: Display placeholder text rather than errors when references are broken
- **Mobile viewport**: Responsive tables collapse to cards; nav switches to hamburger menu

## Design Direction
The design should evoke trust, precision, and clarity—characteristics essential in regulatory compliance. It should feel serious and professional without being bureaucratic or dull. A clean, minimal interface serves the density of information better than rich decoration, allowing complex data to breathe and hierarchy to emerge naturally.

## Color Selection
**Triadic scheme** with blue (trust/authority), amber (caution), and green (compliance/success) as the three anchor colors, reflecting the status-driven nature of compliance work.

- **Primary Color**: Deep Blue `oklch(0.45 0.15 250)` — Communicates professionalism, trust, and stability appropriate for regulatory context
- **Secondary Colors**: 
  - Neutral Gray `oklch(0.60 0.02 250)` for subdued backgrounds and supporting UI
  - Slate `oklch(0.25 0.02 250)` for high-contrast text
- **Accent Color**: Amber `oklch(0.75 0.15 70)` — Warning/alert color for items requiring attention (due dates, gaps)
- **Success Color**: Green `oklch(0.65 0.18 150)` — Indicates compliant, complete, or healthy status
- **Destructive**: Red `oklch(0.55 0.22 25)` — Reserved for overdue, critical, or error states

**Foreground/Background Pairings**:
- Background (White `oklch(0.98 0 0)`): Slate text `oklch(0.25 0.02 250)` — Ratio 14.2:1 ✓
- Card (Light Gray `oklch(0.96 0.01 250)`): Slate text — Ratio 13.1:1 ✓
- Primary (Deep Blue `oklch(0.45 0.15 250)`): White text `oklch(0.98 0 0)` — Ratio 8.9:1 ✓
- Accent (Amber `oklch(0.75 0.15 70)`): Slate text `oklch(0.25 0.02 250)` — Ratio 6.2:1 ✓
- Success (Green `oklch(0.65 0.18 150)`): White text — Ratio 4.8:1 ✓
- Destructive (Red `oklch(0.55 0.22 25)`): White text — Ratio 5.1:1 ✓

## Font Selection
The typeface should convey clarity and modern professionalism, with excellent readability at small sizes given the data density. **Inter** is chosen for its geometric precision, open apertures, and extensive weight range—ideal for UI with mixed data and prose.

**Typographic Hierarchy**:
- H1 (Page Title): Inter SemiBold/32px/tight (-0.02em) — Used for module headers
- H2 (Section): Inter SemiBold/24px/tight — Card titles and subsection headers
- H3 (Subsection): Inter Medium/18px/normal — List headers, table headers
- Body (Default): Inter Regular/15px/relaxed (1.6) — Main content, descriptions
- Small (Metadata): Inter Regular/13px/normal — Timestamps, secondary info, labels
- Micro (Labels): Inter Medium/11px/wide (0.02em) uppercase — Status badges, tags

## Animations
Animations should reinforce clarity and hierarchy, not entertain. Motion is purposeful: guiding attention to state changes (status updates, new alerts) and maintaining spatial continuity during navigation. The overall feel is crisp and efficient—brief, decisive transitions.

**Purposeful Meaning**: Subtle scale and opacity shifts on interactive elements communicate affordance; color transitions for status badges communicate state changes clearly.

**Hierarchy of Movement**:
- Critical alerts: Gentle fade-in with micro-bounce (200ms) to draw eye
- Navigation transitions: Fade + slide (300ms) to maintain spatial orientation
- Status badges: Color transition only (150ms)—no movement to avoid distraction
- Hover states: Scale 1.02 + shadow increase (100ms)—light tactile feedback

## Component Selection

**Components**:
- **Card**: Primary container for all data modules (policies, standards, staff); subtle shadow for elevation
- **Badge**: Status indicators (Compliant, Due, Overdue, Incomplete); use `variant` for semantic coloring
- **Table**: Standards and policy lists; sticky headers on scroll
- **Tabs**: Switch between dashboard views (Overview, Policies, Standards, etc.)
- **Progress**: Visual compliance coverage bars
- **Avatar**: Staff images in PD tracker
- **Button**: Primary (blue) for CTAs, Secondary (gray) for cancel/back, Destructive (red) for delete actions
- **Input + Label**: Search and filter controls
- **Alert**: Warnings and info callouts for gap summaries
- **Separator**: Divides card sections cleanly
- **ScrollArea**: Ensures long lists remain performant and accessible

**Customizations**:
- Custom stat cards with large metric numbers and trend indicators (up/down icons)
- Custom compliance meter component showing percentage with color-coded thresholds (<70% red, 70-89% amber, ≥90% green)
- Timeline component for policy review history (not in shadcn; custom build with vertical line + nodes)

**States**:
- Buttons: Hover shows subtle bg shift, active shows scale-down, disabled is muted opacity
- Table rows: Hover highlights row with light background, selected row has border-left accent
- Search input: Focus shows ring in primary color

**Icon Selection**:
- **@phosphor-icons/react** for all iconography
- Navigation: `House`, `FileText`, `GraduationCap`, `Users`, `ChartBar`
- Status: `CheckCircle` (compliant), `Warning` (due), `XCircle` (overdue), `Clock` (pending)
- Actions: `Plus`, `MagnifyingGlass`, `Funnel`, `Download`

**Spacing**:
- Page padding: `p-6` (24px) on desktop, `p-4` (16px) on mobile
- Card internal padding: `p-6`
- Gap between cards: `gap-6`
- Section spacing: `space-y-4` (16px) for related items, `space-y-8` (32px) for distinct sections
- Inline elements (badge groups, button groups): `gap-2` (8px)

**Mobile**:
- Navigation collapses to bottom tab bar with icons only
- Tables switch to stacked card layout with key fields only
- Dashboard stat cards remain full-width, stack vertically
- Search/filter controls stack vertically
- Avatar + name combinations show avatar only on <640px
