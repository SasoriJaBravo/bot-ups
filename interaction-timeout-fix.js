// Sistema avançado de correção de timeouts para Discord.js
// Este módulo implementa estratégias específicas para evitar o erro 10062

const INTERACTION_CONSTANTS = {
  MAX_RESPONSE_TIME: 2900,      // 2.9 segundos - margem de segurança
  SAFE_RESPONSE_TIME: 1400,     // 1.4 segundos - tempo seguro
  EMERGENCY_RESPONSE_TIME: 800, // 800ms - resposta de emergência
  DEFER_THRESHOLD: 1000         // 1 segundo - quando deferir
};

class InteractionTimeoutManager {
  constructor() {
    this.activeInteractions = new Map();
    this.timeoutStats = {
      total: 0,
      successful: 0,
      timeouts: 0,
      emergencyResponses: 0
    };
  }

  // Registra uma interação para monitoramento
  registerInteraction(interaction) {
    const startTime = Date.now();
    const interactionData = {
      id: interaction.id,
      type: this.getInteractionType(interaction),
      startTime,
      status: 'active',
      hasResponded: false
    };
    
    this.activeInteractions.set(interaction.id, interactionData);
    this.timeoutStats.total++;
    
    // Auto-cleanup após 5 segundos
    setTimeout(() => {
      this.activeInteractions.delete(interaction.id);
    }, 5000);
    
    return interactionData;
  }

  // Verifica se uma interação ainda é segura para responder
  isSafeToRespond(interaction) {
    const data = this.activeInteractions.get(interaction.id);
    if (!data) return false;
    
    const elapsed = Date.now() - data.startTime;
    const isSafe = elapsed < INTERACTION_CONSTANTS.SAFE_RESPONSE_TIME && 
                   !interaction.replied && 
                   !interaction.deferred;
    
    if (!isSafe) {
      console.log(`⚠️ Interação não é segura: ${elapsed}ms elapsed, replied: ${interaction.replied}, deferred: ${interaction.deferred}`);
    }
    
    return isSafe;
  }

  // Determina se deve deferir a resposta
  shouldDefer(interaction) {
    const data = this.activeInteractions.get(interaction.id);
    if (!data) return false;
    
    const elapsed = Date.now() - data.startTime;
    return elapsed > INTERACTION_CONSTANTS.DEFER_THRESHOLD;
  }

  // Resposta ultra-rápida para casos críticos
  async ultraFastResponse(interaction, options = {}) {
    try {
      if (!this.isSafeToRespond(interaction)) {
        console.log("❌ Interação não é segura para resposta ultra-rápida");
        return false;
      }

      const data = this.activeInteractions.get(interaction.id);
      if (data) {
        data.hasResponded = true;
        data.status = 'responding';
      }

      await interaction.reply({
        content: options.content || "⏳ Processando...",
        embeds: options.embeds || [],
        components: options.components || [],
        flags: options.ephemeral !== false ? 64 : 0 // Default ephemeral para segurança
      });

      if (data) {
        data.status = 'responded';
        this.timeoutStats.successful++;
      }

      console.log("⚡ Resposta ultra-rápida enviada com sucesso");
      return true;

    } catch (error) {
      const data = this.activeInteractions.get(interaction.id);
      if (data) {
        data.status = 'error';
        data.error = error.message;
      }

      if (error.code === 10062) {
        console.error("❌ Erro 10062 na resposta ultra-rápida: Interação expirada");
        this.timeoutStats.timeouts++;
      } else {
        console.error("❌ Erro na resposta ultra-rápida:", error.message);
      }

      return false;
    }
  }

  // Resposta com defer automático se necessário
  async smartResponse(interaction, options = {}) {
    try {
      if (!this.isSafeToRespond(interaction)) {
        console.log("❌ Interação não é segura para resposta inteligente");
        return false;
      }

      const shouldDefer = this.shouldDefer(interaction) || options.forceDefer;
      const data = this.activeInteractions.get(interaction.id);

      if (shouldDefer) {
        // Deferir primeiro
        await interaction.deferReply({ flags: options.ephemeral !== false ? 64 : 0 });
        
        if (data) {
          data.status = 'deferred';
          data.hasResponded = true;
        }

        console.log("⏳ Resposta deferida automaticamente");

        // Depois editar se houver conteúdo
        if (options.content || options.embeds) {
          setTimeout(async () => {
            try {
              await interaction.editReply({
                content: options.content,
                embeds: options.embeds || [],
                components: options.components || []
              });
              
              if (data) {
                data.status = 'completed';
                this.timeoutStats.successful++;
              }
              
              console.log("✅ Resposta editada após defer");
            } catch (editError) {
              console.error("❌ Erro ao editar resposta deferida:", editError.message);
            }
          }, 100); // Pequeno delay para garantir que o defer foi processado
        }

        return true;
      } else {
        // Resposta direta
        return await this.ultraFastResponse(interaction, options);
      }

    } catch (error) {
      console.error("❌ Erro na resposta inteligente:", error.message);
      return false;
    }
  }

  // Atualização segura de resposta
  async safeUpdate(interaction, options = {}) {
    try {
      const data = this.activeInteractions.get(interaction.id);
      if (!data || !data.hasResponded) {
        console.log("⚠️ Tentativa de atualizar interação não respondida");
        return false;
      }

      if (interaction.deferred) {
        await interaction.editReply({
          content: options.content,
          embeds: options.embeds || [],
          components: options.components || []
        });
      } else if (interaction.replied) {
        await interaction.followUp({
          content: options.content,
          embeds: options.embeds || [],
          components: options.components || [],
          flags: options.ephemeral !== false ? 64 : 0
        });
      } else {
        console.log("⚠️ Interação em estado inconsistente para atualização");
        return false;
      }

      console.log("✅ Resposta atualizada com segurança");
      return true;

    } catch (error) {
      if (error.code === 10062) {
        console.error("❌ Erro 10062 na atualização: Interação expirada");
        this.timeoutStats.timeouts++;
      } else {
        console.error("❌ Erro na atualização segura:", error.message);
      }
      return false;
    }
  }

  // Obtém tipo da interação
  getInteractionType(interaction) {
    if (interaction.isChatInputCommand()) return 'SlashCommand';
    if (interaction.isButton()) return 'Button';
    if (interaction.isStringSelectMenu()) return 'SelectMenu';
    if (interaction.isModalSubmit()) return 'Modal';
    return 'Unknown';
  }

  // Obtém estatísticas
  getStats() {
    const successRate = this.timeoutStats.total > 0 
      ? (this.timeoutStats.successful / this.timeoutStats.total * 100).toFixed(2)
      : 0;

    return {
      ...this.timeoutStats,
      successRate: `${successRate}%`,
      activeInteractions: this.activeInteractions.size
    };
  }
}

// Instância global
const timeoutManager = new InteractionTimeoutManager();

// Wrapper para operações seguras
async function executeWithTimeoutProtection(interaction, operation, options = {}) {
  const data = timeoutManager.registerInteraction(interaction);
  
  try {
    // Resposta inicial rápida
    const responded = await timeoutManager.smartResponse(interaction, {
      content: options.initialMessage || "⏳ Processando...",
      ephemeral: options.ephemeral !== false,
      forceDefer: options.forceDefer || false
    });

    if (!responded) {
      console.log("❌ Falha na resposta inicial");
      return false;
    }

    // Executar operação
    let result = null;
    try {
      result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 2000)
        )
      ]);
    } catch (opError) {
      console.error("❌ Erro na operação:", opError.message);
      
      // Tentar atualizar com erro
      await timeoutManager.safeUpdate(interaction, {
        content: options.errorMessage || "❌ Erro ao processar solicitação.",
        ephemeral: true
      });
      
      return false;
    }

    // Atualizar com resultado se fornecido
    if (options.successMessage || options.successEmbeds) {
      await timeoutManager.safeUpdate(interaction, {
        content: options.successMessage,
        embeds: options.successEmbeds,
        components: options.successComponents,
        ephemeral: options.ephemeral !== false
      });
    }

    return result;

  } catch (error) {
    console.error("❌ Erro na execução protegida:", error.message);
    return false;
  }
}

module.exports = {
  InteractionTimeoutManager,
  timeoutManager,
  executeWithTimeoutProtection,
  INTERACTION_CONSTANTS
};
