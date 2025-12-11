
## Plan: MVP Simple Version Two (New Branch)

A minimal, playable upgrade for OpenScape v2, focusing on core gameplay and maintainable code. The goal is a clean foundation for future features, delivered on a new branch.

### Steps
1. Create a new branch (e.g., `v2-mvp`) from main.
2. Choose and integrate a simple engine (Phaser 3 or Kaboom.js) in [src/engine/](src/engine/).
3. Implement basic player movement in [src/engine/systems/MovementSystem.js](src/engine/systems/MovementSystem.js) and [src/game/](src/game/).
4. Add a single map/scene with basic collision in [src/assets/](src/assets/) and [src/game/GameConfig.js](src/game/GameConfig.js).
5. Provide a minimal UI: start screen, quest log, and inventory in [OpenScape.jsx](src/OpenScape.jsx).
6. Test core gameplay and UI for playability and stability.
7. Document code structure and usage in README.md.

### Further Considerations
1. Decide on Phaser or Kaboom for fastest results.
2. Keep code modular for easy expansion in future versions.
3. Plan for future features (e.g., additional maps, NPCs, quests) after MVP is stable.
