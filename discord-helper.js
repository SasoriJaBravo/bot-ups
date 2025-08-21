// Sistema ultra-simplificado de helpers do Discord
const { interactionManager } = require('./interaction-manager.js');

// Resposta rápida otimizada
async function respostaRapida(interaction, opcoes) {
  try {
    return await interactionManager.quickReply(interaction, {
      content: opcoes.content,
      embeds: opcoes.embeds,
      components: opcoes.components,
      ephemeral: opcoes.ephemeral
    });
  } catch (error) {
    console.error("❌ Erro na resposta rápida:", error.message);
    return false;
  }
}

// Atualização de resposta
async function atualizarResposta(interaction, opcoes) {
  try {
    return await interactionManager.updateReply(interaction, {
      content: opcoes.content,
      embeds: opcoes.embeds,
      components: opcoes.components,
      ephemeral: opcoes.ephemeral
    });
  } catch (error) {
    console.error("❌ Erro na atualização:", error.message);
    return false;
  }
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
        resultado = await operacaoRapida();
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