/* ==========================================================================
   MODULE: engine/systems/CombatSystem.js
   ==========================================================================
*/
import { MathUtils } from '../utils/math';
import { LootSystem } from './LootSystem';

export const CombatSystem = {
    calculateHit: (attacker, defender) => {
        const attLvl = MathUtils.getLevel(attacker.skills.attack);
        const strLvl = MathUtils.getLevel(attacker.skills.strength);
        const weaponAim = attacker.equipment?.main_hand?.stats?.aim || 0;
        const weaponPwr = attacker.equipment?.main_hand?.stats?.power || 0;

        const defLvl = defender.stats ? defender.stats.defense : 1;
        const armorDef = defender.equipment?.off_hand?.stats?.defense || 0;
        const totalDef = defLvl + armorDef;

        const attackRoll = (attLvl + weaponAim) * (Math.random() + 0.5);
        const defenseRoll = totalDef * (Math.random() + 0.5);

        if (attackRoll > defenseRoll) {
            const maxHit = Math.floor(1.3 + (strLvl / 10) + (weaponPwr / 8));
            return { hit: true, damage: Math.floor(Math.random() * (maxHit + 1)) };
        }
        return { hit: false, damage: 0 };
    },

    processCombatTick: (state) => {
        let p = { ...state.player };
        let nextNpcs = [...state.npcs];
        let nextMessages = [...state.messages];
        let nextHits = [...state.hitsplats];
        let nextGround = [...state.groundItems];

        if (p.action?.type === 'COMBAT') {
            const target = nextNpcs.find(n => n.id === p.action.targetId);

            // Validation
            if (!target || target.status === 'DEAD' || MathUtils.distance(p, target) > 1.5) {
                p.action = null;
            } else {
                // Player Attack
                const { hit, damage } = CombatSystem.calculateHit(p, target);
                nextHits.push({ x: target.x, y: target.y, val: damage, type: hit ? 'damage' : 'miss', id: MathUtils.uuid(), ts: Date.now() });

                if (hit) {
                    p.skills.attack += 4; p.skills.strength += 4; p.skills.hitpoints += 1.3 * damage;

                    // Apply Damage to NPC
                    nextNpcs = nextNpcs.map(n => {
                        if (n.id === target.id) {
                            const newHp = n.hp - damage;
                            if (newHp <= 0) {
                                // Loot Logic
                                const drops = LootSystem.roll(n.type);
                                drops.forEach(d => nextGround.push({ ...d, x: n.x, y: n.y }));
                                nextMessages.push({ text: "Victory!", type: 'sys' });
                                return { ...n, hp: 0, status: 'DEAD', respawnTimer: 15 };
                            }
                            return { ...n, hp: newHp };
                        }
                        return n;
                    });

                    if (target.hp - damage <= 0) p.action = null;
                }

                // Enemy Retaliation
                const aliveTarget = nextNpcs.find(n => n.id === target.id && n.status === 'ALIVE');
                if (aliveTarget) {
                    const enemyHit = Math.random() > 0.6 ? 1 : 0;
                    if (enemyHit > 0) {
                        nextHits.push({ x: p.x, y: p.y, val: enemyHit, type: 'damage', id: MathUtils.uuid(), ts: Date.now()+1 });
                        p.hp -= enemyHit;
                        if (p.hp <= 0) {
                            nextMessages.push({ text: "You have died!", type: 'sys' });
                            // Death Reset
                            p.x = 12; p.y = 12; p.hp = p.maxHp; p.action = null; p.pathQueue = [];
                            p.inventory = [{id: 'coins', name: 'Coins', icon: '🪙', qty: 0, uuid:'lost', stackable:true, value:1}];
                            p.equipment = { main_hand: null, off_hand: null };
                        }
                    } else nextHits.push({ x: p.x, y: p.y, val: 0, type: 'miss', id: MathUtils.uuid(), ts: Date.now()+1 });
                }
            }
        }
        return { ...state, player: p, npcs: nextNpcs, messages: nextMessages, hitsplats: nextHits, groundItems: nextGround };
    }
};
