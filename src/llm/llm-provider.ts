export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  responseFormat?: "json";
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  model?: string;
}

export interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResponse>;
}
