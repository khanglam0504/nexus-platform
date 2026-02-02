// OpenClaw AI Connector Service
// Integrates with OpenClaw API for AI agent responses
// Supports both cloud API and local gateway connections

type AgentType = 'ASSISTANT' | 'CODER' | 'ANALYST' | 'RESEARCHER';

// OpenClaw Cloud API configuration (fallback)
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

// OpenClaw Gateway config (from agent.config.openclaw)
export interface OpenClawGatewayConfig {
  gatewayUrl?: string;
  token?: string;
}

// Call local OpenClaw Gateway via OpenAI-compatible endpoint
async function callLocalGateway(
  gatewayUrl: string,
  token: string,
  message: string,
  sessionKey?: string
): Promise<OpenClawResponse> {
  try {
    // Normalize gateway URL
    const baseUrl = gatewayUrl.replace(/\/$/, '');
    
    // Use OpenAI-compatible /v1/chat/completions endpoint
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-openclaw-session-key': sessionKey || 'nexus-chat',
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [
          { role: 'user', content: message }
        ],
        user: sessionKey || 'nexus-chat', // For session continuity
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenClaw Gateway error: ${response.status} - ${errorText}`);
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // OpenAI format: { choices: [{ message: { content } }] }
    const content = data.choices?.[0]?.message?.content || 'No response from agent.';
    
    return {
      content,
      model: data.model || 'openclaw-gateway',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error('OpenClaw Gateway request failed:', error);
    throw error;
  }
}

// OpenClaw Cloud API client
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

  fallbackResponse(messages: ChatMessage[]): OpenClawResponse {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const systemPrompt = messages.find(m => m.role === 'system');

    let responseContent = 'I apologize, but I am currently unable to process your request. ';

    if (lastUserMessage) {
      if (systemPrompt?.content.includes('software developer')) {
        responseContent += `For your code-related question about "${lastUserMessage.content.slice(0, 50)}...", I recommend checking the official documentation or Stack Overflow while I'm temporarily unavailable.`;
      } else if (systemPrompt?.content.includes('data analyst')) {
        responseContent += `For your data analysis question, please ensure your data is properly formatted and consider using tools like Excel, Python pandas, or SQL for initial exploration.`;
      } else if (systemPrompt?.content.includes('research')) {
        responseContent += `For your research question, I suggest checking academic databases like Google Scholar, or official documentation for technical topics.`;
      } else {
        responseContent += `Please try again in a moment, or reach out to a team member for assistance.`;
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
// Now supports local gateway via gatewayConfig
export async function generateAgentResponse(
  agentType: AgentType,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  config: AgentConfig = {},
  agentContext?: {
    workingState?: any;
    longTermMemory?: string | null;
  },
  gatewayConfig?: OpenClawGatewayConfig,
  sessionKey?: string
): Promise<string> {
  
  // If gateway config is provided, use local gateway
  if (gatewayConfig?.gatewayUrl && gatewayConfig?.token) {
    try {
      console.log(`Calling OpenClaw Gateway at ${gatewayConfig.gatewayUrl}`);
      
      // Build context message for gateway
      let contextMessage = userMessage;
      
      // Add conversation history context if available
      if (conversationHistory.length > 0) {
        const historyText = conversationHistory
          .slice(-5) // Last 5 messages for context
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');
        contextMessage = `[Previous conversation]\n${historyText}\n\n[New message]\n${userMessage}`;
      }
      
      const response = await callLocalGateway(
        gatewayConfig.gatewayUrl,
        gatewayConfig.token,
        contextMessage,
        sessionKey
      );
      
      return response.content;
    } catch (error) {
      console.error('Local gateway failed, falling back to cloud API:', error);
      // Fall through to cloud API
    }
  }

  // Fallback to cloud API or fallback response
  const systemPrompt = config.customPrompt || AGENT_SYSTEM_PROMPTS[agentType];

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

// Check if OpenClaw is configured (cloud API)
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
