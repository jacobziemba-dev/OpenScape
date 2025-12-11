/* ==========================================================================
   MODULE: engine/systems/MovementSystem.js
   ==========================================================================
*/
import { MathUtils } from '../utils/math';

export const MovementSystem = {
    processMovementTick: (state, map) => {
        let p = { ...state.player };
        let msgs = [...state.messages];
        let hits = [...state.hitsplats];

        // 1. Process Path Queue
        if (p.pathQueue.length > 0) {
            const nextStep = p.pathQueue.shift();
            // Verify step valid (didn't walk into a newly spawned rock)
            if (!MathUtils.isBlocked(nextStep.x, nextStep.y, map, state.resources, state.npcs)) {
                p.x = nextStep.x;
                p.y = nextStep.y;
            } else {
                p.pathQueue = [];
                msgs.push({text: "Path blocked.", type: 'sys'});
            }
        }

        // 2. Arrival Check (Smart Interaction)
        if (p.pathQueue.length === 0 && p.pendingAction) {
            const target = state.resources.find(r => r.id === p.pendingAction.targetId)
                        || state.npcs.find(n => n.id === p.pendingAction.targetId);

            if (target && MathUtils.distance(p, target) <= 1.5) {
                p.action = p.pendingAction;
                p.pendingAction = null;
            } else {
                p.pendingAction = null; // Failed to reach or too far
            }
        }

        return { ...state, player: p, messages: msgs, hitsplats: hits };
    }
};
