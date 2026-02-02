// OpenClaw AI Connector Service
// Integrates with OpenClaw API for AI agent responses

import type { AgentType } from '@prisma/client';

// OpenClaw API configuration
const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'https://api.openclaw.ai/v1';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY;

// Agent system prompts based on type
const AGENT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  ASSISTANT: `You are a helpful AI assistant in a team collaboration chat.
Be concise, friendly, and helpful. Answer questions directly and provide actionable advice.
Keep responses under 500 words unless explicitly asked for more detail.`,

  CODER: `You are an expert software developer AI assistant in a team collaboration chat.
Help with code reviews, debugging, architecture decisions, and implementation guidance.
When providing code, use markdown code blocks with language hints.
Be precise about best practices and explain trade-offs when relevant.`,

  ANALYST: `You are a data analyst AI assistant in a team collaboration chat.
Help analyze data, interpret metrics, create reports, and provide business insights.
When presenting data, use clear formatting and highlight key findings.
Provide actionable recommendations based on the analysis.`,

  RESEARCHER: `You are a research AI assistant in a team collaboration chat.
Help find information, summarize topics, compare alternatives, and provide citations.
Be thorough but concise. Organize findings clearly with headings and bullet points.
Always indicate if you're uncertain or if information might be outdated.`,
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenClawResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}

// OpenClaw API client
class OpenClawClient {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    this.apiKey = OPENCLAW_API_KEY;
    this.baseUrl = OPENCLAW_API_URL;
  }

  async chat(
    messages: ChatMessage[],
    config: AgentConfig = {}
  ): Promise<OpenClawResponse> {
    // If API key is not configured, use fallback
    if (!this.apiKey) {
      return this.fallbackResponse(messages);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'openclaw-v1',
          messages,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 1024,
        }),
      });

      if (!response.ok) {
        console.error(`OpenClaw API error: ${response.status} ${response.statusText}`);
        return this.fallbackResponse(messages);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.',
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('OpenClaw API request failed:', error);
      return this.fallbackResponse(messages);
    }
  }

  private fallbackResponse(messages: ChatMessage[]): OpenClawResponse {
    // Generate contextual fallback when API is unavailable
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const systemPrompt = messages.find(m => m.role === 'system');

    let responseContent = 'I apologize, but I am currently unable to process your request. ';

    if (lastUserMessage) {
      const query = lastUserMessage.content.toLowerCase();

      // Provide helpful fallback based on agent type from system prompt
      if (systemPrompt?.content.includes('software developer')) {
        responseContent += `For your code-related question about "${lastUserMessage.content.slice(0, 50)}...", I recommend checking the official documentation or Stack Overflow while I'm temporarily unavailable.`;
      } else if (systemPrompt?.content.includes('data analyst')) {
        responseContent += `For your data analysis question, please ensure your data is properly formatted and consider using tools like Excel, Python pandas, or SQL for initial exploration.`;
      } else if (systemPrompt?.content.includes('research')) {
        responseContent += `For your research question, I suggest checking academic databases like Google Scholar, or official documentation for technical topics.`;
      } else {
        responseContent += `Please try again in a moment, or reach out to a team member for assistance with your question about "${lastUserMessage.content.slice(0, 50)}..."`;
      }
    } else {
      responseContent += 'Please try again in a moment.';
    }

    return {
      content: responseContent,
      model: 'fallback',
    };
  }
}

// Singleton instance
const openclawClient = new OpenClawClient();

// Generate agent response with context
export async function generateAgentResponse(
  agentType: AgentType,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  config: AgentConfig = {},
  agentContext?: {
    workingState?: any;
    longTermMemory?: string | null;
  }
): Promise<string> {
  const systemPrompt = config.customPrompt || AGENT_SYSTEM_PROMPTS[agentType];

  // Enhanced system prompt with context
  let fullSystemPrompt = systemPrompt;
  if (agentContext) {
    if (agentContext.longTermMemory) {
      fullSystemPrompt += `\n\nLONG-TERM MEMORY:\n${agentContext.longTermMemory}`;
    }
    if (agentContext.workingState) {
      fullSystemPrompt += `\n\nCURRENT WORKING STATE:\n${JSON.stringify(agentContext.workingState, null, 2)}`;
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await openclawClient.chat(messages, config);
  return response.content;
}

// Check if OpenClaw is configured
export function isOpenClawConfigured(): boolean {
  return !!OPENCLAW_API_KEY;
}

// Get agent type display name
export function getAgentTypeDisplayName(type: AgentType): string {
  const names: Record<AgentType, string> = {
    ASSISTANT: 'AI Assistant',
    CODER: 'Code Expert',
    ANALYST: 'Data Analyst',
    RESEARCHER: 'Research Assistant',
  };
  return names[type];
}

export { openclawClient };
