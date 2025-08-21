// Sistema ultra-simplificado de gerenciamento de interações
// Foco total na funcionalidade e resposta rápida

class InteractionManager {
  constructor() {
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0
    };
  }

  // Resposta ultra-rápida - sem verificações desnecessárias
  async quickReply(interaction, options = {}) {
    try {
      this.stats.total++;
      
      // Verificação mínima
      if (interaction.replied || interaction.deferred) {
        console.log("⚠️ Interação já foi respondida");
        return false;
      }

      // Resposta imediata
      await interaction.reply({
        content: options.content || "⏳ Processando...",
        embeds: options.embeds || [],
        components: options.components || [],
        flags: options.ephemeral !== false ? 64 : 0
      });

      this.stats.successful++;
      console.log("✅ Resposta rápida enviada");
      return true;

    } catch (error) {
      this.stats.failed++;
      console.error("❌ Erro na resposta rápida:", error.message);
      return false;
    }
  }

  // Atualização segura
  async updateReply(interaction, options = {}) {
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
        return await this.quickReply(interaction, options);
      }

      console.log("✅ Resposta atualizada");
      return true;

    } catch (error) {
      console.error("❌ Erro na atualização:", error.message);
      return false;
    }
  }

  // Verifica se é seguro responder (simplificado)
  isSafe(interaction) {
    // Verificação ultra-básica
    return !interaction.replied && !interaction.deferred;
  }

  // Estatísticas
  getStats() {
    const successRate = this.stats.total > 0 
      ? (this.stats.successful / this.stats.total * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      successRate: `${successRate}%`
    };
  }
}

// Instância global
const interactionManager = new InteractionManager();

module.exports = {
  InteractionManager,
  interactionManager
};