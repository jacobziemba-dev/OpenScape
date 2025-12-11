# Copilot Instructions for OpenScape

## Project Overview
OpenScape is a modular game engine built with React and Vite, inspired by classic MMORPGs. It uses an ECS-lite architecture with modular systems and a centralized Action Dispatcher for state management.

## Architecture & Key Patterns
- **ECS-lite Modular Systems:** Each game system (Combat, Inventory, Loot, Movement, Pathfinding) is a pure module in `src/engine/systems/`. Systems export named functions (e.g., `processCombatTick`, `addItem`, `findPath`).
- **Action Dispatcher:** Centralized handler in `src/engine/ActionDispatcher.js` routes actions to systems. Actions are dispatched with state and context.
- **Main Game Component:** `src/OpenScape.jsx` contains the game loop, UI, and world initialization. React render logic is in lines 337-534; save/load and world setup in lines 203-225.
- **Pure Functions:** All system logic should be pure (no side effects). State changes are managed via dispatched actions.
- **Module Exports:** Use named exports for system modules, default export for React components.

## Developer Workflows
- **Build:** Use `npm run build` to create a production build (Vite).
- **Preview:** Use `npm run preview` to serve the production build locally.
- **Adding Systems:** To add a new game system:
  1. Create a file in `src/engine/systems/NewSystem.js`
  2. Export pure functions (e.g., `processNewSystemTick()`)
  3. Register system handlers in the Action Dispatcher

## Conventions & Integration
- **State Management:** All game state transitions flow through the Action Dispatcher.
- **Data Flow:** Systems do not mutate global state directly; they return new state objects.
- **Item Database:** `LootSystem.js` contains `ITEM_DB` and loot table logic.
- **Pathfinding:** `PathfindingSystem.js` implements A* with collision detection.
- **React UI:** All UI logic and game loop are in `OpenScape.jsx`.

## External Dependencies
- **Vite** for build and dev server
- **React** for UI
- **ESLint** for linting (see `eslint.config.js`)
- **Tailwind CSS** for styling (see `tailwind.config.js`)

## Example: Combat Tick
```js
// src/engine/systems/CombatSystem.js
export function processCombatTick(state, context) {
  // ...combat logic...
  return newState;
}
```

## References
- Main architecture: `CLAUDE.md`, `src/engine/ActionDispatcher.js`, `src/engine/systems/`
- Build/test/debug: `README.md`, `CLAUDE.md`
- Conventions: `CLAUDE.md` (Code Conventions section)

---
For questions or unclear patterns, review `CLAUDE.md` and `README.md` for project-specific details.
