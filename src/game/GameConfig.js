/* ==========================================================================
   MODULE: game/GameConfig.js
   ==========================================================================
*/
export const CONFIG = {
    TICK_RATE: 600,
    VIEWPORT_WIDTH: 15,
    VIEWPORT_HEIGHT: 11,
    TILE_SIZE: 40,
    MAP_SIZE: 50
};

export const LEVELS = Array.from({ length: 99 }, (_, i) => {
    let points = 0;
    for (let lvl = 1; lvl < i + 1; lvl++) points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    return Math.floor(points / 4);
});
