import React, { useState, useEffect, useRef, useMemo, useReducer } from 'react';
import {
  Sword, Pickaxe, Axe, Shield, Backpack, Activity,
  MessageSquare, Trophy, X, Skull, Menu, Save, Play,
  ChevronDown, Coins, Hand, Store, Map as MapIcon
} from 'lucide-react';

import { CONFIG } from './game/GameConfig';
import { MathUtils } from './engine/utils/math';
import { PathfindingSystem } from './engine/systems/PathfindingSystem';
import { InventorySystem } from './engine/systems/InventorySystem';
import { LootSystem, ITEM_DB } from './engine/systems/LootSystem';
import { CombatSystem } from './engine/systems/CombatSystem';
import { MovementSystem } from './engine/systems/MovementSystem';
import { ActionDispatcher } from './engine/ActionDispatcher';
import { startPhaserGame, destroyPhaserGame } from './engine/PhaserGame';
import { updatePhaserState } from './engine/PhaserGame';

/* ==========================================================================
   MAIN REACT COMPONENT (OpenScape.jsx)
   ==========================================================================
*/
export default function OpenScape() {
    const [started, setStarted] = useState(false);
    const [activeTab, setActiveTab] = useState('inventory');
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [modal, setModal] = useState(null);
    const [scale, setScale] = useState(1);
    const gameContainerRef = useRef(null);

    // Phaser integration
    useEffect(() => {
        if (started && gameContainerRef.current) {
            // Start Phaser and pass initial state
            startPhaserGame({ state: gameState, onAction: null, containerId: 'phaser-container' });
        }
        return () => {
            destroyPhaserGame();
        };
    }, [started]);

    // Sync gameState changes to Phaser
    useEffect(() => {
        if (started) {
            updatePhaserState(gameState);
        }
    }, [gameState, started]);

    // --- GAME STATE ---
    const [gameState, setGameState] = useState({
        tick: 0,
        player: {
            x: 12, y: 12, pathQueue: [], pendingAction: null,
            hp: 10, maxHp: 10,
            skills: { attack: 0, strength: 0, defense: 0, hitpoints: 1154, woodcutting: 0, mining: 0, prayer: 0 },
            inventory: [{...ITEM_DB.bronze_sword, qty: 1, uuid: 'starter'}],
            bank: [],
            equipment: { main_hand: null, off_hand: null },
            action: null,
        },
        resources: [],
        npcs: [],
        groundItems: [],
        messages: [{text: "Engine v0.9 Initialized", type: 'sys'}],
        hitsplats: []
    });

    // Refs for Loop
    const stateRef = useRef(gameState);
    useEffect(() => { stateRef.current = gameState; }, [gameState]);

    // Map Init
    const [map] = useState(() => {
        const tiles = [];
        for(let y=0; y<CONFIG.MAP_SIZE; y++) {
            const row = [];
            for(let x=0; x<CONFIG.MAP_SIZE; x++) {
                if (x >= 8 && x <= 12 && y >= 8 && y <= 11) row.push(3);
                else if (x===0||x===49||y===0||y===49) row.push(1);
                else row.push(0);
            }
            tiles.push(row);
        }
        return tiles;
    });

    // Initialize Engine & Dispatcher
    const dispatcher = useMemo(() => {
        const d = new ActionDispatcher();

        // 1. CLICK / INTERACT
        d.register('CLICK_TILE', (state, { x, y }, { map }) => {
            const next = { ...state };
            const res = next.resources.find(r => r.x === x && r.y === y && r.status === 'ACTIVE');
            const npc = next.npcs.find(n => n.x === x && n.y === y && n.status === 'ALIVE');
            const item = next.groundItems.find(i => i.x === x && i.y === y);

            let destX = x, destY = y, pending = null;

            if (res || npc) {
                // Find neighbor
                const neighbors = [{x:x,y:y-1}, {x:x,y:y+1}, {x:x-1,y:y}, {x:x+1,y:y}];
                const valid = neighbors.filter(n => !MathUtils.isBlocked(n.x, n.y, map, next.resources, next.npcs));
                if (valid.length > 0) {
                    valid.sort((a,b) => MathUtils.distance(next.player, a) - MathUtils.distance(next.player, b));
                    destX = valid[0].x; destY = valid[0].y;
                } else {
                    return { ...next, messages: [...next.messages, {text: "Unreachable", type:'sys'}] };
                }

                if (npc) {
                    if (npc.type === 'shop') next.messages.push({text: "Walking to shop...", type:'game'}); // Just walk
                    else pending = { type: 'COMBAT', targetId: npc.id };
                } else if (res) {
                    if (res.type === 'tree') pending = { type: 'SKILLING', skill: 'woodcutting', targetId: res.id };
                    if (res.type === 'rock') pending = { type: 'SKILLING', skill: 'mining', targetId: res.id };
                    if (res.type === 'bank') pending = { type: 'BANKING', targetId: res.id };
                }
            }

            // Calculate Path
            const path = PathfindingSystem.findPath(next.player, {x: destX, y: destY}, map, next.resources, next.npcs);

            if (path.length > 0) {
                next.player.pathQueue = path;
                next.player.pendingAction = pending;
                next.player.action = null;
                next.hitsplats.push({ x: destX, y: destY, val: '📍', type: 'indicator', id: MathUtils.uuid(), ts: Date.now() });
            } else if (MathUtils.distance(next.player, {x:destX, y:destY}) === 0) {
                // Already there, trigger
                if (pending) next.player.action = pending;
                if (npc?.type === 'shop') setModal('shop');
                if (res?.type === 'bank') setModal('bank');
                if (item) {
                     next.player.inventory = InventorySystem.addItem(next.player.inventory, item, item.qty);
                     next.groundItems = next.groundItems.filter(i => i.uuid !== item.uuid);
                     next.messages.push({ text: `Took ${item.name}`, type: 'game' });
                }
            } else {
                next.messages.push({text: "Can't get there", type:'sys'});
            }
            return next;
        });

        // 2. EQUIP / UNEQUIP / DROP / BURY
        d.register('EQUIP', InventorySystem.handleEquip);
        d.register('UNEQUIP', InventorySystem.handleUnequip);
        d.register('DROP', (state, { item, index }) => {
            const p = { ...state.player };
            p.inventory = InventorySystem.removeItem(p.inventory, index);
            return { ...state, player: p, groundItems: [...state.groundItems, { ...item, x: p.x, y: p.y, uuid: MathUtils.uuid() }] };
        });
        d.register('BURY', (state, { index }) => {
            const p = { ...state.player };
            p.inventory = InventorySystem.removeItem(p.inventory, index);
            p.skills.prayer += 4.5;
            return { ...state, player: p, messages: [...state.messages, {text: "Buried bones", type: 'game'}] };
        });

        // 3. TICK (The Loop)
        d.register('TICK', (state, _, { map }) => {
            let next = { ...state, tick: state.tick + 1 };

            // 1. Movement
            next = MovementSystem.processMovementTick(next, map);

            // 2. Combat
            next = CombatSystem.processCombatTick(next);

            // 3. Skilling (Simplified for now, similar to Combat)
            let p = next.player;
            if (p.action?.type === 'SKILLING') {
                const r = next.resources.find(res => res.id === p.action.targetId);
                if (!r || r.status === 'DEPLETED') p.action = null;
                else {
                    const lvl = MathUtils.getLevel(p.skills[p.action.skill]);
                    if (Math.random() < 0.2 + (lvl / 200)) {
                         const item = p.action.skill === 'woodcutting' ? ITEM_DB.logs : ITEM_DB.copper;
                         if (p.inventory.length < 20 || (item.stackable && p.inventory.find(i=>i.id===item.id))) {
                             p.inventory = InventorySystem.addItem(p.inventory, item, 1);
                             p.skills[p.action.skill] += item.xp;
                             next.hitsplats.push({ x: p.x, y: p.y, val: `${item.xp} xp`, type: 'xp', id: MathUtils.uuid(), ts: Date.now() });
                             if (Math.random() > 0.5) {
                                 next.resources = next.resources.map(res => res.id === r.id ? { ...res, status: 'DEPLETED', respawnTimer: 10 } : res);
                                 p.action = null;
                             }
                         } else {
                             p.action = null;
                             next.messages.push({text: "Inventory full", type:'sys'});
                         }
                    }
                }
            }

            // 4. World Updates (Respawn / AI)
            if (next.tick % 20 === 0 && next.player.hp < next.player.maxHp) next.player.hp++;

            next.resources = next.resources.map(r => r.status === 'DEPLETED' ? (r.respawnTimer > 0 ? { ...r, respawnTimer: r.respawnTimer - 1 } : { ...r, status: 'ACTIVE' }) : r);
            next.npcs = next.npcs.map(n => {
                if (n.status === 'DEAD') return n.respawnTimer > 0 ? { ...n, respawnTimer: n.respawnTimer - 1 } : { ...n, status: 'ALIVE', hp: n.maxHp, x: Math.floor(Math.random()*40)+5, y: Math.floor(Math.random()*40)+5 };
                // Simple AI
                if (n.status === 'ALIVE' && n.type === 'enemy' && Math.random() > 0.95 && p.action?.targetId !== n.id) {
                     const tx = n.x + (Math.random()>0.5?1:-1);
                     const ty = n.y + (Math.random()>0.5?1:-1);
                     if (!MathUtils.isBlocked(tx, ty, map, next.resources, next.npcs)) return { ...n, x: tx, y: ty };
                }
                return n;
            });

            // Cleanup
            next.hitsplats = next.hitsplats.filter(h => Date.now() - h.ts < 1000);
            next.messages = next.messages.slice(-15);
            next.player = p;

            return next;
        });

        return d;
    }, []);

    // Load Data
    useEffect(() => {
        const saved = localStorage.getItem('openscape_v9_modular');
        if (saved) {
             try {
                 const parsed = JSON.parse(saved);
                 setGameState(prev => ({...prev, ...parsed, tick:0, messages: [{text: "Save loaded.", type:'sys'}]}));
                 return;
             } catch(e) {}
        }

        // Default Init
        const res = [{ id: 'bank-1', type: 'bank', x: 10, y: 10, collision: true, status: 'ACTIVE' }];
        for(let i=0; i<40; i++) {
            res.push({ id: `t${i}`, type: 'tree', x: Math.floor(Math.random()*40)+5, y: Math.floor(Math.random()*40)+5, status: 'ACTIVE', respawnTimer: 0, collision: true });
            res.push({ id: `r${i}`, type: 'rock', x: Math.floor(Math.random()*40)+5, y: Math.floor(Math.random()*40)+5, status: 'ACTIVE', respawnTimer: 0, collision: true });
        }
        const npcs = [{ id: 'shop', name: 'Merchant', type: 'shop', x: 14, y: 10, collision: true, status: 'ALIVE' }];
        for(let i=0; i<8; i++) npcs.push({
            id: `g${i}`, name: 'Goblin', type: 'enemy', x: Math.floor(Math.random()*40)+5, y: Math.floor(Math.random()*40)+5,
            hp: 5, maxHp: 5, status: 'ALIVE', respawnTimer: 0, stats: { defense: 1 }, collision: false
        });
        setGameState(prev => ({ ...prev, resources: res, npcs: npcs }));
    }, []);

    // Game Loop
    useEffect(() => {
        if (!started) return;
        const interval = setInterval(() => {
            setGameState(prev => dispatcher.dispatch({ type: 'TICK' }, prev, { map }));
        }, CONFIG.TICK_RATE);

        // Save Loop
        const saveInterval = setInterval(() => {
             const { tick, messages, hitsplats, ...saveData } = stateRef.current;
             localStorage.setItem('openscape_v9_modular', JSON.stringify(saveData));
        }, 5000);

        return () => { clearInterval(interval); clearInterval(saveInterval); };
    }, [started, dispatcher, map]);

    // Viewport Scale
    useEffect(() => {
        const handleResize = () => {
            if (gameContainerRef.current) {
                const w = gameContainerRef.current.clientWidth;
                setScale(Math.min(1, w / (CONFIG.VIEWPORT_WIDTH * CONFIG.TILE_SIZE)));
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [started]);

    // --- UI HELPERS ---
    const handleTileClick = (x, y) => {
        if(contextMenu || modal) { setContextMenu(null); setModal(null); return; }
        setGameState(prev => dispatcher.dispatch({ type: 'CLICK_TILE', payload: { x, y } }, prev, { map }));
    };

    const handleContext = (e, type, data, index) => {
        e.preventDefault();
        const x = e.touches?.[0]?.clientX || e.clientX;
        const y = e.touches?.[0]?.clientY || e.clientY;
        setContextMenu({ x, y, type, data, index });
    };

    const executeContext = (action) => {
        const { data, index } = contextMenu;
        setGameState(prev => dispatcher.dispatch({ type: action, payload: { item: data, index: index } }, prev, { map }));
        setContextMenu(null);
    };

    // Bank/Shop interactions remain in UI layer for now or can be moved to dispatcher in future
    const handleBank = (action, item, index) => {
         // Simplified logic, ideally moved to InventorySystem completely
         setGameState(prev => {
             const next = { ...prev };
             const p = next.player;
             if (action === 'deposit') {
                 p.inventory = InventorySystem.removeItem(p.inventory, index);
                 p.bank = InventorySystem.addItem(p.bank, item, item.qty);
             } else { // withdraw
                 if(p.inventory.length < 20 || (item.stackable && p.inventory.find(i=>i.id===item.id))) {
                    const bIdx = p.bank.findIndex(i => i.uuid === item.uuid);
                    if(bIdx > -1) {
                        p.bank.splice(bIdx, 1);
                        p.inventory = InventorySystem.addItem(p.inventory, item, item.qty);
                    }
                 }
             }
             return next;
         });
    };

    // We also need handleShop which was referenced in the modal logic in the original code but logic was inline or missing in my manual reconstruction?
    // In original code: `handleShop('buy', item, -1)` and `handleShop('sell',item,i)`
    // I need to implement `handleShop` to mirror `handleBank` logic structure.

    const handleShop = (action, item, index) => {
        setGameState(prev => {
            const next = { ...prev };
            if (action === 'sell') {
                 const result = InventorySystem.handleShopSell(next, { item, index });
                 return result;
            } else { // buy
                 const result = InventorySystem.handleShopBuy(next, { item });
                 return result;
            }
        });
    }

    // --- RENDER ---
    const { player } = gameState;
    const sx = player.x - Math.floor(CONFIG.VIEWPORT_WIDTH/2);
    const sy = player.y - Math.floor(CONFIG.VIEWPORT_HEIGHT/2);

    if (!started) return (
        <div className="h-[100dvh] bg-stone-900 flex flex-col items-center justify-center p-4">
            <div className="p-6 bg-stone-800 border-4 border-stone-600 rounded-lg shadow-2xl rpg-bevel text-center max-w-sm w-full">
                <h1 className="text-3xl text-yellow-500 font-bold mb-2 tracking-wider">OPENSCAPE</h1>
                <p className="text-xs text-stone-500 mb-6 font-mono">ENGINE v0.9 (MODULAR)</p>
                <div className="text-left text-xs text-stone-400 bg-black/20 p-3 rounded mb-6 space-y-1">
                    <p>🛠️ Systems Refactor (ECS-Lite)</p>
                    <p>⚡ Action Dispatcher</p>
                    <p>🐛 Bug Fixes Applied</p>
                </div>
                <button onClick={() => setStarted(true)} className="w-full py-3 bg-red-800 hover:bg-red-700 text-white font-bold border-2 border-red-950 rounded shadow-lg flex items-center justify-center gap-2">
                    <Play size={16} fill="currentColor"/> PLAY NOW
                </button>
            </div>
        </div>
    );

    // Phaser will handle all world/canvas rendering.
    // Only UI overlays, menus, and inventory remain in React.
    return (
        <div className="h-[100dvh] w-full bg-black font-sans text-stone-200 overflow-hidden flex flex-col md:items-center md:justify-center"
             onClick={() => { setContextMenu(null); }}>
          {/* Phaser canvas will be injected below this div by PhaserGame.js */}
          <div ref={gameContainerRef} id="phaser-container" style={{ width: '100%', height: '100%', flex: 1, position: 'relative' }} />

          {/* UI overlays, menus, and inventory panels remain here */}
          <div className={`bg-stone-800 md:w-64 md:border-l-[4px] border-stone-600 flex flex-col z-20 transition-all duration-300 ease-in-out rpg-bevel ${window.innerWidth < 768 ? `fixed bottom-[60px] left-0 right-0 border-t-[4px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${mobilePanelOpen ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'}` : 'relative h-full'}`} style={{maxHeight: window.innerWidth<768 ? '60vh' : 'auto'}}>
                <div className="md:hidden w-full h-4 bg-stone-700 flex items-center justify-center cursor-pointer" onClick={()=>setMobilePanelOpen(false)}><div className="w-10 h-1 bg-stone-500 rounded-full"></div></div>
                <div className="flex bg-stone-800 border-b border-stone-600 select-none">
                    <TabBtn icon={<Backpack size={18}/>} active={activeTab==='inventory'} onClick={()=>setActiveTab('inventory')} label="INV"/>
                    <TabBtn icon={<Activity size={18}/>} active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} label="STATS"/>
                    <TabBtn icon={<MessageSquare size={18}/>} active={activeTab==='chat'} onClick={()=>setActiveTab('chat')} label="CHAT"/>
                </div>
                <div className="flex-1 overflow-y-auto p-3 bg-[#1c1917] min-h-[250px]">
                    {activeTab === 'inventory' && (
                        <>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                 <EquipSlot name="Main Hand" item={gameState.player.equipment.main_hand} onContext={(e)=>handleContext(e,'equipment',gameState.player.equipment.main_hand,-1)}/>
                                 <EquipSlot name="Off Hand" item={gameState.player.equipment.off_hand} onContext={(e)=>handleContext(e,'equipment',gameState.player.equipment.off_hand,-1)}/>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {gameState.player.inventory.map((item, i) => (
                                    <div key={i} onContextMenu={(e)=>handleContext(e, 'inventory', item, i)} onClick={(e)=>window.innerWidth<768 && handleContext(e, 'inventory', item, i)} className="aspect-square bg-stone-900 border-2 border-stone-700 rounded-sm flex items-center justify-center text-xl relative cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] hover:border-yellow-600">
                                        {item.icon}
                                        {item.stackable && <span className="absolute top-0 left-1 text-[9px] text-yellow-400 font-mono">{item.qty}</span>}
                                        {(item.type === 'weapon' || item.type === 'armor') && <span className="absolute bottom-0 right-0 text-[8px] bg-blue-900 text-white px-1">E</span>}
                                    </div>
                                ))}
                                {Array.from({length:20-gameState.player.inventory.length}).map((_,i)=><div key={`e${i}`} className="aspect-square bg-stone-950/30 rounded-sm border border-white/5"></div>)}
                            </div>
                        </>
                    )}
                    {activeTab === 'stats' && <div className="space-y-1">{Object.entries(gameState.player.skills).map(([k,v])=>(<div key={k} className="flex items-center justify-between bg-stone-900/50 p-1 px-2 rounded border border-stone-800"><span className="capitalize text-stone-400 text-xs">{k}</span><span className="text-yellow-500 font-mono text-sm">{k==='hitpoints'?Math.floor(MathUtils.getLevel(v)/10):MathUtils.getLevel(v)}</span></div>))}</div>}
                    {activeTab === 'chat' && <div className="flex flex-col h-full text-[11px] font-mono leading-relaxed text-stone-300 space-y-1">{gameState.messages.map((m,i)=><div key={i} className={m.type==='sys'?'text-yellow-500':''}>{m.text}</div>)}</div>}
                </div>
            </div>

          {/* Mobile nav remains unchanged */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-stone-900 border-t-2 border-stone-700 flex justify-around items-center z-50 pb-safe">
                <NavBtn icon={<Backpack/>} active={activeTab==='inventory' && mobilePanelOpen} onClick={()=>{setActiveTab('inventory'); setMobilePanelOpen(prev => activeTab==='inventory' ? !prev : true);}} />
                <NavBtn icon={<Activity/>} active={activeTab==='stats' && mobilePanelOpen} onClick={()=>{setActiveTab('stats'); setMobilePanelOpen(prev => activeTab==='stats' ? !prev : true);}} />
                <NavBtn icon={<MessageSquare/>} active={activeTab==='chat' && mobilePanelOpen} onClick={()=>{setActiveTab('chat'); setMobilePanelOpen(prev => activeTab==='chat' ? !prev : true);}} />
          </div>

          {/* Context menu and modal overlays remain unchanged */}
          {contextMenu && (
            <div className="fixed inset-0 z-[100] bg-black/20" onClick={()=>setContextMenu(null)}>
                <div className="absolute bg-[#35312d] border-2 border-stone-500 shadow-xl w-40 overflow-hidden rpg-menu" style={{top:Math.min(contextMenu.y, window.innerHeight-180), left:Math.min(contextMenu.x, window.innerWidth-170)}}>
                    <div className="bg-stone-800 p-1 px-2 text-center text-xs font-bold text-yellow-500 border-b border-stone-600 truncate">{contextMenu.data?.name || "Options"}</div>
                    {contextMenu.type === 'equipment' && <ContextBtn onClick={()=>executeContext('UNEQUIP')}>Unequip</ContextBtn>}
                    {contextMenu.type === 'inventory' && (
                        <>
                            {(contextMenu.data.type === 'weapon' || contextMenu.data.type === 'armor') && <ContextBtn onClick={()=>executeContext('EQUIP')}>Equip</ContextBtn>}
                            {contextMenu.data.id === 'bones' && <ContextBtn onClick={()=>executeContext('BURY')}>Bury</ContextBtn>}
                            <ContextBtn onClick={()=>executeContext('DROP')}>Drop</ContextBtn>
                            <ContextBtn onClick={()=>setContextMenu(null)} color="text-stone-500">Cancel</ContextBtn>
                        </>
                    )}
                </div>
            </div>
          )}

          {modal && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                 <div className="bg-[#2d2a26] border-[4px] border-stone-500 w-full max-w-lg rounded shadow-2xl flex flex-col max-h-[85vh] rpg-bevel">
                      <div className="flex justify-between items-center p-3 bg-stone-800 border-b-2 border-stone-600">
                          <span className="text-yellow-500 font-bold tracking-wider">{modal==='bank'?'BANK':'GENERAL STORE'}</span>
                          <button onClick={()=>setModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
                      </div>
                      <div className="p-2 text-center text-xs text-stone-500 bg-[#151413]">{modal === 'bank' ? "Click Inventory to Deposit / Bank to Withdraw" : "Click Inventory to Sell / Shop to Buy"}</div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#151413]">
                          <div className="bg-stone-900/50 p-2 rounded border border-stone-700/50">
                              <h4 className="text-[10px] text-stone-500 uppercase font-bold mb-2">{modal==='bank'?'Storage':'Stock'}</h4>
                              <div className="grid grid-cols-6 gap-2">
                                 {modal==='bank'
                                    ? gameState.player.bank.map((item,i)=><ItemIcon key={i} item={item} onClick={()=>handleBank('withdraw', item, i)}/>)
                                    : Object.values(ITEM_DB).filter(i=>i.value>0).map((item,i)=><ItemIcon key={i} item={item} onClick={()=>handleShop('buy', item, -1)}/>)
                                 }
                              </div>
                          </div>
                          <div className="bg-stone-900/50 p-2 rounded border border-stone-700/50">
                              <h4 className="text-[10px] text-stone-500 uppercase font-bold mb-2">Inventory</h4>
                              <div className="grid grid-cols-6 gap-2">
                                 {gameState.player.inventory.map((item,i)=><ItemIcon key={i} item={item} onClick={()=>modal==='bank'?handleBank('deposit',item,i):handleShop('sell',item,i)}/>)}}
                              </div>
                          </div>
                      </div>
                 </div>
            </div>
          )}

          <style jsx global>{`
            .rpg-bevel { box-shadow: inset 2px 2px 0px rgba(255,255,255,0.1), inset -2px -2px 0px rgba(0,0,0,0.5); }
            .rpg-menu { box-shadow: 4px 4px 0px rgba(0,0,0,0.5); }
            @keyframes float { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-30px); opacity: 0; } }
            .animate-float { animation: float 0.8s ease-out forwards; }
            .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
          `}</style>
        </div>
    );
}

// UI Subcomponents
const ItemIcon = ({ item, onClick }) => (
    <div onClick={onClick} className="aspect-square bg-stone-900 border border-stone-700 rounded flex items-center justify-center text-lg cursor-pointer hover:border-yellow-500 shadow-inner relative">
        {item.icon}
        {item.stackable && item.qty > 1 && <span className="absolute top-0 left-1 text-[8px] text-yellow-400 font-mono">{item.qty}</span>}
    </div>
);
const EquipSlot = ({ name, item, onContext }) => (
    <div className="bg-stone-900 border border-stone-700 p-1 rounded flex justify-between items-center px-2 cursor-pointer hover:border-stone-500" onContextMenu={item ? onContext : undefined}>
        <span className="text-[9px] text-stone-500 font-bold uppercase">{name}</span>
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-white">{item?.name || "-"}</span>
            {item && <span className="text-sm">{item.icon}</span>}
        </div>
    </div>
);
const TabBtn = ({ icon, active, onClick, label }) => (
    <button onClick={onClick} className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-wider transition-colors border-r border-stone-700 last:border-r-0 ${active ? 'bg-[#2d2a26] text-yellow-500 shadow-[inset_0_-2px_0_#eab308]' : 'bg-stone-800 text-stone-500 hover:bg-stone-700'}`}>
        {icon} <span>{label}</span>
    </button>
);
const NavBtn = ({ icon, active, onClick }) => (
    <button onClick={onClick} className={`p-2 rounded-lg transition-all ${active ? 'bg-yellow-600/20 text-yellow-500 scale-110' : 'text-stone-500'}`}>{React.cloneElement(icon, { size: 24 })}</button>
);
const ContextBtn = ({ onClick, children, color="text-stone-300" }) => (
    <button className={`w-full text-left p-2 px-3 text-sm hover:bg-stone-700 border-b border-stone-700/50 last:border-0 ${color}`} onClick={onClick}>{children}</button>
);
