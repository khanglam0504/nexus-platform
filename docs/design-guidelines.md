# Nexus Platform - Design Guidelines

## Brand Identity

### Colors

**Primary Palette (Dark Mode)**
- Background: `#1a1a2e` - Deep navy for main background
- Sidebar: `#16213e` - Darker navy for sidebar
- Primary/Accent: `#10b981` - Emerald green for actions and highlights
- Card: `#1f2937` - Slate gray for cards and elevated surfaces

**Semantic Colors**
- Destructive: `#ef4444` - Red for errors and destructive actions
- Muted: `#374151` - Gray for borders and secondary elements
- Muted Foreground: `#9ca3af` - Light gray for secondary text

### Typography

**Font Family**: Inter (Google Fonts)
- System fallbacks: system-ui, -apple-system, sans-serif

**Font Sizes**
- Heading 1: 24px / 1.5rem (font-bold)
- Heading 2: 18px / 1.125rem (font-semibold)
- Body: 14px / 0.875rem (font-normal)
- Small: 12px / 0.75rem (text-muted-foreground)
- Tiny: 10px / 0.625rem (labels, timestamps)

## Component Patterns

### Buttons
- Default: Emerald green background, white text
- Secondary: Dark gray background
- Ghost: Transparent, hover shows background
- Outline: Border only, transparent background
- Border radius: 6px (rounded-md)

### Cards
- Background: `bg-card` (#1f2937)
- Border: 1px solid `border` (#374151)
- Border radius: 8px (rounded-lg)
- Padding: 16px (p-4) to 24px (p-6)

### Inputs
- Background: Same as card or slightly darker
- Border: 1px solid border color
- Focus: Green ring (ring-primary)
- Height: 40px (h-10)
- Border radius: 6px

### Avatars
- Sizes: 32px (small), 40px (default), 48px (large)
- Shape: Circular (rounded-full)
- Fallback: Initials on muted background

## Layout Structure

### Main Layout
```
┌─────────────────────────────────────────────────────┐
│ [Sidebar 64px] [Channel List 256px] [Chat Area]     │
│                                                     │
│ ┌────┐ ┌──────────────┐ ┌────────────────────────┐ │
│ │    │ │ Workspace    │ │ # channel-name         │ │
│ │ WS │ │ ────────────│ │ ────────────────────── │ │
│ │ +  │ │ # general    │ │                        │ │
│ │    │ │ # random     │ │ [Messages]             │ │
│ │    │ │ + Add channel│ │                        │ │
│ │    │ │              │ │                        │ │
│ │    │ │ AI Agents    │ │ ────────────────────── │ │
│ │ 👤 │ │ 🤖 Assistant │ │ [Message Input]        │ │
│ └────┘ └──────────────┘ └────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Spacing Scale
- xs: 4px (gap-1, p-1)
- sm: 8px (gap-2, p-2)
- md: 16px (gap-4, p-4)
- lg: 24px (gap-6, p-6)
- xl: 32px (gap-8, p-8)

## Animation

**Transitions**
- Duration: 200ms (default)
- Easing: ease-out
- Properties: colors, opacity, transform

**Patterns**
- Fade in: opacity 0 → 1
- Slide up: translateY(10px) → 0
- Scale: scale(0.95) → scale(1)

## Accessibility

- Minimum contrast ratio: 4.5:1 for text
- Focus indicators: Green ring (2px)
- Interactive elements: Min 44x44px touch target
- Screen reader: Proper ARIA labels
- Keyboard navigation: Full support

## Icons

Using **Lucide React** icons
- Stroke width: 2px (default)
- Size: 16px (h-4 w-4), 20px (h-5 w-5), 24px (h-6 w-6)
- Color: Inherits from text color
