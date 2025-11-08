require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

// Servidor Web
const app = express();
app.get("/", (req, res) => res.send("✅ BTF Bot Online"));
app.listen(process.env.PORT || 3000);

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const STAFF_ROLE_ID = "1436399739397603428";
const AVALIACAO_CHANNEL_ID = "1436393631790403796";

// Status
client.on("ready", () => {
  client.user.setPresence({
    status: "online",
    activities: [{ name: "🎟️ Bot Oficial da BTF", type: 0 }],
  });
  console.log(`✅ Logado como ${client.user.tag}`);
});

// Painel
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content !== "!painel") return;

  const embed = new EmbedBuilder()
    .setTitle("🎫 BTF - Suporte")
    .setDescription(
      "**BTF - Suporte**\n" +
      "Bem-vindo ao suporte oficial da BTF.\n\n" +
      "Para agilizar o atendimento, selecione abaixo a categoria que melhor corresponde à sua solicitação. Forneça o máximo possível de informações para que nossa equipe possa compreender e resolver sua situação da melhor forma.\n\n" +
      "**Observações importantes:**\n" +
      "- Quanto mais detalhes forem informados (como imagens, descrições e horários aproximados), mais eficiente será o atendimento.\n" +
      "- O atendimento é realizado por ordem de chegada.\n" +
      "- O prazo máximo de resposta é de até **2 dias úteis**.\n\n" +
      "**Escolha a categoria desejada no menu abaixo.**"
    )
    .setColor("#9b59b6")
    .setImage("https://media.discordapp.net/attachments/1436387855759835136/1436705826554380389/Captura_de_tela_2025-11-07_140150.png");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("menu_ticket")
    .setPlaceholder("Selecione uma categoria")
    .addOptions(
      {
        label: "Dúvidas",
        value: "duvida",
        emoji: { id: "1436670233556422656", name: "duvidas", animated: true }
      },
      {
        label: "Reportar alguém",
        value: "report",
        emoji: { id: "1436670286996045885", name: "report", animated: false }
      },
      {
        label: "Ownar um time",
        value: "ownar",
        emoji: { id: "1436387023333228594", name: "bf1308afd6136988eb568df66534354b", animated: false }
      },
      { label: "Outros assuntos", value: "outros", emoji: "📋" }
    );

  await message.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
});

// Ticket
client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {
    await interaction.deferReply({ ephemeral: true });
    const tipo = interaction.values[0];

    const existente = interaction.guild.channels.cache.find(
      (c) => c.topic && c.topic.includes(`Dono: ${interaction.user.id}`)
    );
    if (existente)
      return interaction.editReply({ content: `⚠️ Você já possui um ticket aberto: ${existente}` });

    const canal = await interaction.guild.channels.create({
      name: `ticket-${tipo}-${interaction.user.username}`,
      type: 0,
      topic: `Dono: ${interaction.user.id} | Atendido por: Ninguém`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("fechar_ticket").setLabel("Fechar Ticket").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("resgatar_ticket").setLabel("Resgatar Ticket").setStyle(ButtonStyle.Success)
    );

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎫 Ticket Aberto")
          .setDescription(`Olá ${interaction.user}, explique seu problema abaixo.`)
          .setColor("#9b59b6"),
      ],
      components: [botoes],
    });

    interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
  }

  // Resgatar Ticket (seta atendente)
  if (interaction.isButton() && interaction.customId === "resgatar_ticket") {
    const canal = interaction.channel;
    canal.setTopic(`Dono: ${canal.topic.match(/Dono: (\d+)/)[1]} | Atendido por: ${interaction.user.id}`);
    await interaction.reply({ content: `✅ Ticket resgatado por ${interaction.user}`, ephemeral: false });
  }

  // Fechar Ticket
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {
    const canal = interaction.channel;
    const donoId = canal.topic.match(/Dono: (\d+)/)[1];
    const atendenteId = canal.topic.includes("Atendido por:") ? canal.topic.split("Atendido por: ")[1] : "Ninguém";

    const dono = await client.users.fetch(donoId).catch(() => null);
    if (dono) {
      const estrela = "<:972699744675717230:1436410165594423387>";
      const row = new ActionRowBuilder().addComponents(
        ...[1, 2, 3, 4, 5].map((n) =>
          new ButtonBuilder()
            .setCustomId(`avaliacao_${n}_${atendenteId}`)
            .setLabel(estrela.repeat(n))
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await dono.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📋 Avaliação - BTF")
            .setDescription("Avalie o atendimento clicando nas estrelas abaixo:")
            .setColor("#9b59b6")
        ],
        components: [row],
      }).catch(() => {});
    }

    await interaction.reply({ content: "⏳ Ticket será fechado em 5 segundos...", ephemeral: true });
    setTimeout(() => canal.delete().catch(() => {}), 5000);
  }

  // Registrar Avaliação
  if (interaction.isButton() && interaction.customId.startsWith("avaliacao_")) {
    const [, nota, atendenteId] = interaction.customId.split("_");
    const estrela = "<:972699744675717230:1436410165594423387>".repeat(nota);
    const canal = client.channels.cache.get(AVALIACAO_CHANNEL_ID);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📥 Nova Avaliação Recebida")
          .setDescription(`Usuário: ${interaction.user}\nAtendente: <@${atendenteId}>\nAvaliação: ${estrela}`)
          .setColor("#9b59b6")
      ],
    });

    await interaction.reply({ content: "✅ Avaliação registrada! Obrigado.", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
