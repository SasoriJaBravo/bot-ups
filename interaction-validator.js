// Validador avançado de interações para prevenir timeouts
// Sistema de monitoramento em tempo real das interações do Discord

class InteractionValidator {
  constructor() {
    this.validationRules = {
      maxProcessingTime: 2500,     // 2.5 segundos máximo
      warningThreshold: 2000,      // Aviso aos 2 segundos
      criticalThreshold: 2800,     // Crítico aos 2.8 segundos
      maxRetries: 2,               // Máximo 2 tentativas
      cooldownPeriod: 1000         // 1 segundo entre tentativas
    };
    
    this.metrics = {
      totalInteractions: 0,
      successfulInteractions: 0,
      timeoutErrors: 0,
      unknownInteractionErrors: 0,
      averageResponseTime: 0,
      responseTimeHistory: []
    };
    
    this.activeValidations = new Map();
  }

  // Inicia validação de uma interação
  startValidation(interaction) {
    const validationId = `${interaction.id}_${Date.now()}`;
    const validation = {
      id: validationId,
      interactionId: interaction.id,
      startTime: Date.now(),
      type: this.getInteractionType(interaction),
      status: 'validating',
      warnings: [],
      attempts: 0
    };
    
    this.activeValidations.set(validationId, validation);
    this.metrics.totalInteractions++;
    
    // Timer de aviso
    setTimeout(() => {
      this.checkWarningThreshold(validationId);
    }, this.validationRules.warningThreshold);
    
    // Timer crítico
    setTimeout(() => {
      this.checkCriticalThreshold(validationId);
    }, this.validationRules.criticalThreshold);
    
    console.log(`🔍 Validação iniciada: ${validation.type} (${validationId})`);
    return validationId;
  }

  // Verifica se atingiu o threshold de aviso
  checkWarningThreshold(validationId) {
    const validation = this.activeValidations.get(validationId);
    if (!validation || validation.status !== 'validating') return;
    
    const elapsed = Date.now() - validation.startTime;
    if (elapsed >= this.validationRules.warningThreshold) {
      validation.warnings.push(`Processamento lento: ${elapsed}ms`);
      console.log(`⚠️ Aviso de tempo: ${validation.type} levando ${elapsed}ms`);
    }
  }

  // Verifica se atingiu o threshold crítico
  checkCriticalThreshold(validationId) {
    const validation = this.activeValidations.get(validationId);
    if (!validation || validation.status !== 'validating') return;
    
    const elapsed = Date.now() - validation.startTime;
    if (elapsed >= this.validationRules.criticalThreshold) {
      validation.status = 'critical';
      validation.warnings.push(`Tempo crítico atingido: ${elapsed}ms`);
      console.log(`🚨 CRÍTICO: ${validation.type} atingiu ${elapsed}ms - possível timeout iminente`);
    }
  }

  // Finaliza validação com sucesso
  finishValidation(validationId, success = true) {
    const validation = this.activeValidations.get(validationId);
    if (!validation) return;
    
    const responseTime = Date.now() - validation.startTime;
    validation.status = success ? 'success' : 'failed';
    validation.responseTime = responseTime;
    
    // Atualizar métricas
    if (success) {
      this.metrics.successfulInteractions++;
    }
    
    this.updateResponseTimeMetrics(responseTime);
    
    console.log(`${success ? '✅' : '❌'} Validação finalizada: ${validation.type} (${responseTime}ms)`);
    
    // Limpar após um tempo
    setTimeout(() => {
      this.activeValidations.delete(validationId);
    }, 5000);
  }

  // Registra erro de timeout
  recordTimeoutError(validationId, error) {
    const validation = this.activeValidations.get(validationId);
    if (validation) {
      validation.status = 'timeout';
      validation.error = error.message;
      validation.errorCode = error.code;
    }
    
    if (error.code === 10062) {
      this.metrics.unknownInteractionErrors++;
      console.log(`📊 Total de erros 10062: ${this.metrics.unknownInteractionErrors}`);
    } else {
      this.metrics.timeoutErrors++;
    }
  }

  // Atualiza métricas de tempo de resposta
  updateResponseTimeMetrics(responseTime) {
    this.metrics.responseTimeHistory.push(responseTime);
    
    // Manter apenas os últimos 100 registros
    if (this.metrics.responseTimeHistory.length > 100) {
      this.metrics.responseTimeHistory.shift();
    }
    
    // Calcular média
    const sum = this.metrics.responseTimeHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.metrics.responseTimeHistory.length);
  }

  // Determina o tipo de interação
  getInteractionType(interaction) {
    if (interaction.isChatInputCommand()) return 'SlashCommand';
    if (interaction.isButton()) return 'Button';
    if (interaction.isStringSelectMenu()) return 'SelectMenu';
    if (interaction.isModalSubmit()) return 'Modal';
    return 'Unknown';
  }

  // Verifica se uma interação é segura para processar
  isSafeToProcess(interaction) {
    const timeElapsed = Date.now() - interaction.createdTimestamp;
    const isSafe = timeElapsed < this.validationRules.maxProcessingTime;
    
    if (!isSafe) {
      console.log(`⚠️ Interação não é segura: ${timeElapsed}ms decorridos`);
    }
    
    return isSafe;
  }

  // Obtém relatório de métricas
  getMetricsReport() {
    const successRate = this.metrics.totalInteractions > 0 
      ? ((this.metrics.successfulInteractions / this.metrics.totalInteractions) * 100).toFixed(2)
      : 0;
    
    const errorRate = this.metrics.totalInteractions > 0
      ? (((this.metrics.timeoutErrors + this.metrics.unknownInteractionErrors) / this.metrics.totalInteractions) * 100).toFixed(2)
      : 0;

    return {
      totalInteractions: this.metrics.totalInteractions,
      successfulInteractions: this.metrics.successfulInteractions,
      successRate: `${successRate}%`,
      errorRate: `${errorRate}%`,
      timeoutErrors: this.metrics.timeoutErrors,
      unknownInteractionErrors: this.metrics.unknownInteractionErrors,
      averageResponseTime: `${this.metrics.averageResponseTime}ms`,
      activeValidations: this.activeValidations.size,
      currentThresholds: {
        warning: `${this.validationRules.warningThreshold}ms`,
        critical: `${this.validationRules.criticalThreshold}ms`,
        maximum: `${this.validationRules.maxProcessingTime}ms`
      }
    };
  }

  // Ajusta thresholds baseado na performance
  adjustThresholds() {
    const avgTime = this.metrics.averageResponseTime;
    const errorRate = (this.metrics.unknownInteractionErrors / this.metrics.totalInteractions) * 100;
    
    // Se muitos erros 10062, ser mais conservador
    if (errorRate > 5) {
      this.validationRules.maxProcessingTime = Math.max(1500, this.validationRules.maxProcessingTime - 100);
      this.validationRules.warningThreshold = Math.max(1000, this.validationRules.warningThreshold - 100);
      console.log(`🔧 Thresholds ajustados para serem mais conservadores devido a alta taxa de erro (${errorRate.toFixed(2)}%)`);
    }
    
    // Se performance boa, pode ser menos conservador
    if (errorRate < 1 && avgTime < 1000) {
      this.validationRules.maxProcessingTime = Math.min(2500, this.validationRules.maxProcessingTime + 50);
      this.validationRules.warningThreshold = Math.min(2000, this.validationRules.warningThreshold + 50);
      console.log(`🔧 Thresholds ajustados para serem menos conservadores devido a boa performance`);
    }
  }
}

// Instância global
const validator = new InteractionValidator();

// Ajuste automático de thresholds a cada 10 minutos
setInterval(() => {
  validator.adjustThresholds();
}, 10 * 60 * 1000);

module.exports = {
  InteractionValidator,
  validator
};
