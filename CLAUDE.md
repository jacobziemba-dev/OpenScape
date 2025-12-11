# OpenScape - AI Assistant Guide

## Project Overview

OpenScape is a **modular game engine (v0.9)** built with React + Vite, inspired by classic MMORPGs like RuneScape. It features a tile-based world, skills system, combat, resource gathering, NPCs, and inventory management.

**Key Features:**
- ECS-lite architecture with modular systems
- Action Dispatcher pattern for state management
- Pathfinding with A* algorithm
- Skills progression system (attack, strength, defense, hitpoints, woodcutting, mining, prayer)
- Combat system with NPCs
- Banking and shop systems
- Inventory management with equipment slots
- Responsive design (desktop & mobile)

## Technology Stack

- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.4
- **Styling:** Tailwind CSS 3.4.19
- **Icons:** Lucide React
- **Language:** JavaScript (ES modules)

## Project Structure

```
OpenScape/
├── src/
│   ├── engine/                      # Core engine modules
│   │   ├── systems/                 # Game systems (modular)
│   │   │   ├── CombatSystem.js      # Combat mechanics & NPC battles
│   │   │   ├── InventorySystem.js   # Inventory & equipment management
│   │   │   ├── LootSystem.js        # Item database & loot tables
│   │   │   ├── MovementSystem.js    # Player/NPC movement
│   │   │   └── PathfindingSystem.js # A* pathfinding algorithm
│   │   ├── utils/
│   │   │   └── math.js              # Utility functions (distance, level calc, UUID, etc.)
│   │   └── ActionDispatcher.js      # Central action handler (ECS-lite pattern)
│   ├── game/
│   │   └── GameConfig.js            # Game constants & configuration
│   ├── assets/                      # Static assets
│   ├── OpenScape.jsx                # Main game component (UI & game loop)
│   ├── main.jsx                     # React entry point
│   ├── App.css                      # Global styles
│   └── index.css                    # Tailwind imports
├── public/                          # Public assets
├── package.json                     # Dependencies
├── vite.config.js                   # Vite configuration
├── tailwind.config.js               # Tailwind configuration
├── eslint.config.js                 # ESLint configuration
└── index.html                       # HTML entry point
```

## Architecture Patterns

### 1. **Action Dispatcher (ECS-lite)**
The game uses a centralized action dispatcher pattern for state management:

```javascript
// Register actions
dispatcher.register('ACTION_TYPE', (state, payload, context) => {
    // Return new state
    return { ...state, /* modifications */ };
});

// Dispatch actions
setGameState(prev => dispatcher.dispatch({ type: 'ACTION_TYPE', payload: {...} }, prev, { map }));
```

**Key Actions:**
- `CLICK_TILE` - Handle tile clicks (movement, interactions)
- `EQUIP/UNEQUIP` - Equipment management
- `DROP/BURY` - Item actions
- `TICK` - Game loop (runs every 600ms)

### 2. **Game Systems**
Each system is a **pure module** that exports functions to handle specific game aspects:

- **CombatSystem**: Handles combat calculations, damage, XP, loot drops
- **InventorySystem**: Manages inventory, stacking, equipment slots
- **LootSystem**: Item database (ITEM_DB) and loot tables
- **MovementSystem**: Processes movement queue, pathfinding execution
- **PathfindingSystem**: A* pathfinding with collision detection

### 3. **State Management**
- **Game State**: Single immutable state object managed via React's `useState`
- **State Ref**: `useRef` holds current state for game loop access
- **Local Storage**: Auto-saves every 5 seconds to `openscape_v9_modular`

### 4. **Game Loop**
The main game loop runs at **600ms intervals** (configurable via `CONFIG.TICK_RATE`):

1. **Movement Processing** - Execute path queue, handle collisions
2. **Combat Processing** - Auto-attack, damage calculation, death handling
3. **Skilling Processing** - Resource gathering (woodcutting, mining)
4. **World Updates** - HP regeneration, resource respawns, NPC AI

## Key Files & Their Purpose

### `/src/OpenScape.jsx` (Main Component)
- **Lines 1-200**: Action dispatcher setup & registration
- **Lines 203-225**: Save/load system & world initialization
- **Lines 228-241**: Game loop & auto-save interval
- **Lines 257-273**: Click handling & context menus
- **Lines 337-534**: React render logic & UI components

### `/src/engine/ActionDispatcher.js`
Simple dispatcher pattern - register handlers for action types, dispatch actions with state + context.

### `/src/engine/systems/`
- **CombatSystem.js**: `processCombatTick()` - Handles all combat logic
- **InventorySystem.js**: `addItem()`, `removeItem()`, `handleEquip()`, etc.
- **LootSystem.js**: `ITEM_DB` (all items), `getLootDrop()` (loot tables)
- **MovementSystem.js**: `processMovementTick()` - Movement queue execution
- **PathfindingSystem.js**: `findPath()` - A* implementation

### `/src/game/GameConfig.js`
Game constants: tick rate, viewport size, tile size, map size, level tables.

## Development Guidelines

### Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

### Code Conventions

1. **Immutability**: Always return new state objects, never mutate
2. **Pure Functions**: Systems should be pure (no side effects)
3. **Module Exports**: Use named exports for systems, default export for React components
4. **ES6+**: Use modern JavaScript (arrow functions, destructuring, spread operator)
5. **Comments**: Module headers use `/* ========== */` format

### Adding New Features

#### Adding a New Game System
1. Create file in `/src/engine/systems/NewSystem.js`
2. Export pure functions (e.g., `processNewSystemTick()`)
3. Import and call from `OpenScape.jsx` TICK handler
4. Register any new actions in ActionDispatcher setup

#### Adding New Items
1. Add to `ITEM_DB` in `/src/engine/systems/LootSystem.js`
2. Include: `id`, `name`, `icon`, `type`, `value`, `xp`, `stackable`
3. Update loot tables if needed

#### Adding New Actions
1. Register in `dispatcher.register()` (lines 72-198 in OpenScape.jsx)
2. Follow pattern: `(state, payload, context) => newState`
3. Return completely new state object

### Important Constants

```javascript
CONFIG.TICK_RATE = 600          // Game loop interval (ms)
CONFIG.VIEWPORT_WIDTH = 15      // Tiles visible horizontally
CONFIG.VIEWPORT_HEIGHT = 11     // Tiles visible vertically
CONFIG.TILE_SIZE = 40           // Pixel size of each tile
CONFIG.MAP_SIZE = 50            // Total map dimensions (50x50)
```

## Common Tasks

### Debugging
- Check browser console for warnings (no handler for action type)
- Game state is logged in React DevTools
- Add debug messages to `messages` array in state

### State Inspection
```javascript
// Current game state structure:
{
    tick: 0,
    player: {
        x, y, pathQueue, pendingAction,
        hp, maxHp,
        skills: { attack, strength, defense, hitpoints, woodcutting, mining, prayer },
        inventory: [], // Max 20 slots
        bank: [],
        equipment: { main_hand, off_hand },
        action: null
    },
    resources: [],    // Trees, rocks, banks
    npcs: [],         // Enemies, shops
    groundItems: [],  // Items on ground
    messages: [],     // Chat log (max 15)
    hitsplats: []     // Visual damage/XP indicators
}
```

### Testing Changes
1. Start dev server (`npm run dev`)
2. Test in browser (http://localhost:5173)
3. Check mobile responsive design (toggle device toolbar in DevTools)
4. Clear localStorage to reset save: `localStorage.removeItem('openscape_v9_modular')`

## AI Assistant Instructions

When working on this codebase:

1. **Always read files before modifying** - Don't propose changes to code you haven't seen
2. **Maintain immutability** - Never mutate state, always return new objects
3. **Follow the dispatcher pattern** - New actions should be registered with the dispatcher
4. **Keep systems pure** - System functions should not have side effects
5. **Test thoroughly** - Changes to game loop or systems affect entire game
6. **Preserve existing features** - Don't break combat, movement, inventory, etc.
7. **Match code style** - Use existing patterns and conventions
8. **Update this file** - If architecture changes significantly, update CLAUDE.md

### Common Pitfalls to Avoid
- ❌ Mutating state directly (e.g., `state.player.x = 5`)
- ❌ Side effects in system functions (e.g., calling `setGameState()` from a system)
- ❌ Breaking pathfinding collision detection
- ❌ Creating memory leaks in game loop intervals
- ❌ Forgetting to handle both desktop and mobile UI interactions

### When Adding Features
- ✅ Check if similar functionality exists in another system
- ✅ Ensure new actions return complete new state
- ✅ Test on both desktop and mobile viewports
- ✅ Consider performance impact (runs every 600ms in game loop)
- ✅ Add appropriate user feedback (messages, hitsplats)

## Current Version Notes

**Version:** 0.9 (Modular Engine)
**Status:** Active development
**Last Major Refactor:** ECS-lite systems architecture with ActionDispatcher

### Known Limitations
- Shop logic partially in UI layer (could be moved to InventorySystem)
- Bank logic partially in UI layer (could be moved to InventorySystem)
- NPC AI is basic random movement
- No multiplayer support
- Single map (50x50 tiles)

### Future Considerations
- Move all game logic out of UI layer into systems
- Implement proper quest system
- Add more skills (fishing, cooking, crafting)
- Multi-map support
- Save state to server/database instead of localStorage

---

**For questions or clarifications, refer to the source code comments or examine existing systems for patterns.**
