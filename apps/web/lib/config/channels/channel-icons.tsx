import Image, { type StaticImageData } from 'next/image';

// Import SVG icons
import FeishuSvg from './icons/feishu.svg';
import TelegramSvg from './icons/telegram.svg';
import DiscordSvg from './icons/discord.svg';
import SlackSvg from './icons/slack.svg';
import WhatsAppSvg from './icons/whatsapp.svg';
import WeChatSvg from './icons/wechat.svg';
import LineSvg from './icons/line.svg';
import TeamsSvg from './icons/teams.svg';
import TwitterSvg from './icons/twitter.svg';
import FacebookSvg from './icons/facebook.svg';
import InstagramSvg from './icons/instagram.svg';
import SignalSvg from './icons/signal.svg';
import MatrixSvg from './icons/matrix.svg';
import GenericSvg from './icons/generic.svg';

interface ChannelIconProps {
  channelId: string;
  className?: string;
}

const iconMap: Record<string, StaticImageData> = {
  feishu: FeishuSvg,
  telegram: TelegramSvg,
  discord: DiscordSvg,
  slack: SlackSvg,
  whatsapp: WhatsAppSvg,
  wechat: WeChatSvg,
  line: LineSvg,
  teams: TeamsSvg,
  twitter: TwitterSvg,
  facebook: FacebookSvg,
  instagram: InstagramSvg,
  signal: SignalSvg,
  matrix: MatrixSvg,
};

export function ChannelIcon({ channelId, className }: ChannelIconProps) {
  const iconSrc = iconMap[channelId] || GenericSvg;

  return (
    <Image
      src={iconSrc}
      alt={channelId}
      className={className}
      width={16}
      height={16}
    />
  );
}
