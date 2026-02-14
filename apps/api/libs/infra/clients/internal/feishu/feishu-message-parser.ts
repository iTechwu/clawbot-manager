/**
 * 飞书消息解析工具
 *
 * 职责：
 * - 解析飞书不同类型的消息内容
 * - 提取文本和图片信息
 * - 支持富文本（post）和图片（image）类型消息
 */
import type {
  FeishuPostContent,
  FeishuPostContentNode,
  FeishuImageContent,
  ParsedFeishuMessage,
} from './feishu.types';

/**
 * 解析飞书富文本消息（post 类型）
 * 提取文本和图片信息
 */
export function parsePostContent(rawContent: string): ParsedFeishuMessage {
  const result: ParsedFeishuMessage = {
    text: '',
    hasImages: false,
    images: [],
    messageType: 'post',
  };

  try {
    const content: FeishuPostContent = JSON.parse(rawContent);

    // 遍历所有段落
    if (content.content && Array.isArray(content.content)) {
      const textParts: string[] = [];

      for (const paragraph of content.content) {
        if (!Array.isArray(paragraph)) continue;

        for (const node of paragraph) {
          const nodeText = extractNodeText(node);
          if (nodeText) {
            textParts.push(nodeText);
          }

          // 提取图片信息
          if (isImageNode(node)) {
            result.hasImages = true;
            result.images.push({
              imageKey: node.image_key,
              width: node.width,
              height: node.height,
            });
          }
        }

        // 段落之间添加换行
        if (textParts.length > 0) {
          textParts[textParts.length - 1] += '\n';
        }
      }

      result.text = textParts.join('').trim();
    }

    // 添加标题（如果有）
    if (content.title) {
      result.text = `${content.title}\n${result.text}`.trim();
    }
  } catch (e) {
    // JSON 解析失败，返回原始内容作为文本
    result.text = rawContent;
  }

  return result;
}

/**
 * 解析飞书图片消息（image 类型）
 */
export function parseImageContent(rawContent: string): ParsedFeishuMessage {
  const result: ParsedFeishuMessage = {
    text: '[图片]',
    hasImages: true,
    images: [],
    messageType: 'image',
  };

  try {
    const content: FeishuImageContent = JSON.parse(rawContent);

    if (content.image_key) {
      result.images.push({
        imageKey: content.image_key,
      });
    }
  } catch {
    // 解析失败，尝试从原始内容中提取 image_key
    const match = rawContent.match(/"image_key"\s*:\s*"([^"]+)"/);
    if (match) {
      result.images.push({
        imageKey: match[1],
      });
    }
  }

  return result;
}

/**
 * 解析飞书纯文本消息（text 类型）
 */
export function parseTextContent(rawContent: string): ParsedFeishuMessage {
  const result: ParsedFeishuMessage = {
    text: '',
    hasImages: false,
    images: [],
    messageType: 'text',
  };

  try {
    const content = JSON.parse(rawContent);
    result.text = content.text || '';
  } catch {
    result.text = rawContent;
  }

  return result;
}

/**
 * 统一解析飞书消息内容
 * 根据 message_type 自动选择解析方式
 */
export function parseFeishuMessage(
  messageType: string,
  rawContent: string,
): ParsedFeishuMessage {
  switch (messageType) {
    case 'post':
      return parsePostContent(rawContent);
    case 'image':
      return parseImageContent(rawContent);
    case 'text':
      return parseTextContent(rawContent);
    default:
      // 其他类型尝试作为文本解析
      return parseTextContent(rawContent);
  }
}

/**
 * 从富文本节点中提取文本
 */
function extractNodeText(node: FeishuPostContentNode): string {
  switch (node.tag) {
    case 'text':
      return node.text || '';
    case 'a':
      return node.text || '';
    case 'at':
      return node.text || `@${node.user_id}`;
    case 'code':
      return node.text || '';
    case 'img':
      return '[图片]';
    default:
      return '';
  }
}

/**
 * 检查是否为图片节点
 */
function isImageNode(node: FeishuPostContentNode): node is {
  tag: 'img';
  image_key: string;
  width?: number;
  height?: number;
} {
  return node.tag === 'img' && 'image_key' in node;
}
