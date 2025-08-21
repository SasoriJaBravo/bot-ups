// Sistema simplificado e otimizado de gerenciamento de interações
// Foco na funcionalidade e resposta rápida

const INTERACTION_LIMITS = {
  SAFE_RESPONSE_TIME: 2500,      // 2.5 segundos - tempo seguro
  DEFER_THRESHOLD: 1500,         // 1.5 segundos - quando deferir
  MAX_RESPONSE_TIME: 2900        // 2.9 segundos - limite absoluto
};

class InteractionManager {
  constructor() {
    this.activeInteractions = new Map();
    this.stats = {
      total: 0,
      successful: 0,
      timeouts: 0,
      deferred: 0
    };
  }

  // Resposta ultra-rápida - prioridade máxima
  async ultraFastResponse(interaction, options = {}) {
    try {
      // Verificação mínima - apenas o essencial
      if (interaction.replied || interaction.deferred) {
        console.log("⚠️ Interação já foi respondida");
        return false;
      }

      // Resposta imediata sem verificações complexas
      await interaction.reply({
        content: options.content || "⏳ Processando...",
        embeds: options.embeds || [],
        components: options.components || [],
        flags: options.ephemeral !== false ? 64 : 0
      });

      this.stats.successful++;
      console.log("⚡ Resposta ultra-rápida enviada com sucesso");
      return true;

    } catch (error) {
      if (error.code === 10062) {
        console.error("❌ Erro 10062: Interação expirada");
        this.stats.timeouts++;
      } else {
        console.error("❌ Erro na resposta ultra-rápida:", error.message);
      }
      return false;
    }
  }

  // Resposta inteligente simplificada
  async smartResponse(interaction, options = {}) {
    try {
      // Verificação básica
      if (interaction.replied || interaction.deferred) {
        console.log("⚠️ Interação já foi respondida ou deferida");
        return false;
      }

      const startTime = Date.now();
      const elapsed = startTime - interaction.createdTimestamp;
      
      // Se passou muito tempo, tenta resposta direta mesmo assim
      if (elapsed > INTERACTION_LIMITS.SAFE_RESPONSE_TIME) {
        console.log(`⚠️ Tempo elevado (${elapsed}ms), tentando resposta direta mesmo assim`);
      }

      // Sempre tenta resposta direta primeiro
      try {
        await interaction.reply({
          content: options.content || "⏳ Processando...",
          embeds: options.embeds || [],
          components: options.components || [],
          flags: options.ephemeral !== false ? 64 : 0
        });

        this.stats.successful++;
        console.log(`✅ Resposta direta enviada (${elapsed}ms)`);
        return true;

      } catch (replyError) {
        // Se falhou, tenta defer como fallback
        if (replyError.code === 10062) {
          console.log("❌ Resposta direta falhou (10062), interação expirada");
          this.stats.timeouts++;
          return false;
        }

        console.log("⚠️ Resposta direta falhou, tentando defer...");
        
        try {
          await interaction.deferReply({ 
            flags: options.ephemeral !== false ? 64 : 0 
          });
          
          this.stats.deferred++;
          console.log("⏳ Resposta deferida com sucesso");

          // Edita depois se há conteúdo
          if (options.content || options.embeds) {
            setTimeout(async () => {
              try {
                await interaction.editReply({
                  content: options.content,
                  embeds: options.embeds || [],
                  components: options.components || []
                });
                console.log("✅ Resposta editada após defer");
              } catch (editError) {
                console.error("❌ Erro ao editar resposta deferida:", editError.message);
              }
            }, 100);
          }

          return true;

        } catch (deferError) {
          console.error("❌ Defer também falhou:", deferError.message);
          this.stats.timeouts++;
          return false;
        }
      }

    } catch (error) {
      console.error("❌ Erro na resposta inteligente:", error.message);
      this.stats.timeouts++;
      return false;
    }
  }

  // Atualização segura
  async safeUpdate(interaction, options = {}) {
    try {
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
        console.log("⚠️ Interação não está em estado válido para atualização");
        return false;
      }

      console.log("✅ Resposta atualizada com sucesso");
      return true;

    } catch (error) {
      console.error("❌ Erro na atualização:", error.message);
      return false;
    }
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

// Wrapper simplificado para operações com timeout protection
async function executeWithTimeoutProtection(interaction, operation, options = {}) {
  try {
    // Resposta inicial ultra-rápida
    const responded = await interactionManager.smartResponse(interaction, {
      content: options.initialMessage || "⏳ Processando...",
      ephemeral: options.ephemeral !== false
    });

    if (!responded) {
      console.log("❌ Falha na resposta inicial - tentando resposta de emergência");
      
      // Tentativa de emergência
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "⏳ Processando sua solicitação...",
            flags: 64
          });
          console.log("🚨 Resposta de emergência enviada");
        }
      } catch (emergencyError) {
        console.error("❌ Resposta de emergência também falhou:", emergencyError.message);
        return false;
      }
    }

    // Executar operação com timeout reduzido
    let result = null;
    try {
      result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 1500)
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