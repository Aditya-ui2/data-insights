# DataInsights Design Guidelines

## Design Approach
**Hybrid Strategy**: Combine the structured clarity of enterprise BI tools (Power BI, Tableau) with the premium aesthetic of modern SaaS platforms (Linear, Stripe). The application balances data-dense functionality with a luxurious, futuristic visual language.

**Core References**:
- Data presentation: Power BI's dashboard layouts, Tableau's visualization hierarchy
- Premium SaaS feel: Linear's typography, Stripe's restraint and spacing
- Onboarding flow: Replit's conversational user interview style

---

## Typography System

**Font Families** (Google Fonts via CDN):
- **Primary**: Inter (400, 500, 600, 700) - UI, body text, data labels
- **Display**: Space Grotesk (500, 700) - Headlines, hero text, section titles

**Scale**:
- Hero headline: 4xl-6xl, font-bold, Space Grotesk
- Section titles: 2xl-3xl, font-semibold, Space Grotesk  
- Dashboard titles: xl-2xl, font-semibold, Inter
- Body text: base-lg, font-normal, Inter
- Data labels: sm-base, font-medium, Inter
- Captions/meta: xs-sm, font-normal, Inter

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4, m-6 (component padding)
- Section spacing: py-12, py-16, py-20 (vertical rhythm)
- Large gaps: gap-8, gap-12 (dashboard grids)

**Grid System**:
- Landing page: Full-width sections with max-w-7xl containers
- Dashboard: 12-column grid for flexible chart arrangements
- Sidebar navigation: Fixed 16-20 width on desktop, collapsible on mobile

**Responsive Breakpoints**:
- Mobile: Single column, stacked components
- Tablet (md): 2-column grids for features, full dashboard visible
- Desktop (lg+): Multi-column dashboards, side-by-side layouts

---

## Component Library

### Landing/Onboarding Pages

**Hero Section** (80vh):
- Large animated headline with gradient text treatment
- Subtitle explaining value proposition
- Primary CTA button (large, prominent)
- Background: Subtle geometric patterns or abstract data visualization
- Include hero image: Isometric illustration of dashboard with glowing data points and connection lines

**Onboarding Flow**:
- Multi-step card-based interview (like Replit)
- Progress indicator at top
- Question cards with generous whitespace
- Input fields with clear labels and placeholder text
- Animated transitions between steps

**Feature Showcase** (3-column grid on desktop):
- Icon + Title + Description cards
- Hover elevation effect
- Icons from Heroicons (outline style)
- Each card: p-6, rounded-xl, border treatment

**Social Proof Section**:
- Stats in 3-4 column layout with large numbers
- Animated counter effect on scroll
- Format: Large number + label below

### Application Dashboard

**Navigation**:
- Left sidebar (fixed, 16-20 width)
- Logo at top
- Main navigation items with icons (Heroicons)
- User profile at bottom
- Collapsible on mobile (hamburger menu)

**Dashboard Canvas**:
- Header: Dashboard title, share button, last updated timestamp
- Grid layout: 12 columns, auto-rows
- Cards for each visualization with consistent padding (p-6)
- Card structure: Title, optional subtitle, chart area, optional footer with insights

**Chart Components**:
- Bar/Line/Pie charts: Use Chart.js or Recharts
- Consistent padding within chart cards
- Clear axis labels, legends positioned top-right or bottom
- Data labels on hover only (avoid clutter)
- KPI tiles: Large number (4xl), label below, optional trend indicator

**Data Table**:
- Striped rows for readability
- Fixed header on scroll
- Alternating row treatment
- Compact padding (py-2, px-4) for data density
- Sortable column headers with icons

### AI Chatbot Interface

**Chat Container**:
- Full height sidebar or modal overlay
- Message list with scroll
- Input field fixed at bottom
- Clear visual distinction between user and AI messages

**Message Bubbles**:
- User messages: Right-aligned, rounded-2xl, px-4 py-3
- AI responses: Left-aligned, includes avatar icon
- Timestamp below each message (text-xs)
- Code blocks or data tables within AI responses formatted clearly

**Input Area**:
- Multi-line textarea with auto-expand
- Send button (icon only, positioned right)
- Character count or usage indicator (5 actions remaining)
- Placeholder: "Ask anything about your data..."

### Dashboard Library

**Grid View** (3-column on desktop):
- Dashboard preview cards with thumbnail image
- Title, creation date, last accessed
- Hover effect reveals share button
- Click anywhere to open dashboard

**Share Modal**:
- Copy link button
- QR code for mobile sharing
- Access settings (view-only enforced)

---

## Interaction Patterns

**Animations** (Minimal, purposeful):
- Landing page: Fade-in on scroll for sections, subtle parallax on hero
- Onboarding: Slide transitions between steps
- Dashboard: Fade-in when charts load, skeleton loaders during data fetch
- Hover states: Subtle elevation (shadow increase), no transform
- No distracting auto-playing animations on dashboard

**Button States**:
- Default: Solid fill, medium font-weight
- Hover: Slight brightness increase
- Active: Pressed appearance (slight scale or shadow reduction)
- Disabled: Reduced opacity, no pointer events

**Loading States**:
- Skeleton screens for dashboard cards
- Spinner for data fetch operations
- Progress bar for multi-step processes

---

## Page-Specific Layouts

### Landing Page Structure
1. Hero (80vh) - Headline, CTA, hero image
2. Feature grid (3-col) - Key capabilities
3. Dashboard preview - Large screenshot or interactive demo
4. Social proof - Stats or testimonials (2-col)
5. CTA section - Get started, prominent button
6. Footer - Links, social icons, newsletter signup

### Dashboard Application
- Persistent sidebar navigation
- Top bar: Dashboard selector dropdown, notifications, user menu
- Main content area: Dashboard grid or chat interface
- No forced viewport heights - natural content flow

### Onboarding
- Centered card (max-w-2xl)
- Step 1: "Who are you?" (role selection)
- Step 2: "What's your goal?" (use case)
- Step 3: Connect Google Sheets
- Step 4: Select spreadsheet
- Step 5: Dashboard generating (animated loader)

---

## Images

**Hero Image**: Isometric 3D illustration showing:
- Floating spreadsheet transforming into dashboard
- Glowing data points and connection lines
- Abstract geometric shapes suggesting AI processing
- Placement: Right side of hero, 40-50% width on desktop

**Feature Icons**: Use Heroicons CDN
- Chart-bar, Sparkles (AI), Chat-bubble, Share icons
- Size: w-12 h-12 in feature cards

**Dashboard Previews**: Generate placeholder visualizations using actual chart library during dashboard generation - no static images needed

---

## Accessibility
- Minimum touch target: 44px × 44px for all interactive elements
- Form inputs: Clear labels above, error messages below
- Keyboard navigation: Focus visible on all interactive elements
- ARIA labels for icon-only buttons
- Color contrast: Ensure text meets WCAG AA standards (handled in color implementation phase)

---

This premium, data-first design balances sophisticated aesthetics with functional clarity, creating a professional analytics platform that feels both powerful and approachable.