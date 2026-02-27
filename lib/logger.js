const TAG = '\x1b[36m[NEXT]\x1b[0m';

const info  = (msg) => console.log(`${TAG} \x1b[36mINFO\x1b[0m  ${msg}`);
const warn  = (msg) => console.warn(`${TAG} \x1b[33mWARN\x1b[0m  ${msg}`);
const error = (msg) => console.error(`${TAG} \x1b[31mERROR\x1b[0m ${msg}`);
const debug = (msg) => console.log(`${TAG} \x1b[90mDEBUG\x1b[0m ${msg}`);

module.exports = { info, warn, error, debug };
