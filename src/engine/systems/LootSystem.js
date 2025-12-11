/* ==========================================================================
   MODULE: engine/systems/LootSystem.js
   ==========================================================================
*/
import { MathUtils } from '../utils/math';

// Re-defining Items here for system access
export const ITEM_DB = {
    logs: { id: 'logs', name: 'Logs', type: 'resource', icon: '🪵', xp: 25, value: 4, stackable: false },
    copper: { id: 'copper', name: 'Copper Ore', type: 'resource', icon: '🪨', xp: 17, value: 6, stackable: false },
    bones: { id: 'bones', name: 'Bones', type: 'consumable', icon: '🦴', xp: 4.5, value: 1, stackable: false },
    coins: { id: 'coins', name: 'Coins', type: 'currency', icon: '🪙', value: 1, stackable: true },
    bronze_sword: { id: 'bronze_sword', name: 'Bronze Sword', type: 'weapon', icon: '⚔️', stats: { aim: 5, power: 4 }, value: 20, slot: 'main_hand', stackable: false },
    bronze_kiteshield: { id: 'bronze_kiteshield', name: 'Bronze Kite', type: 'armor', icon: '🛡️', stats: { defense: 6 }, value: 40, slot: 'off_hand', stackable: false }
};

export const LOOT_TABLES = {
    goblin: [
        { id: 'bones', chance: 1, min: 1, max: 1 },
        { id: 'coins', chance: 0.5, min: 2, max: 15 },
        { id: 'bronze_kiteshield', chance: 0.1, min: 1, max: 1 },
        { id: 'bronze_sword', chance: 0.05, min: 1, max: 1 }
    ]
};

export const LootSystem = {
    roll: (npcType) => {
        const table = LOOT_TABLES[npcType];
        if (!table) return [];
        const drops = [];
        table.forEach(entry => {
            if (Math.random() <= entry.chance) {
                const qty = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
                drops.push({ ...ITEM_DB[entry.id], qty, uuid: MathUtils.uuid() });
            }
        });
        return drops;
    }
};
