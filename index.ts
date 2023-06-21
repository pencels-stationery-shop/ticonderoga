import * as bot from "./bot";
import deployCommands from './deploy-commands';
import config from 'config';

(async () => {
    const botName = config.get('botName');
    console.log(`[${botName}] Deploying commands.`)
    await deployCommands();
    console.log(`[${botName}] Starting bot.`)
    await bot.start();
})();