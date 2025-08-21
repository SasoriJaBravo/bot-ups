// Sistema otimizado e simplificado de gerenciamento de interações do Discord
const { interactionManager, executeWithTimeoutProtection } = require('./interaction-manager.js');

// Função de resposta rápida otimizada
async function respostaRapida(interaction, opcoes) {
  try {
    // Sempre tenta resposta ultra-rápida primeiro
    return await interactionManager.ultraFastResponse(interaction, {
      content: opcoes.content,
      embeds: opcoes.embeds,
      components: opcoes.components,
      ephemeral: opcoes.ephemeral
    });
  } catch (error) {
    console.error("❌ Erro na resposta rápida:", error.message);
    
    // Fallback: tenta resposta básica
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: opcoes.content || "❌ Erro interno.",
          flags: opcoes.ephemeral !== false ? 64 : 0
        });
        return true;
      }
    } catch (fallbackError) {
      console.error("❌ Fallback também falhou:", fallbackError.message);
    }
    
    return false;
  }
}

// Função de atualização de resposta
async function atualizarResposta(interaction, opcoes) {
  return await interactionManager.safeUpdate(interaction, {
    content: opcoes.content,
    embeds: opcoes.embeds,
    components: opcoes.components,
    ephemeral: opcoes.ephemeral
  });
}

// Operação segura super simplificada
async function operacaoSegura(interaction, operacaoRapida, operacaoLenta, opcoes = {}) {
  try {
    // Resposta imediata
    const respondeu = await respostaRapida(interaction, {
      content: opcoes.mensagemInicial || "⏳ Processando...",
      ephemeral: opcoes.ephemeral !== false
    });

    if (!respondeu) {
      console.log("❌ Não foi possível responder à interação");
      return false;
    }

    // Executa operação rápida
    let resultado = null;
    if (operacaoRapida) {
      try {
        resultado = await Promise.race([
          operacaoRapida(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 1000)
          )
        ]);
        console.log("✅ Operação rápida concluída");
      } catch (err) {
        console.error("❌ Erro na operação rápida:", err.message);
        
        await atualizarResposta(interaction, {
          content: opcoes.mensagemErro || "❌ Erro ao processar solicitação.",
          ephemeral: true
        });
        
        return false;
      }
    }

    // Atualiza com sucesso se há mensagem
    if (opcoes.mensagemSucesso || opcoes.embedsSucesso) {
      await atualizarResposta(interaction, {
        content: opcoes.mensagemSucesso,
        embeds: opcoes.embedsSucesso,
        components: opcoes.componentsSucesso,
        ephemeral: opcoes.ephemeral !== false
      });
    }

    // Executa operação lenta em background
    if (operacaoLenta) {
      setImmediate(async () => {
        try {
          await operacaoLenta(resultado);
          console.log("✅ Operação lenta concluída em background");
        } catch (err) {
          console.error("❌ Erro na operação lenta:", err.message);
        }
      });
    }

    return resultado;

  } catch (error) {
    console.error("❌ Erro na operação segura:", error.message);
    return false;
  }
}

// Limpa locks do Git
async function limparLocksGit() {
  try {
    const { limparLock } = require('./salvar.js');
    limparLock();
    console.log("🧹 Locks do Git limpos");
  } catch (err) {
    console.error("⚠️ Erro ao limpar locks:", err.message);
  }
}

module.exports = {
  respostaRapida,
  atualizarResposta,
  operacaoSegura,
  limparLocksGit,
  interactionManager
};