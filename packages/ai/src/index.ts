export { AIService } from "./ai-service";
export { AIRefusalError } from "./provider";
export type { AIProvider, ConverseRequest, ConverseResult, ConverseTool, ConverseTurn } from "./provider";
export { AnthropicProvider } from "./providers/anthropic-provider";
export { parseIntentHeuristically } from "./heuristics";
export { scoreProductsForIntent, explainMatch } from "./scoring";
export { toProductSummaryDTO } from "./dto";
