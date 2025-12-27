# CyberCom - AI Coding Assistant Instructions

## Project Overview
CyberCom is a React-based cybersecurity challenge platform (CTF) built with Vite, featuring a dark/light theme system and modular component architecture.

## Tech Stack
- **Frontend**: React 19, React Router 7
- **Build Tool**: Vite
- **Styling**: CSS Modules + CSS Variables + Utility Classes
- **Fonts**: Inter (primary), Rajdhani (display), JetBrains Mono (monospace)

## Architecture Patterns

### Component Structure
```
src/
├── components/
│   ├── auth/ProtectedRoute/     # Route protection wrapper
│   └── layout/                  # Navbar, Footer
├── contexts/ThemeContext.jsx    # Theme management
├── pages/                       # Route components
└── styles/                      # Modular CSS system
```

### Routing
- Public routes: `/`, `/login`, `/register`
- Protected routes: `/challenges`, `/leaderboard`, `/profile`
- Admin routes: `/admin/*` (require `requireAdmin` prop on ProtectedRoute)

### Styling System

#### CSS Variables (Theme-Aware)
Use CSS custom properties defined in `themes.css`:
- `--bg-primary`, `--bg-secondary`, `--bg-card`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--accent-primary` (cyan), `--success`, `--error`
- Category colors: `--category-web`, `--category-crypto`, etc.

#### Typography Classes
```css
.text-h1        /* Large headings, Rajdhani font */
.text-h2        /* Subheadings */
.text-body      /* Regular text, Inter font */
.text-body-lg   /* Larger body text */
```

#### Utility Classes
```css
.container      /* Max-width 1280px, centered */
.py-8           /* Padding vertical 2rem */
.mb-4           /* Margin bottom 1rem */
.flex           /* Display flex */
.items-center   /* Align items center */
.bg-card        /* Card background color */
.border         /* Border with theme color */
.rounded        /* Border radius 0.5rem */
```

#### CSS Modules
- Use for component-specific styles
- BEM-like naming: `.component-name__element--modifier`
- Import as `import styles from './Component.module.css'`

### Theme System
- Context: `ThemeContext` with `toggleTheme()`, `setLightTheme()`, `setDarkTheme()`
- Persistence: `sessionStorage` with key `"ctf-theme"`
- Application: `data-theme` attribute on `<html>` element
- Available themes: `"light"`, `"dark"`

### Authentication
- `ProtectedRoute` component wraps protected content
- Currently uses dummy auth (hardcoded `true`)
- Redirects unauthenticated users to `/login`
- Admin routes require `requireAdmin={true}` prop

## Development Workflow

### Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
npm run preview  # Preview production build
```

### File Organization
- **Components**: `src/components/` with subfolders by feature
- **Pages**: `src/pages/` with index.js for clean imports
- **Styles**: Modular CSS in `src/styles/`
- **Assets**: `src/assets/` (fonts in `public/fonts/`)

### Code Patterns

#### Component Example
```jsx
import React from 'react';
import styles from './Component.module.css';

const Component = () => (
  <div className={`${styles.component} bg-card rounded border`}>
    <h1 className="text-h1 text-accent-primary">Title</h1>
    <p className="text-body text-muted">Description</p>
  </div>
);
```

#### Route Protection
```jsx
<Route path="/protected" element={
  <ProtectedRoute>
    <ProtectedComponent />
  </ProtectedRoute>
} />
```

#### Theme Usage
```jsx
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

const Component = () => {
  const { theme, toggleTheme, isDark } = useContext(ThemeContext);
  // Use theme state...
};
```

## Key Files
- `src/App.jsx`: Main routing configuration
- `src/main.jsx`: App entry point with providers
- `src/contexts/ThemeContext.jsx`: Theme management
- `src/styles/themes.css`: Theme variable definitions
- `src/styles/typography.css`: Typography system
- `src/styles/utilities.css`: Utility classes

## Notes
- Authentication is currently mocked - replace with real auth logic
- Some CSS variables may be undefined (investigate typography sizing variables)
- Follow existing patterns for consistent styling and component structure</content>
<parameter name="filePath">c:\CreateProjects\CyberCom\.github\copilot-instructions.md