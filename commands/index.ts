import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export type CommandData = {
    data: SlashCommandBuilder,
    execute: (interaction: CommandInteraction) => Promise<void>,
};

import ping from './ping';
import pp from './pp';

export default [
    ping,
    pp,
] as CommandData[];