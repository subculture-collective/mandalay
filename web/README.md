# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Features

### Marker Clustering

The map uses `react-leaflet-markercluster` to automatically cluster markers in dense areas, improving readability and performance:

- **Cluster Radius**: 60 pixels - markers within this distance are grouped
- **Spiderfy on Max Zoom**: When zoomed in fully, overlapping markers spread out in a spider pattern
- **Zoom to Bounds**: Clicking a cluster zooms to fit all its markers
- **Selection Preserved**: Individual marker clicks still update the selection store

Configuration can be adjusted in `src/components/PlacemarkMarkers.tsx`.

## Testing

The project uses **Vitest** with **React Testing Library** for component testing.

### Running Tests

```bash
# Run all tests once (CI mode)
npm test

# Run tests in watch mode (development)
npm run test:watch
```

### Test Configuration

- **Test Runner**: Vitest 4.0.16
- **Environment**: jsdom (simulates browser DOM)
- **Testing Library**: @testing-library/react 16.3.1
- **Matchers**: @testing-library/jest-dom 6.9.1
- **User Interactions**: @testing-library/user-event 14.6.1

Configuration: `vite.config.ts`  
Setup File: `src/test/setup.ts`

### Test Coverage

The test suite includes:
- **Store/State Tests**: Zustand store validation (`store.test.ts`)
- **Component Tests**: UI component rendering and interaction tests
- **Integration Tests**: Tests with React Query and state management integration
- **Hook Tests**: Custom React hooks testing

Sample test files:
- `src/test/store.test.ts` - Selection store tests
- `src/test/Timeline.test.tsx` - Timeline component with highlight tests
- `src/test/PlacemarkMarkers.highlight.test.tsx` - Map marker selection tests
- `src/test/PlacemarkDetail.test.tsx` - Detail panel rendering tests

---

## Vite template documentation
Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
