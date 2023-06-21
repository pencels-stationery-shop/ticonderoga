import discord, { Client, CommandInteraction, Events, REST, Routes, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";

export type CommandData = {
    data: SlashCommandBuilder | SlashCommandSubcommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandGroupBuilder | SlashCommandSubcommandsOnlyBuilder,
    execute: (interaction: CommandInteraction) => Promise<void>,
};

import config from "config";
import { getBotToken } from "../auth";

import ping from './ping';
import pp from './pp';
import reactionRoles from "./reaction-roles";

const commands: CommandData[] = [
    ping,
    pp,
    reactionRoles,
];

export async function deployCommands() {
    const token = await getBotToken();
    const commandData = commands.map(cmd => cmd.data.toJSON());

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(token!);

    try {
        console.log(`Started refreshing ${commandData.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(config.get("discordApplicationId")),
            { body: commandData },
        ) as any;

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
}

export function registerCommands(client: Client) {
    const commandsCollection = new discord.Collection<string, any>();
    for (const command of commands) {
        commandsCollection.set(command.data.name, command);
    }

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        const command = commandsCollection.get(interaction.commandName);

        try {
            await command.execute(interaction);
        } catch (e) {
            console.log(e);
            const oopsies = {
                content: 'oops',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(oopsies);
            } else {
                await interaction.reply(oopsies);
            }
        }
    });
}