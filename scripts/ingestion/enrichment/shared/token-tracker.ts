export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export class TokenTracker {
  private static instance: TokenTracker;
  private totalUsage: TokenUsage;

  private constructor() {
    this.totalUsage = { prompt: 0, completion: 0, total: 0 };
  }

  static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  trackUsage(usage: TokenUsage): void {
    this.totalUsage.prompt += usage.prompt;
    this.totalUsage.completion += usage.completion;
    this.totalUsage.total += usage.total;
  }

  getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  estimateCost(model: string = 'gpt-4.1-mini'): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4.1-mini': { input: 0.20, output: 0.80 },  // Flex tier
      'gpt-5-mini': { input: 0.15, output: 0.60 },
      'gpt-5-nano': { input: 0.04, output: 0.16 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4.1-mini'];
    const inputCost = (this.totalUsage.prompt / 1_000_000) * modelPricing.input;
    const outputCost = (this.totalUsage.completion / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  reset(): void {
    this.totalUsage = { prompt: 0, completion: 0, total: 0 };
  }

  getSummary(model: string = 'gpt-4.1-mini'): string {
    const usage = this.getTotalUsage();
    const cost = this.estimateCost(model);
    return `Tokens: ${usage.total.toLocaleString()} (prompt: ${usage.prompt.toLocaleString()}, completion: ${usage.completion.toLocaleString()}) | Cost: $${cost.toFixed(4)}`;
  }
}
