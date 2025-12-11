/* ==========================================================================
   MODULE: engine/ActionDispatcher.js
   ==========================================================================
*/
export class ActionDispatcher {
    constructor() {
        this.handlers = {};
    }

    register(type, handler) {
        this.handlers[type] = handler;
    }

    dispatch(action, state, context) { // Context for map/etc
        const handler = this.handlers[action.type];
        if (!handler) {
            console.warn(`No handler for ${action.type}`);
            return state;
        }
        return handler(state, action.payload, context);
    }
}
