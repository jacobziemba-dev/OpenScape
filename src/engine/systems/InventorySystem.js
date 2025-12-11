/* ==========================================================================
   MODULE: engine/systems/InventorySystem.js
   ==========================================================================
*/
import { MathUtils } from '../utils/math';

export const InventorySystem = {
    addItem: (inventory, itemTemplate, qty = 1) => {
        const newInv = [...inventory];
        if (itemTemplate.stackable) {
            const existing = newInv.find(i => i.id === itemTemplate.id);
            if (existing) {
                existing.qty += qty;
                return newInv;
            }
        }
        // Only add if space
        if (itemTemplate.stackable || newInv.length < 20) {
             // If stackable but not found, or not stackable and space exists
             newInv.push({ ...itemTemplate, qty: qty, uuid: MathUtils.uuid() });
        }
        return newInv;
    },

    removeItem: (inventory, index) => {
        const newInv = [...inventory];
        newInv.splice(index, 1);
        return newInv;
    },

    handleEquip: (state, { item, index }) => {
        const p = { ...state.player };
        const slot = item.slot || 'main_hand';
        const current = p.equipment[slot];

        if (current) p.inventory = InventorySystem.addItem(p.inventory, current, 1);

        p.equipment = { ...p.equipment, [slot]: item };
        p.inventory = InventorySystem.removeItem(p.inventory, index);

        return { ...state, player: p, messages: [...state.messages, {text: `Equipped ${item.name}`, type: 'game'}] };
    },

    handleUnequip: (state, { item }) => {
        const p = { ...state.player };
        if (p.inventory.length >= 20 && !item.stackable) return { ...state, messages: [...state.messages, {text: "Inventory full", type: 'sys'}]};

        p.inventory = InventorySystem.addItem(p.inventory, item, 1);
        p.equipment = { ...p.equipment, [item.slot]: null };
        return { ...state, player: p, messages: [...state.messages, {text: `Unequipped ${item.name}`, type: 'game'}] };
    }
};
