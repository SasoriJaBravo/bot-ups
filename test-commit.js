// Script de teste para verificar se os commits automáticos estão funcionando
const { salvarDados, salvarDadosSync, inicializarGit, testarConectividade } = require('./salvar.js');

async function testarCommit() {
  console.log("🧪 === TESTE COMPLETO DO SISTEMA DE COMMITS ===");
  console.log(`🕐 Iniciado em: ${new Date().toISOString()}`);
  
  try {
    // 1. Testa conectividade primeiro
    console.log("\n📡 1. Testando conectividade com GitHub...");
    const conectividade = await testarConectividade();
    if (!conectividade) {
      console.log("❌ Falha na conectividade - abortando teste");
      return false;
    }
    
    // 2. Inicializa Git
    console.log("\n🔧 2. Inicializando Git...");
    await inicializarGit();
    console.log("✅ Git inicializado");
    
    // 3. Cria arquivo de teste
    console.log("\n📝 3. Criando arquivo de teste...");
    const dadosTeste = {
      teste: true,
      timestamp: Date.now(),
      data_legivel: new Date().toISOString(),
      mensagem: "Teste de commit automático - versão corrigida",
      versao: "3.0",
      ambiente: "Render",
      github_token_presente: !!process.env.GITHUB_TOKEN,
      repo_url: process.env.REPO_URL || 'SasoriAutoPecas/bot-rota.git'
    };
    
    // 4. Teste assíncrono
    console.log("\n⚡ 4. Testando salvamento assíncrono...");
    const sucessoAsync = await salvarDados('teste-commit-async.json', dadosTeste, 'Teste: Commit assíncrono v3.0');
    console.log(`${sucessoAsync ? '✅' : '❌'} Salvamento assíncrono: ${sucessoAsync ? 'OK' : 'FALHOU'}`);
    
    // Aguarda um pouco para o commit assíncrono
    console.log("⏳ Aguardando commit assíncrono...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 5. Teste síncrono
    console.log("\n🔄 5. Testando salvamento síncrono...");
    dadosTeste.tipo_teste = "sincrono";
    dadosTeste.timestamp = Date.now();
    const sucessoSync = await salvarDadosSync('teste-commit-sync.json', dadosTeste, 'Teste: Commit síncrono v3.0');
    console.log(`${sucessoSync ? '✅' : '❌'} Salvamento síncrono: ${sucessoSync ? 'OK' : 'FALHOU'}`);
    
    // 6. Resumo final
    console.log("\n📊 === RESUMO DO TESTE ===");
    console.log(`🔗 Conectividade: ${conectividade ? '✅ OK' : '❌ FALHOU'}`);
    console.log(`⚡ Assíncrono: ${sucessoAsync ? '✅ OK' : '❌ FALHOU'}`);
    console.log(`🔄 Síncrono: ${sucessoSync ? '✅ OK' : '❌ FALHOU'}`);
    
    if (conectividade && (sucessoAsync || sucessoSync)) {
      console.log("\n🎉 TESTE CONCLUÍDO COM SUCESSO!");
      console.log("📋 Próximos passos:");
      console.log("   1. Verifique seu repositório no GitHub");
      console.log("   2. Procure pelos commits de teste");
      console.log("   3. Se os commits apareceram, o sistema está funcionando!");
      return true;
    } else {
      console.log("\n❌ TESTE FALHOU!");
      console.log("🔍 Verifique:");
      console.log("   1. GITHUB_TOKEN está correto?");
      console.log("   2. Token tem permissões de 'repo'?");
      console.log("   3. Repositório existe e você tem acesso?");
      console.log("   4. Logs de erro acima para mais detalhes");
      return false;
    }
    
  } catch (err) {
    console.error("\n❌ ERRO CRÍTICO NO TESTE:");
    console.error("📝 Mensagem:", err.message);
    console.error("🔍 Stack trace:", err.stack);
    return false;
  }
}

// Função para testar apenas o salvamento local (sem commit)
async function testarSalvamentoLocal() {
  console.log("🧪 Testando salvamento local...");
  
  try {
    const fs = require('fs');
    const dadosTeste = {
      teste_local: true,
      timestamp: Date.now(),
      data: new Date().toISOString()
    };
    
    fs.writeFileSync('teste-local.json', JSON.stringify(dadosTeste, null, 2));
    console.log("✅ Salvamento local funcionando!");
    
    // Verifica se o arquivo foi criado
    if (fs.existsSync('teste-local.json')) {
      console.log("✅ Arquivo criado com sucesso");
      
      // Remove o arquivo de teste
      fs.unlinkSync('teste-local.json');
      console.log("🗑️ Arquivo de teste removido");
      return true;
    } else {
      console.log("❌ Arquivo não foi criado");
      return false;
    }
    
  } catch (err) {
    console.error("❌ Erro no teste local:", err.message);
    return false;
  }
}

// Função para diagnosticar problemas
async function diagnosticar() {
  console.log("🔍 === DIAGNÓSTICO DO SISTEMA ===");
  
  // Verifica variáveis de ambiente
  console.log("\n🔐 Variáveis de ambiente:");
  console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Presente' : '❌ Ausente'}`);
  console.log(`   REPO_URL: ${process.env.REPO_URL || 'SasoriAutoPecas/bot-rota.git'}`);
  
  // Verifica arquivos
  console.log("\n📁 Arquivos do projeto:");
  const fs = require('fs');
  const arquivos = ['pedidos.json', 'config.json', 'cargos.json', 'servidores.json'];
  arquivos.forEach(arquivo => {
    const existe = fs.existsSync(arquivo);
    console.log(`   ${arquivo}: ${existe ? '✅ Existe' : '❌ Não existe'}`);
  });
  
  // Verifica Git
  console.log("\n📦 Status do Git:");
  try {
    const simpleGit = require('simple-git');
    const git = simpleGit('.');
    const isRepo = await git.checkIsRepo();
    console.log(`   É repositório Git: ${isRepo ? '✅ Sim' : '❌ Não'}`);
    
    if (isRepo) {
      const status = await git.status();
      console.log(`   Branch atual: ${status.current}`);
      console.log(`   Arquivos modificados: ${status.modified.length}`);
      console.log(`   Arquivos staged: ${status.staged.length}`);
    }
  } catch (err) {
    console.log(`   ❌ Erro ao verificar Git: ${err.message}`);
  }
}

// Executa os testes se o arquivo for chamado diretamente
if (require.main === module) {
  console.log("🚀 Iniciando diagnóstico e testes...");
  
  // Executa diagnóstico primeiro
  diagnosticar().then(() => {
    console.log("\n" + "=".repeat(50));
    
    // Testa salvamento local primeiro
    return testarSalvamentoLocal();
  }).then((localOk) => {
    if (localOk) {
      console.log("\n" + "=".repeat(50));
      // Depois testa o commit completo
      return testarCommit();
    } else {
      console.log("❌ Salvamento local falhou - não testando commits");
      return false;
    }
  }).then((resultado) => {
    console.log("\n" + "=".repeat(50));
    console.log(`🏁 TESTE FINALIZADO: ${resultado ? 'SUCESSO' : 'FALHA'}`);
    console.log(`🕐 Finalizado em: ${new Date().toISOString()}`);
  }).catch(err => {
    console.error("❌ Erro geral nos testes:", err.message);
  });
}

module.exports = { testarCommit, testarSalvamentoLocal, diagnosticar };