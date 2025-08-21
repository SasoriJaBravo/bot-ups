// Sistema avançado de gerenciamento de interações para prevenir erro 10062
// Implementa resposta ultra-rápida e processamento em background

const INTERACTION_LIMITS = {
  CRITICAL_RESPONSE_TIME: 1000,  // 1 segundo - tempo crítico para resposta
  SAFE_RESPONSE_TIME: 1500,      // 1.5 segundos - tempo seguro
  MAX_RESPONSE_TIME: 2800,       // 2.8 segundos - limite absoluto
  DEFER_THRESHOLD: 800           // 800ms - quando deferir automaticamente
};

class InteractionManager {
  constructor() {
    this.activeInteractions = new Map();
    this.stats = {
      total: 0,
      successful: 0,
      timeouts: 0,
      deferred: 0,
      emergencyResponses: 0
    };
  }

  // Registra uma interação para monitoramento
  register(interaction) {
    const data = {
      id: interaction.id,
      type: this.getInteractionType(interaction),
      startTime: Date.now(),
      status: 'pending',
      hasResponded: false,
      isDeferred: false
    };
    
    this.activeInteractions.set(interaction.id, data);
    this.stats.total++;
    
    // Auto-cleanup após 5 segundos
    setTimeout(() => {
      this.activeInteractions.delete(interaction.id);
    }, 5000);
    
    return data;
  }

  // Verifica se uma interação ainda é segura para responder
  isSafe(interaction) {
    const data = this.activeInteractions.get(interaction.id);
    if (!data) return false;
    
    const elapsed = Date.now() - data.startTime;
    const isSafe = elapsed < INTERACTION_LIMITS.SAFE_RESPONSE_TIME && 
                   !interaction.replied && 
                   !interaction.deferred;
    
    if (!isSafe) {
      console.log(`⚠️ Interação não é segura: ${elapsed}ms elapsed, replied: ${interaction.replied}, deferred: ${interaction.deferred}`);
    }
    
    return isSafe;
  }

  // Resposta ultra-rápida (menos de 1 segundo)
  async ultraFastResponse(interaction, options = {}) {
    try {
      if (!this.isSafe(interaction)) {
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
        flags: options.ephemeral !== false ? 64 : 0
      });

      if (data) {
        data.status = 'responded';
        this.stats.successful++;
      }

      console.log("⚡ Resposta ultra-rápida enviada");
      return true;

    } catch (error) {
      const data = this.activeInteractions.get(interaction.id);
      if (data) {
        data.status = 'error';
        data.error = error.message;
      }

      if (error.code === 10062) {
        console.error("❌ Erro 10062 na resposta ultra-rápida");
        this.stats.timeouts++;
      } else {
        console.error("❌ Erro na resposta ultra-rápida:", error.message);
      }

      return false;
    }
  }

  // Resposta com defer automático se necessário
  async smartResponse(interaction, options = {}) {
    try {
      if (!this.isSafe(interaction)) {
        console.log("❌ Interação não é segura para resposta inteligente");
        return false;
      }

      const data = this.activeInteractions.get(interaction.id);
      const elapsed = data ? Date.now() - data.startTime : 0;
      const shouldDefer = elapsed > INTERACTION_LIMITS.DEFER_THRESHOLD || options.forceDefer;

      if (shouldDefer) {
        // Deferir primeiro
        await interaction.deferReply({ flags: options.ephemeral !== false ? 64 : 0 });
        
        if (data) {
          data.status = 'deferred';
          data.isDeferred = true;
          data.hasResponded = true;
          this.stats.deferred++;
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
                this.stats.successful++;
              }
              
              console.log("✅ Resposta editada após defer");
            } catch (editError) {
              console.error("❌ Erro ao editar resposta deferida:", editError.message);
            }
          }, 100);
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
        console.error("❌ Erro 10062 na atualização");
        this.stats.timeouts++;
      } else {
        console.error("❌ Erro na atualização segura:", error.message);
      }
      return false;
    }
  }

  // Determina o tipo de interação
  getInteractionType(interaction) {
    if (interaction.isChatInputCommand()) return 'SlashCommand';
    if (interaction.isButton()) return 'Button';
    if (interaction.isStringSelectMenu()) return 'SelectMenu';
    if (interaction.isModalSubmit()) return 'Modal';
    return 'Unknown';
  }

  // Obtém estatísticas
  getStats() {
    const successRate = this.stats.total > 0 
      ? (this.stats.successful / this.stats.total * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      successRate: `${successRate}%`,
      activeInteractions: this.activeInteractions.size
    };
  }
}

// Instância global
const interactionManager = new InteractionManager();

// Wrapper para operações seguras com timeout protection
async function executeWithTimeoutProtection(interaction, operation, options = {}) {
  const data = interactionManager.register(interaction);
  
  try {
    // Resposta inicial ultra-rápida
    const responded = await interactionManager.smartResponse(interaction, {
      content: options.initialMessage || "⏳ Processando...",
      ephemeral: options.ephemeral !== false,
      forceDefer: options.forceDefer || false
    });

    if (!responded) {
      console.log("❌ Falha na resposta inicial");
      return false;
    }

    // Executar operação com timeout
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
      await interactionManager.safeUpdate(interaction, {
        content: options.errorMessage || "❌ Erro ao processar solicitação.",
        ephemeral: true
      });
      
      return false;
    }

    // Atualizar com resultado se fornecido
    if (options.successMessage || options.successEmbeds) {
      await interactionManager.safeUpdate(interaction, {
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
  InteractionManager,
  interactionManager,
  executeWithTimeoutProtection,
  INTERACTION_LIMITS
};