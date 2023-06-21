import { REST, Routes } from 'discord.js';

import { getBotToken } from './auth';
import config from 'config';
import commands from './commands';

const commandData = commands.map(cmd => cmd.data.toJSON());

export default async function () {
	const token = await getBotToken();

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