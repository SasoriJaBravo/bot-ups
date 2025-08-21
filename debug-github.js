// Script para debug detalhado dos problemas com GitHub
const simpleGit = require('simple-git');
const fs = require('fs');

async function debugCompleto() {
  console.log("🔍 === DEBUG COMPLETO DO GITHUB ===");
  console.log(`🕐 Iniciado em: ${new Date().toISOString()}\n`);
  
  // 1. Verifica variáveis de ambiente
  console.log("🔐 1. VARIÁVEIS DE AMBIENTE:");
  const githubToken = process.env.GITHUB_TOKEN;
  const repoUrl = process.env.REPO_URL || 'SasoriAutoPecas/bot-rota.git';
  
  console.log(`   GITHUB_TOKEN: ${githubToken ? `✅ Presente (${githubToken.substring(0, 10)}...)` : '❌ Ausente'}`);
  console.log(`   REPO_URL: ${repoUrl}`);
  
  if (!githubToken) {
    console.log("❌ GITHUB_TOKEN não encontrado - configure nas variáveis de ambiente do Render");
    return false;
  }
  
  // 2. Testa conectividade básica com GitHub
  console.log("\n📡 2. TESTANDO CONECTIVIDADE:");
  try {
    const https = require('https');
    const testUrl = `https://api.github.com/repos/${repoUrl.replace('.git', '')}`;
    
    await new Promise((resolve, reject) => {
      const req = https.get(testUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'ROTA-BOT'
        }
      }, (res) => {
        console.log(`   Status da API GitHub: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log("   ✅ Repositório acessível via API");
          resolve();
        } else if (res.statusCode === 404) {
          console.log("   ❌ Repositório não encontrado ou sem acesso");
          reject(new Error('Repositório não encontrado'));
        } else {
          console.log("   ⚠️ Status inesperado");
          resolve();
        }
      });
      
      req.on('error', (err) => {
        console.log(`   ❌ Erro de conectividade: ${err.message}`);
        reject(err);
      });
      
      req.setTimeout(10000, () => {
        console.log("   ❌ Timeout na conexão");
        reject(new Error('Timeout'));
      });
    });
    
  } catch (err) {
    console.log(`   ❌ Falha na conectividade: ${err.message}`);
  }
  
  // 3. Verifica status do Git local
  console.log("\n📦 3. STATUS DO GIT LOCAL:");
  try {
    const git = simpleGit('.');
    
    const isRepo = await git.checkIsRepo();
    console.log(`   É repositório Git: ${isRepo ? '✅ Sim' : '❌ Não'}`);
    
    if (!isRepo) {
      console.log("   🔧 Inicializando repositório...");
      await git.init();
      console.log("   ✅ Repositório inicializado");
    }
    
    // Configura usuário se necessário
    try {
      const config = await git.listConfig();
      const hasUser = config.all['user.name'] && config.all['user.email'];
      
      if (!hasUser) {
        await git.addConfig('user.name', 'SasoriAutoPecas', false, 'local');
        await git.addConfig('user.email', 'elenacrae@gmail.com', false, 'local');
        console.log("   👤 Usuário Git configurado");
      } else {
        console.log(`   👤 Usuário: ${config.all['user.name']} <${config.all['user.email']}>`);
      }
    } catch (configErr) {
      console.log(`   ⚠️ Erro ao verificar config: ${configErr.message}`);
    }
    
    // Verifica remotes
    const remotes = await git.getRemotes(true);
    console.log(`   Remotes configurados: ${remotes.length}`);
    
    remotes.forEach(remote => {
      console.log(`     - ${remote.name}: ${remote.refs.fetch}`);
    });
    
    // Configura remote se necessário
    const originExists = remotes.find(r => r.name === 'origin');
    const correctUrl = `https://${githubToken}@github.com/${repoUrl}`;
    
    if (!originExists) {
      await git.addRemote('origin', correctUrl);
      console.log("   🔗 Remote origin adicionado");
    } else if (!originExists.refs.fetch.includes(githubToken)) {
      await git.removeRemote('origin');
      await git.addRemote('origin', correctUrl);
      console.log("   🔗 Remote origin atualizado com token");
    }
    
    // Verifica status
    const status = await git.status();
    console.log(`   Branch atual: ${status.current || 'nenhuma'}`);
    console.log(`   Arquivos modificados: ${status.modified.length}`);
    console.log(`   Arquivos não rastreados: ${status.not_added.length}`);
    console.log(`   Arquivos staged: ${status.staged.length}`);
    
  } catch (gitErr) {
    console.log(`   ❌ Erro no Git: ${gitErr.message}`);
  }
  
  // 4. Testa operação completa de commit
  console.log("\n🧪 4. TESTE DE COMMIT COMPLETO:");
  try {
    const git = simpleGit('.');
    
    // Cria arquivo de teste
    const testData = {
      debug_test: true,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      render_environment: true
    };
    
    fs.writeFileSync('debug-test.json', JSON.stringify(testData, null, 2));
    console.log("   📝 Arquivo de teste criado");
    
    // Add
    await git.add('debug-test.json');
    console.log("   📦 Arquivo adicionado ao staging");
    
    // Commit
    const commitResult = await git.commit('Debug: Teste de commit do Render');
    console.log(`   💾 Commit realizado: ${commitResult.commit}`);
    
    // Push
    console.log("   🚀 Tentando push...");
    const pushResult = await git.push('origin', 'main');
    console.log("   ✅ Push realizado com sucesso!");
    console.log(`   📊 Resultado: ${JSON.stringify(pushResult, null, 2)}`);
    
    // Remove arquivo de teste
    fs.unlinkSync('debug-test.json');
    console.log("   🗑️ Arquivo de teste removido");
    
    return true;
    
  } catch (testErr) {
    console.log(`   ❌ Erro no teste: ${testErr.message}`);
    console.log(`   🔍 Stack: ${testErr.stack}`);
    
    // Análise específica do erro
    if (testErr.message.includes('Authentication failed')) {
      console.log("   🔐 PROBLEMA: Token de autenticação inválido ou expirado");
      console.log("   💡 SOLUÇÃO: Gere um novo token no GitHub com permissões 'repo'");
    } else if (testErr.message.includes('Permission denied')) {
      console.log("   🚫 PROBLEMA: Sem permissão para escrever no repositório");
      console.log("   💡 SOLUÇÃO: Verifique se o token tem escopo 'repo' completo");
    } else if (testErr.message.includes('not found')) {
      console.log("   📁 PROBLEMA: Repositório não encontrado");
      console.log("   💡 SOLUÇÃO: Verifique se o REPO_URL está correto");
    } else if (testErr.message.includes('remote rejected')) {
      console.log("   🚫 PROBLEMA: Push rejeitado pelo GitHub");
      console.log("   💡 SOLUÇÃO: Verifique branch protection rules");
    }
    
    return false;
  }
}

// Função para verificar permissões do token
async function verificarPermissoesToken() {
  console.log("\n🔐 VERIFICANDO PERMISSÕES DO TOKEN:");
  
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.log("❌ Token não encontrado");
    return false;
  }
  
  try {
    const https = require('https');
    
    // Verifica permissões via API
    await new Promise((resolve, reject) => {
      const req = https.get('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'ROTA-BOT'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            const user = JSON.parse(data);
            console.log(`   ✅ Token válido para usuário: ${user.login}`);
            
            // Verifica scopes no header
            const scopes = res.headers['x-oauth-scopes'];
            console.log(`   🔑 Escopos: ${scopes || 'não informado'}`);
            
            if (scopes && scopes.includes('repo')) {
              console.log("   ✅ Escopo 'repo' presente");
            } else {
              console.log("   ❌ Escopo 'repo' ausente - token precisa de mais permissões");
            }
            
            resolve();
          } else {
            console.log(`   ❌ Token inválido (status: ${res.statusCode})`);
            reject(new Error('Token inválido'));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Timeout')));
    });
    
    return true;
    
  } catch (err) {
    console.log(`   ❌ Erro ao verificar token: ${err.message}`);
    return false;
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  debugCompleto()
    .then(() => verificarPermissoesToken())
    .then(() => {
      console.log("\n" + "=".repeat(50));
      console.log("🏁 DEBUG FINALIZADO");
      console.log("📋 Se ainda houver problemas, verifique:");
      console.log("   1. Token GitHub tem escopo 'repo' completo");
      console.log("   2. Repositório existe e você tem acesso de escrita");
      console.log("   3. Não há branch protection rules bloqueando");
      console.log("   4. Variáveis estão corretas no Render");
    })
    .catch(err => {
      console.error("❌ Erro no debug:", err.message);
    });
}

module.exports = { debugCompleto, verificarPermissoesToken };