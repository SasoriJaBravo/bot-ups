const { EmbedBuilder, ChannelType } = require('discord.js');
const { salvarRapido } = require('./auto-save.js');

// Configurações do placar
const PLACAR_CONFIG = {
  SEMANAL: 'semanal',
  MENSAL: 'mensal'
};

// Carrega dados do placar
function carregarPlacar() {
  try {
    const fs = require('fs');
    if (fs.existsSync('placar.json')) {
      const data = fs.readFileSync('placar.json', 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    console.error('❌ Erro ao carregar placar:', err);
    return {};
  }
}

// Salva dados do placar com commit automático
async function salvarPlacar(dados, mensagem) {
  try {
    console.log('💾 Salvando placar.json...');
    return await salvarRapido('placar.json', dados, mensagem || 'Atualização do placar de recrutamentos');
  } catch (err) {
    console.error('❌ Erro ao salvar placar:', err);
    return false;
  }
}

// Inicializa dados do servidor no placar
function inicializarServidorPlacar(guildId) {
  const placarData = carregarPlacar();
  
  if (!placarData[guildId]) {
    placarData[guildId] = {
      configuracao: PLACAR_CONFIG.SEMANAL,
      canalId: null,
      mensagemId: null,
      recrutamentos: {},
      ultimoReset: Date.now(),
      proximoReset: calcularProximoReset(PLACAR_CONFIG.SEMANAL)
    };
    salvarPlacar(placarData, `Inicialização do placar para servidor ${guildId}`);
  }
  
  return placarData[guildId];
}

// Calcula próximo reset baseado na configuração
function calcularProximoReset(tipo) {
  const agora = new Date();
  
  if (tipo === PLACAR_CONFIG.SEMANAL) {
    const proximaSegunda = new Date(agora);
    proximaSegunda.setDate(agora.getDate() + (1 + 7 - agora.getDay()) % 7);
    proximaSegunda.setHours(0, 0, 0, 0);
    return proximaSegunda.getTime();
  } else {
    const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    proximoMes.setHours(0, 0, 0, 0);
    return proximoMes.getTime();
  }
}

// Configura o tipo de placar (semanal/mensal)
async function configurarTipoPlacar(guildId, tipo) {
  const placarData = carregarPlacar();
  const serverPlacar = placarData[guildId] || inicializarServidorPlacar(guildId);
  
  if (!Object.values(PLACAR_CONFIG).includes(tipo)) {
    return { sucesso: false, erro: 'Tipo inválido. Use "semanal" ou "mensal".' };
  }
  
  serverPlacar.configuracao = tipo;
  serverPlacar.proximoReset = calcularProximoReset(tipo);
  
  placarData[guildId] = serverPlacar;
  await salvarPlacar(placarData, `Configuração do placar alterada para ${tipo} no servidor ${guildId}`);
  
  return { sucesso: true, tipo };
}

// Obtém canal do placar respeitando configurações do servidor
async function obterCanalPlacar(guild) {
  const { config } = require('./auto-save.js');
  const configData = config.carregar();
  const serverConfig = configData[guild.id] || {};
  
  // Primeiro verifica se há um canal configurado pelo servidor
  if (serverConfig.placarId) {
    const canalConfigurado = guild.channels.cache.get(serverConfig.placarId);
    if (canalConfigurado) {
      console.log(`📊 Usando canal do placar configurado: ${canalConfigurado.name}`);
      return canalConfigurado;
    } else {
      console.log(`⚠️ Canal do placar configurado não encontrado (${serverConfig.placarId}), removendo da configuração`);
      delete serverConfig.placarId;
      await config.salvar(configData, `Canal do placar removido da configuração (não encontrado)`);
    }
  }
  
  // Se não há canal configurado, retorna null (não cria automaticamente)
  console.log(`⚠️ Nenhum canal do placar configurado para o servidor ${guild.name}`);
  console.log(`💡 Use /configurar-canais ou /criar-canais para configurar o placar`);
  return null;
}

// Adiciona recrutamento ao placar
async function adicionarRecrutamento(guildId, recrutadorId, recrutadoNome) {
  try {
    const placarData = carregarPlacar();
    const serverPlacar = placarData[guildId] || inicializarServidorPlacar(guildId);
    
    // Verifica se precisa resetar
    if (Date.now() >= serverPlacar.proximoReset) {
      await resetarPlacar(guildId);
      return adicionarRecrutamento(guildId, recrutadorId, recrutadoNome);
    }
    
    // Inicializa contador do recrutador se não existir
    if (!serverPlacar.recrutamentos[recrutadorId]) {
      serverPlacar.recrutamentos[recrutadorId] = {
        count: 0,
        ultimoRecrutamento: null
      };
    }
    
    // Incrementa contador
    serverPlacar.recrutamentos[recrutadorId].count++;
    serverPlacar.recrutamentos[recrutadorId].ultimoRecrutamento = {
      nome: recrutadoNome,
      timestamp: Date.now()
    };
    
    placarData[guildId] = serverPlacar;
    const sucesso = await salvarPlacar(placarData, `Recrutamento adicionado: ${recrutadoNome} por ${recrutadorId}`);
    
    if (sucesso) {
      console.log(`🏆 Recrutamento registrado no placar: ${recrutadoNome} (total: ${serverPlacar.recrutamentos[recrutadorId].count})`);
    } else {
      console.error(`❌ Falha ao salvar recrutamento no placar`);
    }
    
    return serverPlacar.recrutamentos[recrutadorId].count;
  } catch (err) {
    console.error('❌ Erro ao adicionar recrutamento:', err);
    return 0;
  }
}

// Reseta o placar
async function resetarPlacar(guildId) {
  const placarData = carregarPlacar();
  const serverPlacar = placarData[guildId] || inicializarServidorPlacar(guildId);
  
  console.log(`🔄 Resetando placar do servidor ${guildId} (${serverPlacar.configuracao})`);
  
  serverPlacar.recrutamentos = {};
  serverPlacar.ultimoReset = Date.now();
  serverPlacar.proximoReset = calcularProximoReset(serverPlacar.configuracao);
  
  placarData[guildId] = serverPlacar;
  await salvarPlacar(placarData, `Placar resetado (${serverPlacar.configuracao})`);
  
  return true;
}

// Gera embed do ranking com design melhorado
async function gerarEmbedRanking(guild) {
  const placarData = carregarPlacar();
  const serverPlacar = placarData[guild.id] || inicializarServidorPlacar(guild.id);
  
  const ranking = Object.entries(serverPlacar.recrutamentos)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10);
  
  const tipoTexto = serverPlacar.configuracao === PLACAR_CONFIG.SEMANAL ? 'Semanal' : 'Mensal';
  const proximoReset = new Date(serverPlacar.proximoReset);
  
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🏆 Placar de Recrutamentos — ${tipoTexto}`)
    .setThumbnail(guild.iconURL() || null)
    .setFooter({ 
      text: `📌 Atualizado automaticamente • Próximo reset: ${proximoReset.toLocaleDateString('pt-BR')}`,
      iconURL: guild.iconURL() || undefined
    })
    .setTimestamp();
  
  if (ranking.length === 0) {
    embed.setDescription('🎯 **Nenhum recrutamento registrado ainda**\n\n🌟 Seja o primeiro a recrutar alguém e apareça no topo do ranking!\n\n📈 *O placar é atualizado automaticamente a cada aprovação*');
    return embed;
  }
  
  let descricao = '🎖️ **Ranking dos Melhores Recrutadores**\n\n';
  const emojis = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < ranking.length; i++) {
    const [userId, dados] = ranking[i];
    const membro = await guild.members.fetch(userId).catch(() => null);
    const nomeUsuario = membro ? membro.displayName : `Usuário ${userId}`;
    
    const emoji = i < 3 ? emojis[i] : '🏅';
    const posicao = i + 1;
    const recrutamentos = dados.count;
    const plural = recrutamentos === 1 ? 'recrutamento' : 'recrutamentos';
    
    descricao += `${emoji} **${posicao}º** ${membro ? `<@${userId}>` : nomeUsuario} • **${recrutamentos}** ${plural}\n`;
  }
  
  embed.setDescription(descricao);
  
  // Adiciona informação sobre o último recrutamento do líder
  if (ranking.length > 0) {
    const [liderUserId, liderDados] = ranking[0];
    if (liderDados.ultimoRecrutamento) {
      const ultimoRecrutamento = liderDados.ultimoRecrutamento;
      const timestamp = Math.floor(ultimoRecrutamento.timestamp / 1000);
      
      embed.addFields({
        name: '🎯 Último Recrutamento do Líder',
        value: `**${ultimoRecrutamento.nome}** • <t:${timestamp}:R>`,
        inline: false
      });
    }
  }
  
  return embed;
}

// Atualiza mensagem do placar respeitando configurações
async function atualizarMensagemPlacar(guild) {
  try {
    const canal = await obterCanalPlacar(guild);
    if (!canal) {
      console.log(`⚠️ Canal do placar não configurado para ${guild.name} - pulando atualização`);
      return false;
    }
    
    const placarData = carregarPlacar();
    const serverPlacar = placarData[guild.id] || inicializarServidorPlacar(guild.id);
    
    const embed = await gerarEmbedRanking(guild);
    
    // Tenta editar mensagem existente
    if (serverPlacar.mensagemId) {
      try {
        const mensagem = await canal.messages.fetch(serverPlacar.mensagemId);
        await mensagem.edit({ embeds: [embed] });
        console.log(`📊 Placar atualizado no servidor ${guild.name}`);
        return true;
      } catch (error) {
        console.log('⚠️ Mensagem do placar não encontrada, criando nova...');
        serverPlacar.mensagemId = null;
      }
    }
    
    // Cria nova mensagem
    try {
      const mensagens = await canal.messages.fetch({ limit: 10 });
      const mensagensBot = mensagens.filter(m => m.author.id === canal.client.user.id);
      if (mensagensBot.size > 0) {
        await canal.bulkDelete(mensagensBot).catch(() => {
          mensagensBot.forEach(msg => msg.delete().catch(() => {}));
        });
      }
      
      const novaMensagem = await canal.send({ embeds: [embed] });
      serverPlacar.mensagemId = novaMensagem.id;
      
      placarData[guild.id] = serverPlacar;
      await salvarPlacar(placarData, `Nova mensagem do placar criada: ${novaMensagem.id}`);
      
      console.log(`📊 Nova mensagem do placar criada no servidor ${guild.name}`);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao criar mensagem do placar:', error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar placar:', error);
    return false;
  }
}

// Verifica e executa resets automáticos
async function verificarResets(client) {
  const placarData = carregarPlacar();
  const agora = Date.now();
  
  for (const [guildId, serverPlacar] of Object.entries(placarData)) {
    if (agora >= serverPlacar.proximoReset) {
      console.log(`🔄 Reset automático do placar para servidor ${guildId}`);
      
      await resetarPlacar(guildId);
      
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        await atualizarMensagemPlacar(guild);
      }
    }
  }
}

// Inicia verificação periódica de resets
function iniciarVerificacaoResets(client) {
  setInterval(() => {
    verificarResets(client);
    
    for (const guild of client.guilds.cache.values()) {
      atualizarMensagemPlacar(guild).catch(err => {
        console.error(`❌ Erro ao atualizar placar do servidor ${guild.name}:`, err.message);
      });
    }
  }, 10 * 60 * 1000);
  
  setTimeout(() => {
    verificarResets(client);
  }, 5000);
  
  console.log('⏰ Sistema de reset automático do placar iniciado (verificação a cada 10 minutos)');
}

module.exports = {
  PLACAR_CONFIG,
  inicializarServidorPlacar,
  configurarTipoPlacar,
  obterCanalPlacar,
  adicionarRecrutamento,
  resetarPlacar,
  gerarEmbedRanking,
  atualizarMensagemPlacar,
  verificarResets,
  iniciarVerificacaoResets,
  carregarPlacar,
  salvarPlacar
};