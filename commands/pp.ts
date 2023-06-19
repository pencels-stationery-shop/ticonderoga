import { SlashCommandBuilder, CommandInteraction, userMention } from 'discord.js';

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

export default {
    data: new SlashCommandBuilder()
        .setName("pp")
        .setDescription("Exactly what you think it is."),
    async execute(interaction: CommandInteraction) {
        const inches = getRandomInt(0, 13);
        let preface = '';
        if (inches === 0) {
            preface = "😀 ... ";
        } else if (inches === 12) {
            preface = "😭 ... ";
        }
        const fraction = getRandomInt(0, 10);
        await interaction.reply(`${userMention(interaction.user.id)}, your pp is: ${preface}${inches}.${fraction} inches long!`);
    }
};