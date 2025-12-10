import OpenAI from 'openai';
import { z } from 'zod';
import { extractJsonFromText } from './result-parser';
import { TokenUsage } from './token-tracker';

export interface SynthesisResult<T> {
  data: T | undefined;
  model: string;
  usage: TokenUsage;
  success: boolean;
  error?: string;
}

export interface SynthesisConfig {
  model?: string;
}

let _openaiClient: OpenAI | null = null;
let _config: Required<SynthesisConfig> = { model: 'gpt-4o-mini' };

export function configure(config: SynthesisConfig): void {
  _config = { model: config.model ?? 'gpt-4o-mini' };
}

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    _openaiClient = new OpenAI({
      apiKey,
      defaultHeaders: { 'X-Model-Tier': 'flex' },
    });
  }
  return _openaiClient;
}

export function estimateCost(usage: TokenUsage, model: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.075, output: 0.30 },
  };
  const r = rates[model] || { input: 0.15, output: 0.60 };
  return (usage.prompt / 1_000_000) * r.input + (usage.completion / 1_000_000) * r.output;
}

export async function synthesize<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  options: {
    maxTokens?: number;
    temperature?: number;
    retries?: number;
  } = {}
): Promise<SynthesisResult<T>> {
  const maxTokens = options.maxTokens ?? 4000;
  const temperature = options.temperature ?? 0.3;
  const retries = options.retries ?? 2;
  const model = _config.model;
  const client = getOpenAIClient();

  let lastError: string = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const text = response.choices[0]?.message?.content || '';
      
      const usage: TokenUsage = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      };

      if (!text.trim()) {
        throw new Error('Empty response from LLM');
      }

      const jsonText = extractJsonFromText(text);
      const parsed = JSON.parse(jsonText);
      const validated = schema.parse(parsed);

      return {
        data: validated,
        model,
        usage,
        success: true,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < retries) {
        console.log(`      ⚠️  Attempt ${attempt + 1} failed: ${lastError}, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  return {
    data: undefined,
    model,
    usage: { prompt: 0, completion: 0, total: 0 },
    success: false,
    error: lastError,
  };
}

export async function synthesizeRaw(
  systemPrompt: string,
  userPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<{ text: string; model: string; usage: TokenUsage; success: boolean; error?: string }> {
  const maxTokens = options.maxTokens ?? 4000;
  const temperature = options.temperature ?? 0.7;
  const model = _config.model;
  const client = getOpenAIClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const text = response.choices[0]?.message?.content || '';
    
    const usage: TokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    return {
      text,
      model,
      usage,
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return {
      text: '',
      model,
      usage: { prompt: 0, completion: 0, total: 0 },
      success: false,
      error: errorMsg,
    };
  }
}

export function getModel(): string {
  return _config.model;
}
