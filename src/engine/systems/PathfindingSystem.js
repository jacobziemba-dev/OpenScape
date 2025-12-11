/* ==========================================================================
   MODULE: engine/systems/PathfindingSystem.js
   ==========================================================================
*/
import { MathUtils } from '../utils/math';

export const PathfindingSystem = {
    findPath: (start, end, map, resources, npcs) => {
        if (start.x === end.x && start.y === end.y) return [];

        let queue = [[{x: start.x, y: start.y}]];
        let visited = new Set([`${start.x},${start.y}`]);
        let iterations = 0;

        while (queue.length > 0) {
            iterations++;
            if (iterations > 2000) return []; // Safety break

            let path = queue.shift();
            let current = path[path.length - 1];

            if (current.x === end.x && current.y === end.y) return path.slice(1);

            const neighbors = [
                {x: current.x, y: current.y - 1}, {x: current.x, y: current.y + 1},
                {x: current.x - 1, y: current.y}, {x: current.x + 1, y: current.y}
            ];

            for (let n of neighbors) {
                const key = `${n.x},${n.y}`;
                if (!visited.has(key) && !MathUtils.isBlocked(n.x, n.y, map, resources, npcs)) {
                    visited.add(key);
                    queue.push([...path, n]);
                }
            }
        }
        return [];
    }
};
