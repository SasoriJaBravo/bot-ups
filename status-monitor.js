// Monitor de status do sistema para debug e monitoramento
const { commitQueue } = require('./commit-queue.js');

function obterStatusSistema() {
  const fs = require('fs');
  
  // Status dos arquivos
  const arquivos = ['pedidos.json', 'config.json', 'cargos.json', 'servidores.json', 'placar.json'];
  const statusArquivos = {};
  
  arquivos.forEach(arquivo => {
    try {
      const stats = fs.statSync(arquivo);
      statusArquivos[arquivo] = {
        existe: true,
        tamanho: stats.size,
        modificado: stats.mtime.toISOString()
      };
    } catch {
      statusArquivos[arquivo] = { existe: false };
    }
  });
  
  // Status da fila de commits
  const statusCommits = commitQueue.getStatus();
  
  // Status de memória
  const memoria = process.memoryUsage();
  const statusMemoria = {
    rss: Math.round(memoria.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memoria.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memoria.heapTotal / 1024 / 1024) + 'MB'
  };
  
  return {
    timestamp: new Date().toISOString(),
    arquivos: statusArquivos,
    commits: statusCommits,
    memoria: statusMemoria,
    uptime: Math.round(process.uptime()) + 's'
  };
}

function logStatusSistema() {
  const status = obterStatusSistema();
  console.log('📊 Status do Sistema:', JSON.stringify(status, null, 2));
}

// Log de status a cada 30 minutos
setInterval(logStatusSistema, 30 * 60 * 1000);

module.exports = {
  obterStatusSistema,
  logStatusSistema
};