// Sistema avançado de prevenção de timeouts do Discord
// Este módulo implementa estratégias para evitar o erro 10062 (Unknown interaction)

const INTERACTION_LIMITS = {
  INITIAL_RESPONSE: 3000,    // 3 segundos para resposta inicial
  FOLLOWUP_RESPONSE: 900000, // 15 minutos para follow-ups
  EDIT_RESPONSE: 900000,     // 15 minutos para edições
  SAFE_MARGIN: 500          // Margem de segurança (500ms)
};

class InteractionManager {
  constructor() {
    this.activeInteractions = new Map();
    this.interactionStats = {
      processed: 0,
      expired: 0,
      errors: 0,
      successful: 0
    };
  }

  // Registra uma nova interação
  registerInteraction(interaction) {
    const id = interaction.id;
    const data = {
      id,
      type: interaction.type,
      createdAt: interaction.createdTimestamp,
      userId: interaction.user?.id,
      guildId: interaction.guildId,
      commandName: interaction.commandName || interaction.customId,
      status: 'pending'
    };
    
    this.activeInteractions.set(id, data);
    console.log(`📝 Interação registrada: ${data.commandName} (${id})`);
    
    // Auto-limpeza após expiração
    setTimeout(() => {
      if (this.activeInteractions.has(id)) {
        const interaction = this.activeInteractions.get(id);
        if (interaction.status === 'pending') {
          interaction.status = 'expired';
          this.interactionStats.expired++;
          console.log(`⏰ Interação expirada: ${interaction.commandName} (${id})`);
        }
        this.activeInteractions.delete(id);
      }
    }, INTERACTION_LIMITS.INITIAL_RESPONSE + 1000);
    
    return data;
  }

  // Verifica se uma interação ainda é válida
  isInteractionValid(interaction) {
    const id = interaction.id;
    const data = this.activeInteractions.get(id);
    
    if (!data) {
      console.log(`⚠️ Interação não registrada: ${id}`);
      return false;
    }
    
    const timeElapsed = Date.now() - data.createdAt;
    const timeLimit = INTERACTION_LIMITS.INITIAL_RESPONSE - INTERACTION_LIMITS.SAFE_MARGIN;
    
    if (timeElapsed > timeLimit) {
      console.log(`⏰ Interação expirada: ${timeElapsed}ms > ${timeLimit}ms (${data.commandName})`);
      data.status = 'expired';
      this.interactionStats.expired++;
      return false;
    }
    
    return true;
  }

  // Marca uma interação como processada com sucesso
  markInteractionSuccess(interaction) {
    const id = interaction.id;
    const data = this.activeInteractions.get(id);
    
    if (data) {
      data.status = 'success';
      data.processedAt = Date.now();
      data.processingTime = data.processedAt - data.createdAt;
      this.interactionStats.successful++;
      
      console.log(`✅ Interação processada: ${data.commandName} (${data.processingTime}ms)`);
    }
  }

  // Marca uma interação como erro
  markInteractionError(interaction, error) {
    const id = interaction.id;
    const data = this.activeInteractions.get(id);
    
    if (data) {
      data.status = 'error';
      data.error = error.message;
      data.errorCode = error.code;
      this.interactionStats.errors++;
      
      console.log(`❌ Erro na interação: ${data.commandName} - ${error.message}`);
    }
  }

  // Obtém estatísticas do sistema
  getStats() {
    return {
      ...this.interactionStats,
      activeInteractions: this.activeInteractions.size,
      successRate: this.interactionStats.processed > 0 
        ? (this.interactionStats.successful / this.interactionStats.processed * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  // Limpa interações antigas
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, data] of this.activeInteractions.entries()) {
      if (now - data.createdAt > INTERACTION_LIMITS.INITIAL_RESPONSE + 5000) {
        this.activeInteractions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Limpeza: ${cleaned} interações antigas removidas`);
    }
  }
}

// Instância global do gerenciador
const interactionManager = new InteractionManager();

// Limpeza automática a cada 5 minutos
setInterval(() => {
  interactionManager.cleanup();
}, 5 * 60 * 1000);

// Wrapper para processar interações com segurança
async function processInteractionSafely(interaction, handler) {
  // Registrar interação
  const data = interactionManager.registerInteraction(interaction);
  
  try {
    // Verificar se ainda é válida
    if (!interactionManager.isInteractionValid(interaction)) {
      return false;
    }
    
    // Processar
    const result = await handler(interaction);
    
    // Marcar como sucesso
    interactionManager.markInteractionSuccess(interaction);
    interactionManager.interactionStats.processed++;
    
    return result;
    
  } catch (error) {
    // Marcar como erro
    interactionManager.markInteractionError(interaction, error);
    interactionManager.interactionStats.processed++;
    
    // Re-throw para tratamento upstream
    throw error;
  }
}

// Função para resposta ultra-rápida (para casos críticos)
async function ultraFastResponse(interaction, content) {
  try {
    // Verificação mínima
    if (interaction.replied || interaction.deferred) {
      return false;
    }
    
    // Resposta imediata
    await interaction.reply({
      content: content || "⏳ Processando...",
      flags: 64 // MessageFlags.Ephemeral
    });
    
    console.log("⚡ Resposta ultra-rápida enviada");
    return true;
    
  } catch (error) {
    if (error.code === 10062) {
      console.error("❌ Ultra-fast response falhou: Interação expirada");
    } else {
      console.error("❌ Erro na resposta ultra-rápida:", error.message);
    }
    return false;
  }
}

module.exports = {
  InteractionManager,
  interactionManager,
  processInteractionSafely,
  ultraFastResponse,
  INTERACTION_LIMITS
};
