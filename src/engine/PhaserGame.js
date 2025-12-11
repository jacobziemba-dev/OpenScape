// src/engine/PhaserGame.js
// Initializes Phaser and manages the main game scene. Integrates with ECS-lite state and Action Dispatcher.
import Phaser from 'phaser';


let phaserGame = null;
let mainSceneInstance = null;

function startPhaserGame({ state, onAction, containerId = 'phaser-container' }) {
    if (phaserGame) return phaserGame;


    class MainScene extends Phaser.Scene {
        constructor() {
            super('MainScene');
            this.currentState = state;
        }
        preload() {
            // Load assets here (sprites, tiles, etc.)
        }
        create() {
            mainSceneInstance = this;
            this.drawWorld(this.currentState);
        }
        update() {
            // Called every frame. Sync ECS state to Phaser objects here.
        }
        drawWorld(gameState) {
            // Example: draw a simple grid or placeholder
            this.cameras.main.setBackgroundColor('#222');
            const graphics = this.add.graphics();
            graphics.lineStyle(1, 0x444444, 1);
            for (let x = 0; x < 800; x += 32) {
                graphics.moveTo(x, 0);
                graphics.lineTo(x, 600);
            }
            for (let y = 0; y < 600; y += 32) {
                graphics.moveTo(0, y);
                graphics.lineTo(800, y);
            }
            graphics.strokePath();
        }
        updateWorld(gameState) {
            // Placeholder: clear and redraw for now
            this.children.removeAll();
            this.drawWorld(gameState);
        }
    }


function updatePhaserState(gameState) {
    if (mainSceneInstance && mainSceneInstance.updateWorld) {
        mainSceneInstance.updateWorld(gameState);
    }
}

    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerId,
        backgroundColor: '#222',
        scene: [MainScene],
        pixelArt: true,
        physics: { default: 'arcade', arcade: { debug: false } },
    };
    phaserGame = new Phaser.Game(config);
    return phaserGame;
}

function destroyPhaserGame() {
    if (phaserGame) {
        phaserGame.destroy(true);
        phaserGame = null;
        mainSceneInstance = null;
    }
}

export { startPhaserGame, updatePhaserState, destroyPhaserGame };
