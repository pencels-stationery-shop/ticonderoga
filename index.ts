import * as bot from "./bot";
import deployCommands from './deploy-commands';
import config from 'config';

console.log(config);

(async () => {
    console.log('[Ticonderoga] Deploying commands.')
    await deployCommands();
    console.log('[Ticonderoga] Starting bot.')
    await bot.start();
})();