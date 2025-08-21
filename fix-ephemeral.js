const fs = require('fs');
const path = require('path');

// Script para corrigir automaticamente o warning do Discord.js
// Substitui "ephemeral: true" por "flags: 64"

function corrigirArquivo(caminhoArquivo) {
  try {
    console.log(`🔍 Verificando arquivo: ${caminhoArquivo}`);
    
    if (!fs.existsSync(caminhoArquivo)) {
      console.log(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
      return false;
    }

    let conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    let alteracoes = 0;
    
    // Padrões para encontrar e substituir
    const padroes = [
      // ephemeral: true
      {
        buscar: /ephemeral:\s*true/g,
        substituir: 'flags: 64',
        descricao: 'ephemeral: true → flags: 64'
      },
      // ephemeral:true (sem espaço)
      {
        buscar: /ephemeral:true/g,
        substituir: 'flags: 64',
        descricao: 'ephemeral:true → flags: 64'
      },
      // "ephemeral": true
      {
        buscar: /"ephemeral":\s*true/g,
        substituir: '"flags": 64',
        descricao: '"ephemeral": true → "flags": 64'
      },
      // 'ephemeral': true
      {
        buscar: /'ephemeral':\s*true/g,
        substituir: "'flags': 64",
        descricao: "'ephemeral': true → 'flags': 64"
      }
    ];

    // Aplica todas as substituições
    padroes.forEach(padrao => {
      const matches = conteudo.match(padrao.buscar);
      if (matches) {
        console.log(`🔧 Encontradas ${matches.length} ocorrências de: ${padrao.descricao}`);
        conteudo = conteudo.replace(padrao.buscar, padrao.substituir);
        alteracoes += matches.length;
      }
    });

    if (alteracoes > 0) {
      // Faz backup do arquivo original
      const backup = `${caminhoArquivo}.backup.${Date.now()}`;
      fs.writeFileSync(backup, fs.readFileSync(caminhoArquivo));
      console.log(`💾 Backup criado: ${backup}`);
      
      // Salva o arquivo corrigido
      fs.writeFileSync(caminhoArquivo, conteudo);
      console.log(`✅ ${alteracoes} correções aplicadas em: ${caminhoArquivo}`);
      return true;
    } else {
      console.log(`✨ Nenhuma correção necessária em: ${caminhoArquivo}`);
      return false;
    }
    
  } catch (err) {
    console.error(`❌ Erro ao processar ${caminhoArquivo}:`, err.message);
    return false;
  }
}

function corrigirTodosArquivos() {
  console.log('🚀 Iniciando correção automática do warning ephemeral...\n');
  
  const arquivos = [
    'index.js',
    'bot.js',
    'main.js',
    'app.js'
  ];
  
  let totalCorrecoes = 0;
  
  arquivos.forEach(arquivo => {
    if (corrigirArquivo(arquivo)) {
      totalCorrecoes++;
    }
  });
  
  console.log(`\n📊 Resumo:`);
  console.log(`📁 Arquivos verificados: ${arquivos.length}`);
  console.log(`✅ Arquivos corrigidos: ${totalCorrecoes}`);
  
  if (totalCorrecoes > 0) {
    console.log(`\n🎉 Correções aplicadas com sucesso!`);
    console.log(`📝 Os arquivos originais foram salvos como backup (.backup.timestamp)`);
    console.log(`🔄 Reinicie o bot para aplicar as correções`);
  } else {
    console.log(`\n🤔 Nenhuma correção foi necessária.`);
    console.log(`💡 O warning pode estar vindo de outro arquivo ou dependência.`);
  }
}

// Função para mostrar exemplos de correção
function mostrarExemplos() {
  console.log(`
🔧 EXEMPLOS DE CORREÇÃO:

❌ ANTES (causa warning):
await interaction.reply({ content: "Teste", ephemeral: true });
await interaction.followUp({ embeds: [embed], ephemeral: true });
await interaction.editReply({ content: "Atualizado", ephemeral: true });

✅ DEPOIS (correto):
await interaction.reply({ content: "Teste", flags: 64 });
await interaction.followUp({ embeds: [embed], flags: 64 });
await interaction.editReply({ content: "Atualizado", flags: 64 });

📝 NOTA: O valor 64 corresponde ao MessageFlags.Ephemeral
`);
}

// Executa se chamado diretamente
if (require.main === module) {
  mostrarExemplos();
  corrigirTodosArquivos();
}

module.exports = { corrigirArquivo, corrigirTodosArquivos, mostrarExemplos };