/* ==========================================================================
   MODULE: engine/utils/math.js
   ==========================================================================
*/
import { CONFIG, LEVELS } from '../../game/GameConfig';

export const MathUtils = {
    distance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),

    getLevel: (xp) => {
        for (let i = 0; i < LEVELS.length; i++) if (xp < LEVELS[i]) return i + 1;
        return 99;
    },

    uuid: () => {
        return typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    isBlocked: (x, y, map, resources, npcs) => {
        if (x < 0 || x >= CONFIG.MAP_SIZE || y < 0 || y >= CONFIG.MAP_SIZE) return true;
        const tile = map[y]?.[x];
        if (tile === 1 || tile === 2) return true; // Water/Wall
        // Check Resources with collision
        if (resources.some(r => r.x === x && r.y === y && r.collision && r.status !== 'DEPLETED')) return true;
        // Check blocking NPCs (Shops)
        if (npcs.some(n => n.x === x && n.y === y && n.collision && n.status !== 'DEAD')) return true;
        return false;
    }
};
