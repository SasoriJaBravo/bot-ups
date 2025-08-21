// Sistema de fila para commits para evitar conflitos
const { salvarNoGitHub } = require('./salvar.js');

class CommitQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  // Adiciona commit à fila
  async adicionarCommit(arquivo, dados, mensagem) {
    return new Promise((resolve) => {
      this.queue.push({
        arquivo,
        dados,
        mensagem,
        resolve,
        timestamp: Date.now()
      });
      
      console.log(`📋 Commit adicionado à fila: ${arquivo} (${this.queue.length} na fila)`);
      this.processarFila();
    });
  }

  // Processa a fila de commits
  async processarFila() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    console.log(`🔄 Processando fila de commits (${this.queue.length} itens)`);
    
    try {
      // Agrupa commits por proximidade temporal (últimos 2 segundos)
      const agora = Date.now();
      const grupo = [];
      const arquivosModificados = new Set();
      
      while (this.queue.length > 0) {
        const item = this.queue[0];
        
        // Se o item é muito antigo (>5 segundos) ou já temos arquivos suficientes, processa
        if (agora - item.timestamp > 5000 || grupo.length >= 5) break;
        
        // Remove da fila e adiciona ao grupo
        const commitItem = this.queue.shift();
        
        // Salva o arquivo localmente
        const fs = require('fs');
        fs.writeFileSync(commitItem.arquivo, JSON.stringify(commitItem.dados, null, 2));
        
        arquivosModificados.add(commitItem.arquivo);
        grupo.push(commitItem);
        
        console.log(`📁 Arquivo salvo localmente: ${commitItem.arquivo}`);
      }
      
      if (grupo.length > 0) {
        // Faz um commit único para todos os arquivos do grupo
        const mensagens = grupo.map(item => item.mensagem);
        const mensagemFinal = mensagens.length === 1 
          ? mensagens[0]
          : `Atualização em lote: ${Array.from(arquivosModificados).join(', ')}`;
        
        console.log(`💾 Fazendo commit em lote para ${arquivosModificados.size} arquivo(s)`);
        const sucesso = await salvarNoGitHub(mensagemFinal);
        
        // Resolve todas as promises do grupo
        grupo.forEach(item => {
          item.resolve(sucesso);
        });
        
        console.log(`${sucesso ? '✅' : '❌'} Commit em lote ${sucesso ? 'realizado' : 'falhou'}`);
      }
      
    } catch (err) {
      console.error('❌ Erro ao processar fila de commits:', err);
      
      // Resolve todas as promises com false em caso de erro
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        item.resolve(false);
      }
    } finally {
      this.processing = false;
      
      // Se ainda há itens na fila, processa novamente após um delay
      if (this.queue.length > 0) {
        setTimeout(() => this.processarFila(), 1000);
      }
    }
  }

  // Obtém status da fila
  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      oldestItem: this.queue.length > 0 ? Date.now() - this.queue[0].timestamp : 0
    };
  }
}

// Instância global da fila
const commitQueue = new CommitQueue();

// Função para salvar com fila
async function salvarComFila(arquivo, dados, mensagem) {
  return await commitQueue.adicionarCommit(arquivo, dados, mensagem);
}

module.exports = {
  CommitQueue,
  commitQueue,
  salvarComFila
};