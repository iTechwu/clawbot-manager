import type { ChannelDefinition } from './types';

// Popular channels
export const feishu: ChannelDefinition = {
  id: 'feishu',
  label: '飞书/Lark',
  icon: '🪶',
  popular: true,
  tokenHint: '从飞书开放平台获取 Bot App ID 和 App Secret',
  tokenPlaceholder: 'cli_xxx...',
};

export const telegram: ChannelDefinition = {
  id: 'telegram',
  label: 'Telegram',
  icon: 'TG',
  popular: true,
  tokenHint: 'Get this from @BotFather on Telegram',
  tokenPlaceholder: '123456:ABC-DEF...',
};

export const discord: ChannelDefinition = {
  id: 'discord',
  label: 'Discord',
  icon: 'DC',
  popular: true,
  tokenHint: 'Get this from Discord Developer Portal',
  tokenPlaceholder: 'MTA2...',
};

// Other channels (alphabetical order)
export const bluesky: ChannelDefinition = {
  id: 'bluesky',
  label: 'Bluesky',
  icon: 'BS',
  popular: false,
  tokenHint: 'Bluesky App Password',
  tokenPlaceholder: 'xxxx-xxxx-xxxx-xxxx',
};

export const email: ChannelDefinition = {
  id: 'email',
  label: 'Email',
  icon: 'EM',
  popular: false,
  tokenHint: 'SMTP/IMAP credentials',
  tokenPlaceholder: 'Password...',
};

export const facebook: ChannelDefinition = {
  id: 'facebook',
  label: 'Facebook Messenger',
  icon: 'FB',
  popular: false,
  tokenHint: 'Facebook Page Access Token',
  tokenPlaceholder: 'EAAx...',
};

export const googlechat: ChannelDefinition = {
  id: 'googlechat',
  label: 'Google Chat',
  icon: 'GC',
  popular: false,
  tokenHint: 'Google Cloud service account JSON key',
  tokenPlaceholder: 'Service account key...',
};

export const instagram: ChannelDefinition = {
  id: 'instagram',
  label: 'Instagram',
  icon: 'IG',
  popular: false,
  tokenHint: 'Instagram API access token',
  tokenPlaceholder: 'IGQ...',
};

export const irc: ChannelDefinition = {
  id: 'irc',
  label: 'IRC',
  icon: 'IR',
  popular: false,
  tokenHint: 'IRC server password (optional)',
  tokenPlaceholder: 'Password (optional)...',
};

export const kik: ChannelDefinition = {
  id: 'kik',
  label: 'Kik',
  icon: 'KK',
  popular: false,
  tokenHint: 'Kik Bot API key',
  tokenPlaceholder: 'API key...',
};

export const line: ChannelDefinition = {
  id: 'line',
  label: 'LINE',
  icon: 'LN',
  popular: false,
  tokenHint: 'LINE Channel Access Token',
  tokenPlaceholder: 'Bearer token...',
};

export const mastodon: ChannelDefinition = {
  id: 'mastodon',
  label: 'Mastodon',
  icon: 'MD',
  popular: false,
  tokenHint: 'Mastodon access token from your instance',
  tokenPlaceholder: 'Access token...',
};

export const matrix: ChannelDefinition = {
  id: 'matrix',
  label: 'Matrix',
  icon: 'MX',
  popular: false,
  tokenHint: 'Matrix access token for your bot user',
  tokenPlaceholder: 'syt_...',
};

export const mattermost: ChannelDefinition = {
  id: 'mattermost',
  label: 'Mattermost',
  icon: 'MM',
  popular: false,
  tokenHint: 'Mattermost Bot Access Token',
  tokenPlaceholder: 'Bot token...',
};

export const nostr: ChannelDefinition = {
  id: 'nostr',
  label: 'Nostr',
  icon: 'NS',
  popular: false,
  tokenHint: 'Nostr private key (nsec)',
  tokenPlaceholder: 'nsec1...',
};

export const reddit: ChannelDefinition = {
  id: 'reddit',
  label: 'Reddit',
  icon: 'RD',
  popular: false,
  tokenHint: 'Reddit API credentials (client_id:secret)',
  tokenPlaceholder: 'client_id:client_secret',
};

export const rocketchat: ChannelDefinition = {
  id: 'rocketchat',
  label: 'Rocket.Chat',
  icon: 'RC',
  popular: false,
  tokenHint: 'Rocket.Chat Personal Access Token',
  tokenPlaceholder: 'Token...',
};

export const signal: ChannelDefinition = {
  id: 'signal',
  label: 'Signal',
  icon: 'SG',
  popular: false,
  tokenHint: 'Signal API credentials',
  tokenPlaceholder: 'signal-...',
};

export const slack: ChannelDefinition = {
  id: 'slack',
  label: 'Slack',
  icon: 'SL',
  popular: false,
  tokenHint: 'Bot User OAuth Token from Slack App settings',
  tokenPlaceholder: 'xoxb-...',
};

export const sms: ChannelDefinition = {
  id: 'sms',
  label: 'SMS (Twilio)',
  icon: 'SM',
  popular: false,
  tokenHint: 'Twilio Auth Token',
  tokenPlaceholder: 'Auth token...',
};

export const teams: ChannelDefinition = {
  id: 'teams',
  label: 'Microsoft Teams',
  icon: 'MS',
  popular: false,
  tokenHint: 'Microsoft Bot Framework credentials',
  tokenPlaceholder: 'Bot Framework App ID...',
};

export const twitch: ChannelDefinition = {
  id: 'twitch',
  label: 'Twitch',
  icon: 'TW',
  popular: false,
  tokenHint: 'Twitch OAuth token from Developer Console',
  tokenPlaceholder: 'oauth:...',
};

export const twitter: ChannelDefinition = {
  id: 'twitter',
  label: 'Twitter/X',
  icon: 'X',
  popular: false,
  tokenHint: 'Twitter API Bearer Token from Developer Portal',
  tokenPlaceholder: 'AAAAAAA...',
};

export const viber: ChannelDefinition = {
  id: 'viber',
  label: 'Viber',
  icon: 'VB',
  popular: false,
  tokenHint: 'Viber Bot API authentication token',
  tokenPlaceholder: 'Auth token...',
};

export const web: ChannelDefinition = {
  id: 'web',
  label: 'Web Chat',
  icon: 'WB',
  popular: false,
  tokenHint: 'API key for web widget authentication',
  tokenPlaceholder: 'API key...',
};

export const webex: ChannelDefinition = {
  id: 'webex',
  label: 'Webex',
  icon: 'WX',
  popular: false,
  tokenHint: 'Webex Bot Access Token',
  tokenPlaceholder: 'Access token...',
};

export const webhook: ChannelDefinition = {
  id: 'webhook',
  label: 'Webhook',
  icon: 'WH',
  popular: false,
  tokenHint: 'Webhook secret for request validation',
  tokenPlaceholder: 'Secret...',
};

export const wechat: ChannelDefinition = {
  id: 'wechat',
  label: 'WeChat',
  icon: 'WC',
  popular: false,
  tokenHint: 'WeChat Official Account access token',
  tokenPlaceholder: 'Access token...',
};

export const whatsapp: ChannelDefinition = {
  id: 'whatsapp',
  label: 'WhatsApp',
  icon: 'WA',
  popular: false,
  tokenHint: 'WhatsApp Business API access token',
  tokenPlaceholder: 'EAAx...',
};

export const xmpp: ChannelDefinition = {
  id: 'xmpp',
  label: 'XMPP/Jabber',
  icon: 'XM',
  popular: false,
  tokenHint: 'XMPP password for bot account',
  tokenPlaceholder: 'Password...',
};

export const zulip: ChannelDefinition = {
  id: 'zulip',
  label: 'Zulip',
  icon: 'ZU',
  popular: false,
  tokenHint: 'Zulip Bot API key',
  tokenPlaceholder: 'API key...',
};
