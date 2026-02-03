import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: process.env.NEXT_PUBLIC_AI_BASE_URL,
  apiKey: 'dummy-key',
  dangerouslyAllowBrowser: true,
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  onChunk?: (text: string) => void,
): Promise<string> {
  if (onChunk) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        onChunk(content);
      }
    }
    return fullText;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
  });

  return response.choices[0]?.message?.content || '';
}
