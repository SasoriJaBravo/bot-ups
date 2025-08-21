// Sistema otimizado de gerenciamento de interações do Discord
const { interactionManager, executeWithTimeoutProtection } = require('./interaction-manager.js');

// Função de resposta rápida (compatibilidade com código existente)
async function respostaRapida(interaction, opcoes) {
  return await interactionManager.smartResponse(interaction, {
    content: opcoes.content,
    embeds: opcoes.embeds,
    components: opcoes.components,
    ephemeral: opcoes.ephemeral,
    forceDefer: opcoes.defer
  });
}

// Função de atualização de resposta (compatibilidade com código existente)
async function atualizarResposta(interaction, opcoes) {
  return await interactionManager.safeUpdate(interaction, {
    content: opcoes.content,
    embeds: opcoes.embeds,
    components: opcoes.components,
    ephemeral: opcoes.ephemeral
  });
}

// Operação segura otimizada
async function operacaoSegura(interaction, operacaoRapida, operacaoLenta, opcoes = {}) {
  return await executeWithTimeoutProtection(
    interaction,
    async () => {
      // Executa operação rápida
      let resultado = null;
      if (operacaoRapida) {
        resultado = await operacaoRapida();
        console.log("✅ Operação rápida concluída");
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
    },
    {
      initialMessage: opcoes.mensagemInicial || "⏳ Processando...",
      successMessage: opcoes.mensagemSucesso,
      successEmbeds: opcoes.embedsSucesso,
      successComponents: opcoes.componentsSucesso,
      errorMessage: opcoes.mensagemErro || "❌ Erro interno. Tente novamente.",
      ephemeral: opcoes.ephemeral !== false,
      forceDefer: opcoes.defer || false
    }
  );
}

// 🧹 Limpa locks do Git antes de operações críticas
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
