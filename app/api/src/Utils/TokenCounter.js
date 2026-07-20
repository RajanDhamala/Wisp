import { get_encoding } from "tiktoken";

const MESSAGE_OVERHEAD_TOKENS = 4;
const RESPONSE_PRIMER_TOKENS = 2;
const encoderCache = new Map();

const getEncodingName = (model) =>
  model.startsWith("openai/") ? "o200k_base" : "cl100k_base";

const getEncoder = (model) => {
  const encodingName = getEncodingName(model);
  if (!encoderCache.has(encodingName)) {
    encoderCache.set(encodingName, get_encoding(encodingName));
  }
  return encoderCache.get(encodingName);
};

const normalizeContent = (content) => {
  if (typeof content === "string") return content;
  if (content === null || content === undefined) return "";
  return JSON.stringify(content);
};

const countTokens = (text, model) => {
  const content = normalizeContent(text);
  if (!content) return 0;

  const encodedTokens = getEncoder(model).encode(content).length;
  // Non-OpenAI providers use their own tokenizers. Keep reservations
  // conservative until the provider returns its authoritative usage count.
  const conservativeByteEstimate = Math.ceil(
    Buffer.byteLength(content, "utf8") / 3,
  );
  return Math.max(encodedTokens, conservativeByteEstimate);
};

const countMessageTokens = (messages, model) =>
  messages.reduce(
    (total, message) =>
      total +
      MESSAGE_OVERHEAD_TOKENS +
      countTokens(message.role, model) +
      countTokens(message.content, model),
    RESPONSE_PRIMER_TOKENS,
  );

const closeTokenCounters = () => {
  for (const encoder of encoderCache.values()) encoder.free();
  encoderCache.clear();
};

export { closeTokenCounters, countMessageTokens, countTokens };
