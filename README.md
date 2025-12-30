# Family Wealth Blueprint

A beautiful, interactive web component for teaching adults about long-term wealth building through saving, investing, and compounding.

## Features

- 🎨 **Visually Stunning Design** - Clean, modern UI with lots of white space
- 📊 **Interactive Compounding Chart** - User-friendly sliders to visualize how money grows over time
- 📱 **Fully Responsive** - Works beautifully on desktop, tablet, and mobile
- 🎯 **7-Step Blueprint** - Clear, actionable steps for building wealth
- ⚡ **Built with React + TypeScript** - Type-safe and maintainable
- 🎨 **Tailwind CSS** - Easy to customize and adapt to your brand

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Usage

The component can be used in two ways:

### 1. Standalone Page

The component is already set up as a standalone page. Just run `npm run dev` and visit the local URL.

### 2. Drop into Existing Site

Import and use the component in your existing React app:

```tsx
import FamilyWealthBlueprint from './components/FamilyWealthBlueprint'

function MyPage() {
  return <FamilyWealthBlueprint />
}
```

## Component Structure

- **Hero Section** - Main heading and call-to-action
- **Why This Matters** - Context and motivation
- **Interactive Chart** - Real-time compounding calculator with sliders
- **7-Step Blueprint** - Numbered cards with icons and descriptions
- **Compounding Highlight** - Visual emphasis on the power of starting early
- **Quick Recap** - Checklist summary
- **Call-to-Action** - Booking section
- **Disclaimer** - Legal disclaimer

## Customization

The component uses Tailwind CSS, making it easy to customize:

- Colors: Modify the gradient classes (e.g., `from-blue-600`, `to-indigo-600`)
- Typography: Adjust font sizes and weights in the component
- Spacing: Change padding and margins using Tailwind utilities
- Icons: Replace emoji icons with SVG components

## Interactive Chart Features

The compounding chart includes:
- **Monthly Investment Slider** - Adjust from $50 to $500
- **Expected Return Slider** - Adjust from 5% to 12% annually
- **Target Age Slider** - Adjust from age 30 to 65
- **Real-time Updates** - Chart updates as you move sliders
- **Summary Stats** - Shows total value, amount invested, and growth

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Recharts (for interactive charts)
- Vite (build tool)

## Credits

Built with inspiration from the "ultimate-target" component, designed to be user-friendly and educational.

---

**Disclaimer:** The ideas on this page are for general educational purposes only and are not personal financial advice.

