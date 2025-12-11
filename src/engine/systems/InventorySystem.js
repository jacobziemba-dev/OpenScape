/* ==========================================================================
   MODULE: engine/systems/InventorySystem.js
   ==========================================================================
*/
import { MathUtils } from '../utils/math';
import { ITEM_DB } from './LootSystem';

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
    },

    handleShopBuy: (state, { item }) => {
        const p = { ...state.player };
        const cost = item.value || 1;
        const coins = p.inventory.find(i => i.id === 'coins');

        if (!coins || coins.qty < cost) {
            return { ...state, messages: [...state.messages, {text: "Not enough coins", type: 'sys'}] };
        }

        // Check space (simulate adding)
        // Note: addItem returns a new array, so checking length of result tells us if it fits
        // But we need to be careful: if we remove coins (making a slot free) and then add item, that might work.
        // If coins are stackable and we don't consume all, the slot count doesn't change from coin deduction.
        // If we consume all coins, a slot opens up.

        // Logic:
        // 1. Temporarily remove cost from coins.
        // 2. Try to add item.
        // 3. If fail, revert.

        // Simpler check:
        // If item is stackable and we have it -> OK.
        // If we have < 20 items -> OK.
        // If we have 20 items:
        //    If coins will be fully consumed (freeing a slot) -> OK.
        //    Else -> Full.

        const willClearSlot = coins.qty === cost;

        // Wait, if willClearSlot is true, we have 19 items effectively. So we can add anything.
        // If willClearSlot is false, we have same number of items. We can only add if < 20 or stackable exists.

        const stackableExists = item.stackable && p.inventory.some(i => i.id === item.id);
        const effectiveCount = p.inventory.length - (willClearSlot ? 1 : 0);

        if (effectiveCount >= 20 && !stackableExists) {
             return { ...state, messages: [...state.messages, {text: "Inventory full", type: 'sys'}] };
        }

        // Proceed
        // Remove coins
        if (willClearSlot) {
            const cIdx = p.inventory.findIndex(i => i.id === 'coins');
            p.inventory = InventorySystem.removeItem(p.inventory, cIdx);
        } else {
             // We need to mutate the coin object in the new inventory array?
             // InventorySystem.addItem returns deep copy of array but shallow copy of items?
             // Wait, addItem: const newInv = [...inventory]; ... existing.qty += qty; -> Mutates existing object!
             // So we must be careful.
             // Ideally we treat inventory as immutable or we consistently clone.
             // OpenScape.jsx uses shallow copy: const next = { ...prev };
             // InventorySystem.addItem mutates `existing` item if stackable.

             // Let's create a new inventory array with a new coin object to be safe/clean
             p.inventory = p.inventory.map(i => i.id === 'coins' ? { ...i, qty: i.qty - cost } : i);
        }

        p.inventory = InventorySystem.addItem(p.inventory, item, 1);
        return { ...state, player: p, messages: [...state.messages, {text: `Bought ${item.name}`, type: 'game'}] };
    },

    handleShopSell: (state, { item, index }) => {
        const p = { ...state.player };
        const val = Math.floor(item.value * 0.4) || 1;

        p.inventory = InventorySystem.removeItem(p.inventory, index);
        p.inventory = InventorySystem.addItem(p.inventory, ITEM_DB.coins, val);

        return { ...state, player: p, messages: [...state.messages, {text: `Sold ${item.name} for ${val} coins`, type: 'game'}] };
    }
};
