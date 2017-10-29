const magik = magikcraft.io;
const log = magik.dixit;
const KEY = 'mct1-demo';

export function getState() {
	const state = magik.playerMap.get(KEY) || {};
	state.bgl = state.bgl !== undefined ? state.bgl : 5;
	state.insulin = state.insulin !== undefined ? state.insulin : 0;
	state.digestionQueue = state.digestionQueue ? state.digestionQueue.sort((a,b) => a.timestamp - b.timestamp) : [];
	state.bglBar = state.bglBar || null;
	state.insulinBar = state.insulinBar || null;
	state.digestionBar0 = state.digestionBar0 || null;
	state.digestionBar1 = state.digestionBar1 || null;
	// state.digestionBar2 = state.digestionBar2 || null;
	return state;
}

export function setState(state) {
	state.bgl = state.bgl !== undefined ? state.bgl : 5;
	state.insulin = state.insulin !== undefined ? state.insulin : 0;
	state.digestionQueue = state.digestionQueue ? state.digestionQueue.sort((a,b) => a.timestamp - b.timestamp) : [];
	state.bglBar = state.bglBar || null;
	state.insulinBar = state.insulinBar || null;
	state.digestionBar0 = state.digestionBar0 || null;
	state.digestionBar1 = state.digestionBar1 || null;
	// state.digestionBar2 = state.digestionBar2 || null;
	magik.playerMap.put(KEY, state);
}