import {solve} from './model.js';
self.onmessage=({data})=>self.postMessage(solve(data)?.[0]??null);
