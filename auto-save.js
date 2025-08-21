const fs = require('fs');
const { salvarComFila } = require('./commit-queue.js');

// Função para resposta rápida do Discord (não aguarda commit)
async function salvarRapido(nomeArquivo, dados, mensagem) {
  try {
    console.log(`⚡ Salvamento rápido: ${nomeArquivo}...`);
    
    // Usar fila de commits para evitar conflitos
    const sucesso = await salvarComFila(nomeArquivo, dados, mensagem || `Atualização: ${nomeArquivo}`);
    console.log(`${sucesso ? '✅' : '⚠️'} Commit ${sucesso ? 'realizado' : 'falhou'} para ${nomeArquivo}`);
    
    return sucesso;
  } catch (err) {
    console.error(`❌ Erro no salvamento rápido de ${nomeArquivo}:`, err);
    return false;
  }
}

// Função para carregar dados de um arquivo JSON
function carregarDados(nomeArquivo) {
  try {
    if (fs.existsSync(nomeArquivo)) {
      const data = fs.readFileSync(nomeArquivo, 'utf8');
      return JSON.parse(data);
    }
    console.log(`📄 Arquivo ${nomeArquivo} não existe, retornando objeto vazio`);
    return {};
  } catch (err) {
    console.error(`❌ Erro ao carregar ${nomeArquivo}:`, err);
    return {};
  }
}

// Funções específicas para cada arquivo com logs detalhados
const pedidos = {
  carregar: () => {
    console.log('📖 Carregando pedidos.json...');
    return carregarDados('pedidos.json');
  },
  salvar: async (dados, mensagem) => {
    console.log('💾 Salvando pedidos.json...');
    const sucesso = await salvarRapido('pedidos.json', dados, mensagem || 'Atualização de pedidos');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento de pedidos ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  },
  salvarSync: async (dados, mensagem) => {
    console.log('💾 Salvando pedidos.json (síncrono)...');
    const { salvarDadosSync } = require('./salvar.js');
    const sucesso = await salvarDadosSync('pedidos.json', dados, mensagem || 'Atualização de pedidos');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento síncrono de pedidos ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  }
};

const config = {
  carregar: () => {
    console.log('📖 Carregando config.json...');
    return carregarDados('config.json');
  },
  salvar: async (dados, mensagem) => {
    console.log('💾 Salvando config.json...');
    const sucesso = await salvarRapido('config.json', dados, mensagem || 'Atualização de configurações');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento de config ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  },
  salvarSync: async (dados, mensagem) => {
    console.log('💾 Salvando config.json (síncrono)...');
    const { salvarDadosSync } = require('./salvar.js');
    const sucesso = await salvarDadosSync('config.json', dados, mensagem || 'Atualização de configurações');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento síncrono de config ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  }
};

const cargos = {
  carregar: () => {
    console.log('📖 Carregando cargos.json...');
    return carregarDados('cargos.json');
  },
  salvar: async (dados, mensagem) => {
    console.log('💾 Salvando cargos.json...');
    const sucesso = await salvarRapido('cargos.json', dados, mensagem || 'Atualização de cargos');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento de cargos ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  },
  salvarSync: async (dados, mensagem) => {
    console.log('💾 Salvando cargos.json (síncrono)...');
    const { salvarDadosSync } = require('./salvar.js');
    const sucesso = await salvarDadosSync('cargos.json', dados, mensagem || 'Atualização de cargos');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento síncrono de cargos ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  }
};

const servidores = {
  carregar: () => {
    console.log('📖 Carregando servidores.json...');
    return carregarDados('servidores.json');
  },
  salvar: async (dados, mensagem) => {
    console.log('💾 Salvando servidores.json...');
    const sucesso = await salvarRapido('servidores.json', dados, mensagem || 'Atualização de servidores');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento de servidores ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  },
  salvarSync: async (dados, mensagem) => {
    console.log('💾 Salvando servidores.json (síncrono)...');
    const { salvarDadosSync } = require('./salvar.js');
    const sucesso = await salvarDadosSync('servidores.json', dados, mensagem || 'Atualização de servidores');
    console.log(`${sucesso ? '✅' : '❌'} Salvamento síncrono de servidores ${sucesso ? 'concluído' : 'falhou'}`);
    return sucesso;
  }
};

module.exports = {
  pedidos,
  config,
  cargos,
  servidores,
  carregarDados,
  salvarRapido
};
