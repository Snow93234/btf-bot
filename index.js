require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

// ==============================
// 🌐 Servidor Web (Render + UptimeRobot)
// ==============================
const app = express();

app.get("/", (req, res) => {
  res.send("✅ BTF Bot está online e funcionando!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor web ativo na porta ${PORT}`);
});

// ==============================
// 🤖 Inicialização do Bot Discord
// ==============================
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

// ==============================
// 🟣 Status do Bot
// ==============================
client.once("ready", () => {
  client.user.setPresence({
    status: "online",
    activities: [{ name: "🎟️ Bot Oficial da BTF", type: 0 }],
  });
  console.log(`✅ Bot logado como ${client.user.tag}`);
});

// ==============================
// 🎫 Sistema de Tickets
// ==============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content === "!painel") {
    const embed = new EmbedBuilder()
      .setTitle("🎫 BTF - Suporte")
      .setDescription(
        "**BTF - Suporte**\n" +
        "Bem-vindo ao suporte oficial da BTF.\n\n" +
        "Para agilizar o atendimento, selecione abaixo a categoria que melhor corresponde à sua solicitação.\n\n" +
        "**Observações importantes:**\n" +
        "- Quanto mais detalhes forem informados, mais eficiente será o atendimento.\n" +
        "- O atendimento é realizado por ordem de chegada.\n" +
        "- O prazo máximo de resposta é de até **2 dias úteis**.\n\n" +
        "**Escolha a categoria desejada no menu abaixo.**"
      )
      .setImage("https://media.discordapp.net/attachments/1436393272611176648/1436400284359332041/image.png")
      .setColor("#2b2d31");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("menu_ticket")
      .setPlaceholder("Selecione uma categoria de atendimento")
      .addOptions(
        {
          label: "Dúvidas",
          value: "duvida",
          description: "Tire dúvidas sobre a liga ou servidor.",
          emoji: { id: "1436670233556422656", name: "duvidas", animated: true }
        },
        {
          label: "Reportar alguém",
          value: "report",
          description: "Reporte um jogador.",
          emoji: { id: "1436670286996045885", name: "report", animated: false }
        },
        {
          label: "Ownar um time",
          value: "ownar",
          description: "Solicite a criação de um time.",
          emoji: { id: "1436387023333228594", name: "ownar", animated: false }
        },
        {
          label: "Outros assuntos",
          value: "outros",
          description: "Para solicitações diversas.",
          emoji: "📋"
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ==============================
// 🎟️ Abertura / Fechamento de Ticket
// ==============================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {
    await interaction.deferReply({ ephemeral: true });
    const tipo = interaction.values[0];

    const existente = interaction.guild.channels.cache.find(
      (c) => c.topic && c.topic.includes(`Dono: ${interaction.user.id}`)
    );

    if (existente)
      return interaction.editReply({ content: `⚠️ Você já tem um ticket aberto em ${existente}.` });

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
      new ButtonBuilder().setCustomId("resgatar_ticket").setLabel("Resgatar Ticket").setStyle(ButtonStyle.Secondary)
    );

    const embedTicket = new EmbedBuilder()
      .setTitle("🎫 Ticket Aberto")
      .setDescription(`Olá ${interaction.user}, explique seu problema abaixo.`)
      .setColor("#2b2d31");

    await canal.send({ embeds: [embedTicket], components: [botoes] });
    await interaction.editReply({ content: `✅ Seu ticket foi criado com sucesso em ${canal}.` });
  }

  // === Fechar Ticket ===
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {
    const canal = interaction.channel;
    const donoId = canal.topic?.match(/Dono: (\d+)/)?.[1];
    if (!donoId) return interaction.reply({ content: "Erro ao identificar o dono.", ephemeral: true });

    const dono = await client.users.fetch(donoId).catch(() => null);

    if (dono) {
      const row = new ActionRowBuilder().addComponents(
        ...[1, 2, 3, 4, 5].map((n) =>
          new ButtonBuilder()
            .setCustomId(`avaliacao_${n}`)
            .setLabel("⭐".repeat(n))
            .setStyle(ButtonStyle.Secondary)
        )
      );

      const dmEmbed = new EmbedBuilder()
        .setTitle("📋 Avaliação - BTF")
        .setDescription("Avalie seu atendimento clicando nas estrelas:")
        .setColor("#2b2d31");

      await dono.send({ embeds: [dmEmbed], components: [row] }).catch(() => {});
    }

    await interaction.reply({ content: "⏳ Fechando o ticket em 5 segundos...", ephemeral: true });
    setTimeout(() => canal.delete().catch(() => {}), 5000);
  }

  // === Registrar Avaliação ===
  if (interaction.isButton() && interaction.customId.startsWith("avaliacao_")) {
    const nota = interaction.customId.split("_")[1];
    const estrelas = "⭐".repeat(nota);
    const avaliacoes = client.channels.cache.get(AVALIACAO_CHANNEL_ID);

    if (avaliacoes) {
      const embed = new EmbedBuilder()
        .setTitle("⭐ Nova Avaliação Recebida")
        .setDescription(`Usuário: ${interaction.user}\nAvaliação: ${estrelas}`)
        .setColor("#2b2d31");

      await avaliacoes.send({ embeds: [embed] });
    }

    await interaction.reply({ content: "✅ Avaliação registrada! Obrigado.", ephemeral: true });
  }
});

// ==============================
// 🚀 Login
// ==============================
client.login(process.env.TOKEN);
