require('./keep_alive.js');
require('./status-monitor.js');
const { pedidos, config, cargos, servidores } = require('./auto-save.js');
const { 
  PLACAR_CONFIG, 
  configurarTipoPlacar, 
  adicionarRecrutamento, 
  atualizarMensagemPlacar,
  iniciarVerificacaoResets,
  obterCanalPlacar
} = require('./placar-manager.js');
const { operacaoSegura, limparLocksGit, respostaRapida, atualizarResposta, interactionManager } = require('./discord-helper.js');

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  ChannelType,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField,
  Collection,
} = require("discord.js");
const fs = require("fs");

// ======= CONFIGURAÇÕES DE AUTORIZAÇÃO =======
const DONO_BOT_ID = "1069959184520597546";
const ADMINS_AUTORIZADOS = [DONO_BOT_ID];

// ======= CONFIGURAÇÕES DE OTIMIZAÇÃO =======
const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutos
const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos

// ======= CLIENTE DISCORD COM OTIMIZAÇÕES CORRIGIDAS =======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  // Configurações de cache simplificadas
  sweepers: {
    messages: {
      interval: 300, // 5 minutos
      lifetime: 1800, // 30 minutos
    },
    users: {
      interval: 3600, // 1 hora
      filter: () => user => user.bot && user.id !== client.user?.id,
    },
  },
});

const TOKEN = process.env.DISCORD_TOKEN;

// ======= CONFIGURAÇÕES DE CORES =======
const CORES = {
  PRINCIPAL: 0x5865f2,
  SUCESSO: 0x57f287,
  ERRO: 0xed4245,
  AVISO: 0xfee75c,
  INFO: 0x5dade2,
  NEUTRO: 0x99aab5,
};

// ======= CACHE E DADOS =======
let cargosData = {};
let pedidosData = {};
let configData = {};
let servidoresData = { autorizados: {}, pendentes: {} };

// ======= SISTEMA DE LIMPEZA DE MEMÓRIA =======
function limparMemoria() {
  try {
    console.log('🧹 Iniciando limpeza de memória...');
    
    // Limpar cache do Discord.js de forma mais segura
    if (client.guilds?.cache) {
      client.guilds.cache.sweep(() => false);
    }
    if (client.channels?.cache) {
      client.channels.cache.sweep(() => false);
    }
    if (client.users?.cache) {
      client.users.cache.sweep(user => user.id !== client.user?.id && user.bot);
    }
    
    // Forçar garbage collection se disponível
    if (global.gc) {
      global.gc();
      console.log('🗑️ Garbage collection executado');
    }
    
    // Log de uso de memória
    const used = process.memoryUsage();
    console.log('📊 Uso de memória:', {
      rss: Math.round(used.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB'
    });
    
  } catch (err) {
    console.error('❌ Erro na limpeza de memória:', err.message);
  }
}

function monitorarMemoria() {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  
  // Se usar mais de 400MB, fazer limpeza
  if (heapUsedMB > 400) {
    console.log(`⚠️ Alto uso de memória detectado: ${heapUsedMB}MB`);
    limparMemoria();
  }
}

// ======= CARREGAMENTO INICIAL DE DADOS =======
function carregarDadosIniciais() {
  try {
    console.log('📖 Carregando dados iniciais...');
    cargosData = cargos.carregar();
    pedidosData = pedidos.carregar();
    configData = config.carregar();
    servidoresData = servidores.carregar();
    
    // Garantir estrutura correta
    if (!servidoresData.autorizados) servidoresData.autorizados = {};
    if (!servidoresData.pendentes) servidoresData.pendentes = {};
    
    console.log('✅ Dados carregados com sucesso');
  } catch (err) {
    console.error('❌ Erro ao carregar dados:', err.message);
  }
}

// ======= FUNÇÕES DE AUTORIZAÇÃO =======
function isServerAuthorized(guildId) {
  return !!servidoresData.autorizados[guildId];
}

function isServerPending(guildId) {
  return !!servidoresData.pendentes[guildId];
}

function authorizeServer(guildId, guildData) {
  servidoresData.autorizados[guildId] = {
    ...guildData,
    authorizedAt: Date.now()
  };
  delete servidoresData.pendentes[guildId];
  servidores.salvar(servidoresData, `Servidor autorizado: ${guildData.name}`);
}

function denyServer(guildId) {
  delete servidoresData.pendentes[guildId];
  servidores.salvar(servidoresData, `Servidor negado: ${guildId}`);
}

function addPendingServer(guildId, guildData) {
  servidoresData.pendentes[guildId] = {
    ...guildData,
    requestedAt: Date.now()
  };
  servidores.salvar(servidoresData, `Nova solicitação de servidor: ${guildData.name}`);
}

function isAuthorizedUser(userId) {
  return ADMINS_AUTORIZADOS.includes(userId);
}

async function sendAuthorizationRequest(guild) {
  try {
    const dono = await client.users.fetch(DONO_BOT_ID);
    const owner = await guild.fetchOwner();
    
    const guildData = {
      name: guild.name,
      id: guild.id,
      ownerId: owner.id,
      ownerTag: owner.user.tag,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt.toISOString()
    };
    
    addPendingServer(guild.id, guildData);
    
    const embed = new EmbedBuilder()
      .setColor(CORES.AVISO)
      .setTitle("🔐 Nova Solicitação de Autorização")
      .setDescription("Um novo servidor está solicitando autorização para usar o bot.")
      .addFields(
        { name: "🏠 Nome do Servidor", value: guild.name, inline: true },
        { name: "🆔 ID do Servidor", value: guild.id, inline: true },
        { name: "👑 Dono do Servidor", value: `${owner.user.tag} (${owner.id})`, inline: false },
        { name: "👥 Membros", value: guild.memberCount.toString(), inline: true },
        { name: "📅 Servidor Criado", value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:F>`, inline: true }
      )
      .setThumbnail(guild.iconURL() || null)
      .setFooter({ text: "Sistema de Autorização de Servidores" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`authorize_server_${guild.id}`)
        .setLabel("Aprovar Servidor")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(`deny_server_${guild.id}`)
        .setLabel("Negar Servidor")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );

    await dono.send({ embeds: [embed], components: [row] });
    console.log(`📨 Solicitação de autorização enviada para ${guild.name} (${guild.id})`);
  } catch (error) {
    console.log(`❌ Erro ao enviar solicitação de autorização para ${guild.name}:`, error);
  }
}

// ======= FUNÇÕES AUXILIARES PARA DADOS POR SERVIDOR =======
function getServerConfig(guildId) {
  if (!configData[guildId]) {
    configData[guildId] = {};
  }
  return configData[guildId];
}

function getServerCargos(guildId) {
  if (!cargosData[guildId]) {
    cargosData[guildId] = {};
  }
  return cargosData[guildId];
}

function getServerPedidos(guildId) {
  if (!pedidosData[guildId]) {
    pedidosData[guildId] = {};
  }
  return pedidosData[guildId];
}

// ======= IDS DE CANAIS CONFIGURADOS POR SERVIDOR =======
function getPedirTagId(guildId) {
  return getServerConfig(guildId).pedirTagId;
}

function getAprovarTagId(guildId) {
  return getServerConfig(guildId).aprovarTagId;
}

function getResultadosId(guildId) {
  return getServerConfig(guildId).resultadosId;
}

// ======= UTILIDADES =======
function getTopFormattedRoleId(member) {
  const serverCargos = getServerCargos(member.guild.id);
  const formattedRoles = member.roles.cache.filter((r) => r.id in serverCargos);
  if (formattedRoles.size === 0) return null;

  const topRole = formattedRoles
    .sort((a, b) => b.position - a.position)
    .first();
  return topRole.id;
}

function buildNick({ formato, nomeBase, idPedido }) {
  if (formato) {
    if (idPedido) return `${formato} ${nomeBase} (${idPedido})`;
    return `${formato} ${nomeBase}`;
  } else {
    if (idPedido) return `${nomeBase} (${idPedido})`;
    return null;
  }
}

function truncateToDiscordLimit(nick) {
  const MAX = 32;
  if (!nick) return nick;
  if (nick.length <= MAX) return nick;

  const idTailMatch = nick.match(/\s\(\d+\)$/);
  const tail = idTailMatch ? idTailMatch[0] : "";
  const base = tail ? nick.slice(0, nick.length - tail.length) : nick;

  const remaining = MAX - tail.length;
  if (remaining <= 0) return nick.slice(0, MAX);

  return base.slice(0, remaining).trim() + tail;
}

async function atualizarNickname(member) {
  try {
    const guildId = member.guild.id;
    const userId = member.id;
    const serverPedidos = getServerPedidos(guildId);
    const serverCargos = getServerCargos(guildId);

    const pedido = serverPedidos[userId];
    const nomeBase = pedido && pedido.nome ? pedido.nome : member.user.username;
    const idPedido = pedido && pedido.id ? pedido.id : null;

    const roleId = getTopFormattedRoleId(member);
    const formato = roleId ? serverCargos[roleId] : null;

    const novo = buildNick({ formato, nomeBase, idPedido });
    if (!novo) return;

    const novoTruncado = truncateToDiscordLimit(novo);
    if (member.nickname === novoTruncado) return;

    await member.setNickname(novoTruncado).catch(() => {
      console.log(
        `❌ Não consegui alterar o nick de ${member.user.tag} no servidor ${member.guild.name}`,
      );
    });
    
    console.log(`✅ Nick atualizado: ${member.user.tag} → ${novoTruncado}`);
  } catch (e) {
    console.log("Erro ao atualizar nickname:", e);
  }
}

// ======= READY: registra comandos globais =======
client.once("ready", async () => {
  console.log(`✅ Bot ${client.user.tag} está online!`);
  console.log(`📊 Conectado em ${client.guilds.cache.size} servidor(es)`);

  // Carregar dados iniciais
  carregarDadosIniciais();
  
  // Limpar locks do Git
  limparLocksGit();
  
  // Iniciar sistemas de limpeza
  setInterval(limparMemoria, CLEANUP_INTERVAL);
  setInterval(monitorarMemoria, MEMORY_CHECK_INTERVAL);
  console.log('🧹 Sistema de limpeza de memória iniciado');

  // Registrar comandos globalmente
  await client.application.commands.set([
    new SlashCommandBuilder()
      .setName("configurar-canais")
      .setDescription("🔧 Configura os canais do sistema de recrutamento")
      .addChannelOption((opt) =>
        opt
          .setName("pedir-tag")
          .setDescription("Canal onde os usuários solicitam tags")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addChannelOption((opt) =>
        opt
          .setName("aprovar-tag")
          .setDescription("Canal para aprovação de tags")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addChannelOption((opt) =>
        opt
          .setName("resultados")
          .setDescription("Canal para resultados do recrutamento")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addChannelOption((opt) =>
        opt
          .setName("placar")
          .setDescription("Canal para o placar de recrutamentos")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName("tipo-placar")
          .setDescription("Tipo do placar de recrutamentos")
          .addChoices(
            { name: "Semanal (reset toda segunda-feira)", value: "semanal" },
            { name: "Mensal (reset todo dia 1º)", value: "mensal" }
          )
          .setRequired(false),
      ),

    new SlashCommandBuilder()
      .setName("criar-canais")
      .setDescription("🏗️ Cria automaticamente os canais do sistema"),

    new SlashCommandBuilder()
      .setName("resetar-placar")
      .setDescription("🔄 Reseta manualmente o placar de recrutamentos"),

    new SlashCommandBuilder()
      .setName("status-sistema")
      .setDescription("📊 Mostra o status atual do sistema"),

    new SlashCommandBuilder()
      .setName("adicionar-cargo")
      .setDescription("🔧 Adiciona formatação para um cargo")
      .addRoleOption((opt) =>
        opt
          .setName("cargo")
          .setDescription("Cargo a configurar")
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("formato")
          .setDescription("Formatação (ex: [CEL | ROTA])")
          .setRequired(true),
      ),

    new SlashCommandBuilder()
      .setName("editar-cargo")
      .setDescription("✏️ Edita a formatação de um cargo existente")
      .addRoleOption((opt) =>
        opt.setName("cargo").setDescription("Cargo a editar").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("formato")
          .setDescription("Nova formatação")
          .setRequired(true),
      ),

    new SlashCommandBuilder()
      .setName("listar-cargos")
      .setDescription("📋 Lista todos os cargos configurados"),

    new SlashCommandBuilder()
      .setName("remover-cargo")
      .setDescription("🗑️ Remove a configuração de um cargo")
      .addRoleOption((opt) =>
        opt
          .setName("cargo")
          .setDescription("Cargo a remover")
          .setRequired(true),
      ),

    new SlashCommandBuilder()
      .setName("listar-servidores")
      .setDescription("🌐 Lista servidores autorizados e pendentes (apenas para admins do bot)"),

    new SlashComman