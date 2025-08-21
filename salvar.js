const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

// Configuração do GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_URL = process.env.REPO_URL || 'SasoriAutoPecas/bot-rota.git';
const arquivosParaCommit = ['pedidos.json', 'config.json', 'cargos.json', 'servidores.json'];

let gitInicializado = false;
let commitEmAndamento = false;

// 🧹 Remove arquivo de lock de forma mais robusta
function limparLock() {
  try {
    const lockPaths = [
      path.join(__dirname, '.git', 'index.lock'),
      path.join(__dirname, '.git', 'refs', 'heads', 'main.lock'),
      path.join(__dirname, '.git', 'HEAD.lock'),
      path.join(__dirname, '.git', 'config.lock')
    ];
    
    lockPaths.forEach(lockPath => {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
        console.log(`🧹 Lock removido: ${lockPath}`);
      }
    });
  } catch (err) {
    console.log("⚠️ Não foi possível remover alguns locks:", err.message);
  }
}

// 🔄 Aguarda até que não haja processos Git em execução
async function aguardarGitLivre() {
  const maxTentativas = 15;
  let tentativas = 0;
  
  while (tentativas < maxTentativas) {
    if (!commitEmAndamento) return true;
    console.log(`⏳ Aguardando Git ficar livre... (${tentativas + 1}/${maxTentativas})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    tentativas++;
  }
  
  console.log("⚠️ Timeout aguardando Git ficar livre - forçando liberação");
  commitEmAndamento = false;
  return true;
}

async function inicializarGit() {
  if (gitInicializado) return;

  if (!GITHUB_TOKEN) {
    throw new Error("❌ GITHUB_TOKEN não configurado nas variáveis de ambiente");
  }

  try {
    console.log("🔧 Inicializando repositório Git...");
    limparLock();
    
    const git = simpleGit({
      baseDir: '.',
      binary: 'git',
      maxConcurrentProcesses: 1,
      trimmed: false,
      timeout: {
        block: 30000
      }
    });

    // Verifica se já é um repositório Git
    let isRepo = false;
    try {
      await git.status();
      isRepo = true;
      console.log("📁 Repositório Git já existe");
    } catch {
      console.log("📁 Inicializando novo repositório Git");
      await git.init();
      isRepo = true;
    }

    if (isRepo) {
      // Configura usuário Git
      await git.addConfig('user.name', 'SasoriAutoPecas', false, 'local');
      await git.addConfig('user.email', 'elenacrae@gmail.com', false, 'local');
      console.log("👤 Usuário Git configurado");

      // Configura remote origin com token
      const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${REPO_URL}`;
      
      try {
        const remotes = await git.getRemotes(true);
        const originExists = remotes.find(r => r.name === 'origin');
        
        if (originExists) {
          // Remove e recria o remote para garantir que está com o token correto
          await git.removeRemote('origin');
          console.log("🔗 Remote origin removido");
        }
        
        await git.addRemote('origin', remoteUrl);
        console.log("🔗 Remote origin configurado com token");
        
        // Tenta fazer fetch para verificar conectividade
        try {
          await git.fetch('origin', 'main');
          console.log("📥 Fetch realizado com sucesso");
          
          // Verifica se a branch main existe localmente
          const branches = await git.branchLocal();
          if (!branches.all.includes('main')) {
            await git.checkoutBranch('main', 'origin/main');
            console.log("🌿 Branch main criada e configurada");
          } else {
            await git.checkout('main');
            console.log("🌿 Switched to branch main");
          }
        } catch (fetchErr) {
          console.log("⚠️ Fetch falhou, criando branch main local:", fetchErr.message);
          await git.checkoutLocalBranch('main');
        }
        
      } catch (remoteErr) {
        console.error("❌ Erro ao configurar remote:", remoteErr.message);
        throw remoteErr;
      }

      gitInicializado = true;
      console.log("✅ Git inicializado com sucesso");
    }

  } catch (err) {
    console.error("❌ Erro ao inicializar Git:", err.message);
    console.error("🔍 Stack trace:", err.stack);
    throw err;
  }
}

async function salvarNoGitHub(mensagem) {
  if (commitEmAndamento) {
    console.log("⏳ Commit já em andamento, aguardando...");
    const livre = await aguardarGitLivre();
    if (!livre) {
      console.log("❌ Timeout aguardando Git ficar livre");
      return false;
    }
  }
  
  commitEmAndamento = true;
  console.log(`🚀 Iniciando processo de commit: "${mensagem}"`);

  try {
    limparLock();
    await inicializarGit();
    
    const git = simpleGit({
      baseDir: '.',
      binary: 'git',
      maxConcurrentProcesses: 1,
      trimmed: false,
      timeout: {
        block: 30000
      }
    });

    // Verifica quais arquivos existem
    const arquivosExistentes = arquivosParaCommit.filter(arquivo => {
      const existe = fs.existsSync(arquivo);
      console.log(`📄 ${arquivo}: ${existe ? '✅ existe' : '❌ não existe'}`);
      return existe;
    });
    
    if (arquivosExistentes.length === 0) {
      console.log("⚠️ Nenhum arquivo para commit encontrado");
      return false;
    }

    // Adiciona arquivos ao staging
    console.log("📦 Adicionando arquivos ao staging...");
    await git.add(arquivosExistentes);
    
    // Verifica status antes do commit
    const status = await git.status();
    console.log(`📊 Status do Git:`, {
      staged: status.staged.length,
      modified: status.modified.length,
      created: status.created.length,
      deleted: status.deleted.length
    });
    
    if (status.staged.length === 0 && status.modified.length === 0 && status.created.length === 0) {
      console.log("📝 Nenhuma alteração para commitar");
      return false;
    }

    // Realiza o commit
    console.log("💾 Realizando commit...");
    const commitResult = await git.commit(mensagem);
    console.log("✅ Commit realizado:", commitResult.commit);

    // Realiza o push
    console.log("🚀 Enviando para GitHub...");
    const pushResult = await git.push('origin', 'main');
    console.log("✅ Push realizado com sucesso!");
    console.log("📊 Resultado do push:", pushResult);

    return true;

  } catch (err) {
    console.error("❌ Erro detalhado ao salvar no GitHub:");
    console.error("📝 Mensagem:", err.message);
    console.error("🔍 Stack:", err.stack);
    
    // Tenta diagnosticar o problema
    if (err.message.includes('Authentication failed')) {
      console.error("🔐 Problema de autenticação - verifique o GITHUB_TOKEN");
    } else if (err.message.includes('remote rejected')) {
      console.error("🚫 Push rejeitado pelo GitHub - verifique permissões");
    } else if (err.message.includes('not a git repository')) {
      console.error("📁 Problema com repositório Git - reinicializando...");
      gitInicializado = false;
    }
    
    return false;

  } finally {
    commitEmAndamento = false;
    console.log("🏁 Processo de commit finalizado");
  }
}

// Função para salvar dados e commit assíncrono
async function salvarDados(nomeArquivo, dados, mensagemCommit) {
  try {
    console.log(`💾 Salvando arquivo: ${nomeArquivo}`);
    fs.writeFileSync(nomeArquivo, JSON.stringify(dados, null, 2));
    console.log(`✅ Arquivo ${nomeArquivo} salvo localmente`);

    // Commit assíncrono em background
    setImmediate(async () => {
      const sucesso = await salvarNoGitHub(mensagemCommit || `Atualização automática: ${nomeArquivo}`);
      console.log(`${sucesso ? '✅' : '❌'} Commit ${sucesso ? 'enviado' : 'falhou'} para ${nomeArquivo}`);
    });

    return true;

  } catch (err) {
    console.error(`❌ Erro ao salvar ${nomeArquivo}:`, err.message);
    return false;
  }
}

// Função síncrona para salvar e commit
async function salvarDadosSync(nomeArquivo, dados, mensagemCommit) {
  try {
    console.log(`💾 Salvando arquivo (síncrono): ${nomeArquivo}`);
    fs.writeFileSync(nomeArquivo, JSON.stringify(dados, null, 2));
    console.log(`✅ Arquivo ${nomeArquivo} salvo localmente`);
    
    const sucesso = await salvarNoGitHub(mensagemCommit || `Atualização automática: ${nomeArquivo}`);
    console.log(`${sucesso ? '✅' : '❌'} Commit síncrono ${sucesso ? 'enviado' : 'falhou'} para ${nomeArquivo}`);
    
    return sucesso;
  } catch (err) {
    console.error(`❌ Erro ao salvar ${nomeArquivo}:`, err.message);
    return false;
  }
}

// Função para testar conectividade com GitHub
async function testarConectividade() {
  try {
    console.log("🧪 Testando conectividade com GitHub...");
    
    if (!GITHUB_TOKEN) {
      console.log("❌ GITHUB_TOKEN não configurado");
      return false;
    }
    
    await inicializarGit();
    const git = simpleGit('.');
    
    // Testa fetch
    await git.fetch('origin', 'main');
    console.log("✅ Conectividade com GitHub OK");
    return true;
    
  } catch (err) {
    console.error("❌ Erro de conectividade:", err.message);
    return false;
  }
}

module.exports = { 
  salvarNoGitHub, 
  salvarDados, 
  salvarDadosSync, 
  inicializarGit, 
  limparLock,
  testarConectividade
};