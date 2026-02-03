/**
 * 图标提供者系统
 * 用于动态加载和管理 SVG 图标
 * 迁移自 Vue 项目的 getSVGLogo 系统
 *
 * Next.js 标准用法：
 * 1. 图标文件存储在 public/icons/ 目录
 * 2. 使用动态路径加载 SVG
 * 3. 支持 className 和其他 SVG 属性
 * 4. 使用内联 SVG 标签而不是 img 标签，以便更好地控制颜色和样式
 */

import React, { useState, useEffect } from 'react';

// 图标名称类型（根据实际使用的图标动态扩展）
export type IconName = string;

/**
 * SVG 图标组件
 * 用于动态加载 SVG 图标文件并内联渲染
 *
 * @example
 * ```tsx
 * <SVGIcon name="more" className="w-5 h-5" />
 * ```
 */
interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  className?: string;
  width?: number | string;
  height?: number | string;
}

// SVG 内容缓存
const svgCache = new Map<string, string>();

/**
 * 动态加载 SVG 图标内容
 * 在 Next.js 中，SVG 文件存储在 public 目录下可以直接访问
 */
export function SVGIcon({
  name,
  className,
  width,
  height,
  ...props
}: SVGIconProps) {
  // 先检查映射表，如果找到映射就使用映射后的路径
  const mappedName = ICON_PATH_MAP[name] || name;

  // 构建图标路径 - 支持嵌套目录结构
  // 例如: sidebar/更多.svg -> /icons/sidebar/更多.svg
  // 或者: more.svg -> /icons/more.svg
  const iconPath = `/icons/${mappedName}.svg`;

  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 检查缓存
    if (svgCache.has(iconPath)) {
      const cachedContent = svgCache.get(iconPath);
      if (cachedContent) {
        setSvgContent(cachedContent);
        setIsLoading(false);
        return;
      }
    }

    // 加载 SVG 内容
    fetch(iconPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${iconPath}`);
        }
        return response.text();
      })
      .then((text) => {
        // 处理 SVG 内容，移除 width 和 height 属性以便通过 className 控制大小
        let processedSvg = text
          .replace(/width="[^"]*"/gi, '')
          .replace(/height="[^"]*"/gi, '');

        // 处理 SVG 中使用 CSS 类的情况（如 .b{fill:currentColor}）
        // 将使用这些类的元素转换为内联 fill 属性，确保颜色能够正确应用
        // 匹配 <style> 标签中的类定义，如 .b{fill:currentColor;}
        const styleMatch = processedSvg.match(/<style[^>]*>([^<]*)<\/style>/i);
        if (styleMatch) {
          const styleContent = styleMatch[1];
          // 提取所有定义了 fill:currentColor 的类名
          const currentColorClasses =
            styleContent &&
            styleContent.match(
              /\.([a-zA-Z0-9_-]+)\s*\{[^}]*fill:\s*currentColor[^}]*\}/gi,
            );
          if (currentColorClasses) {
            currentColorClasses.forEach((classRule) => {
              const classNameMatch = classRule.match(/\.([a-zA-Z0-9_-]+)/);
              if (classNameMatch) {
                const className = classNameMatch[1];
                // 将使用该类的元素的 class 属性替换为内联 fill="currentColor"
                processedSvg = processedSvg.replace(
                  new RegExp(`class="${className}"`, 'gi'),
                  'fill="currentColor"',
                );
                // 处理同时有多个类的情况，如 class="a b"
                processedSvg = processedSvg.replace(
                  new RegExp(
                    `class="([^"]*\\s+)?${className}(\\s+[^"]*)?"`,
                    'gi',
                  ),
                  (match, before, after) => {
                    const newClasses = [before?.trim(), after?.trim()]
                      .filter(Boolean)
                      .join(' ');
                    return newClasses
                      ? `class="${newClasses}" fill="currentColor"`
                      : 'fill="currentColor"';
                  },
                );
              }
            });
          }
        }

        // 处理内联的 fill 属性（非 none 且非 currentColor 的）
        processedSvg = processedSvg.replace(
          /fill="(?!none|currentColor)[^"]*"/gi,
          'fill="currentColor"',
        );

        // 处理内联的 stroke 属性（非 none 且非 currentColor 的）
        processedSvg = processedSvg.replace(
          /stroke="(?!none|currentColor)[^"]*"/gi,
          'stroke="currentColor"',
        );

        // 缓存 SVG 内容（保留原始结构，只移除尺寸属性并处理颜色）
        svgCache.set(iconPath, processedSvg);
        setSvgContent(processedSvg);
        setIsLoading(false);
      })
      .catch((error) => {
        console.warn(`Icon not found: ${iconPath}`, error);
        setHasError(true);
        setIsLoading(false);
      });
  }, [iconPath]);

  if (isLoading) {
    // 加载中显示占位符
    return (
      <svg
        className={className}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
      </svg>
    );
  }

  if (hasError || !svgContent) {
    // 加载失败显示占位符
    return (
      <svg
        className={className}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
      </svg>
    );
  }

  // 解析 SVG 内容并提取 viewBox
  const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // 提取 SVG 内部内容（去除 <svg> 开始和结束标签）
  const innerContent = svgContent
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>/i, '')
    .trim();

  // 确保 SVG 中的 CSS 类能够正确应用 currentColor
  // 如果 SVG 使用了 <style> 标签，确保 currentColor 被正确应用
  // 同时，如果元素使用了 class 属性，确保这些类能够正确响应 currentColor
  // 对于使用 class="b" 且 CSS 中定义了 .b{fill:currentColor} 的情况，这应该能正常工作
  // 但如果 SVG 中有硬编码的颜色值，我们需要确保它们被替换为 currentColor

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: 'inherit' }} // 确保 SVG 继承父元素的颜色
      {...props}
      dangerouslySetInnerHTML={{ __html: innerContent }}
    />
  );
}

/**
 * 获取 SVG 图标组件（兼容 Vue 项目的 getSVGLogo）
 * 类似于 Vue 项目中的 getSVGLogo 函数
 *
 * @example
 * ```tsx
 * const MoreIcon = getSVGIcon('more');
 * <MoreIcon className="w-5 h-5" />
 * ```
 */
export function getSVGIcon(
  name: IconName,
): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  const IconComponent = (props: React.SVGProps<SVGSVGElement>) => (
    <SVGIcon name={name} {...props} />
  );
  IconComponent.displayName = `SVGIcon(${name})`;
  return IconComponent;
}

/**
 * 图标路径映射表
 * 用于将 Vue 项目中的图标名称映射到实际的文件路径
 * 这个映射表可以根据实际使用的图标进行扩展
 */
/**
 * 图标路径映射表
 * 用于将 Vue 项目中的图标名称映射到实际的文件路径
 * 这个映射表可以根据实际使用的图标进行扩展
 *
 * 注意：图标路径应该与实际文件路径匹配（不包含 .svg 扩展名）
 */
export const ICON_PATH_MAP: Record<string, string> = {
  // 常用图标
  more: 'sidebar/更多',
  logo: 'sidebar/logo',
  refresh: 'refresh',
  refreshHover: 'refresh-hover',
  close: 'close',
  uploadImage: 'upload-image',
  removeImage: 'removeImg',
  play: 'sidebar/播放',
  playVideo: 'play-video',
  edit: 'edit',
  delete: 'sidebar/删除',
  download: 'download',
  forward: 'sidebar/转发',
  arrowDown: 'arrow-down',
  arrowLeft: 'icon-arrow-left',
  iconArrowRight: 'icon-arrow-right',
  createScript: 'createScript',
  aiWritingAssistant: 'ai-writing-assistant',
  riskCheck: 'riskcheck',
  importClip: 'importClip',
  drag: 'drag',
  removeShot: 'delete-shot',
  addShot: 'add-shot',
  noMaterial: 'no-materials',
  NoData: 'data-center/no-data',
  noData: 'data-center/no-data',
  uploadMaterial: 'uploadMaterial',
  copyGraphicsText: 'copy-graphics-text',
  back: 'editor/back',
  editTitle: 'editor/edit-title',
  videoPlay: 'editor/video-play',
  configRight: 'editor/config-right',
  addTransition: 'editor/add-transition',
  revocation: 'editor/revocation',
  iconCut: 'editor/cut',
  iconCopy: 'editor/copy',
  iconDelete: 'editor/delete',
  addToTrack: 'editor/add-to-track',
  addToTrackHover: 'editor/add-to-track-hover',
  deleteMaterial: 'editor/delete-material',
  deleteMaterialHover: 'editor/delete-material-hover',
  rotation: 'editor/rotation',
  freeTransform: 'editor/free-transform',
  transition: 'editor/transition',
  switchTimbre: 'editor/switch-timbre',
  iconSaveMaterial: 'material/icon-save-material',
  iconMore: 'material/icon-more',
  iconForward: 'material/icon-forward',
  iconInviteMember: 'material/icon-invite-member',
  iconNetworkUnactive: 'material/icon-network-unactive',
  iconStarUnactive: 'material/icon-star-unactive',
  iconModifyTag: 'material/icon-modify-tag',
  iconMaterialGenerate: 'material/icon-material-generate',
  iconToTagView: 'material/icon-to-tag-view',
  iconInternetMaterial: 'material/icon-internet-material',
  iconSaveToSpace: 'material/icon-save-to-space',
  iconHelp: 'material/icon-help',
  iconAnalysis: 'material/icon-analysis',
  iconWarning: 'material/icon-warning',
  iconMoveFile: 'material/icon-move-file',
  iconFileInfoOutline: 'material/icon-fileinfo-outline',
  userAddPlus: 'user-add-plus',
  folder: 'folder',
  newFolder: 'new-folder',
  uploadFile: 'upload-file',
  materialGen: 'material-gen',
  inviteMember: 'invite-member',
  copyContent: 'copy-content',
  scrollLeft: 'scroll-left',
  scrollRight: 'scroll-right',
  star: 'star',
  starHover: 'star-hover',
  copyCopywriter: 'copy-copywriter',
  copyCopywriterHover: 'copy-copywriter-hover',
  generate: 'generate-now',
  pick: 'pick',
  douyin: 'douyin',
  xiaohongshu: 'xiaohongshu',
  check: 'check',
  script: 'script',
  hashRate: 'hashrate',
  likeCount: 'like-count',
  arrowLeftPurple: 'arrow-left-purple',
  sceneDraggable: 'scene-draggable',
  videoParseUnlock: 'video-parse',
  videoParseCost: 'video-parse-cost',
  deepThinking: 'agents/deep-thinking',
  dubbingPlay: 'agents/dubbing-play',
  dubbingPause: 'agents/dubbing-pause',
  dubbingPlayHover: 'agents/dubbing-play-hover',
  dubbingPauseHover: 'agents/dubbing-pause-hover',
  intelligentDubbing: 'agents/intelligent-dubbing',
  chatHistory: 'agents/chat-history',
  timeFilter: 'agents/time-filter',
  personalData: 'home/personal-data',
  logout: 'home/logout',
  personalDataHover: 'home/personal-data-hover',
  logoutHover: 'home/logout-hover',
  customerServiceHover: 'home/customer-service-hover',
  uploadTaskListHover: 'home/upload-task-list-hover',
  sortedHover: 'data-center/sorted-hover',
  sortedActive: 'data-center/sorted-active',
  arrowRightHover: 'home/arrow-right-hover',
  toolTipI: 'tool-tip-i',
  aiWrite: 'ai-write',
  filter: 'filter',
  tooltip: 'tool-tip',
  dateSelector: 'dateSelector',
  datePicker: 'datepicker',
  projectNewProjectFile: 'project/new-project-file',
  projectNewFolder: 'project/new-folder',
  projectUploadFolder: 'project/upload-folder',
  projectUploadFile: 'project/upload-file',
  projectMaterialGeneration: 'project/material-generation',
  iconFilter: 'editor/filter',
  filterChecked: 'editor/filter-checked',
  effect: 'editor/effect',
  effectChecked: 'editor/effect-checked',
  materials: 'editor/materials',
  materialChecked: 'editor/material-checked',
  subtitle: 'editor/subtitle',
  subtitleChecked: 'editor/subtitle-config-checked',
  title: 'editor/title-config',
  titleChecked: 'editor/title-config-checked',
  videoConfig: 'editor/video-config',
  videoChecked: 'editor/video-config-checked',
  iconCover: 'editor/icon-cover',
  iconAddShot: 'editor/icon-add-shot',
  iconTooltip: 'editor/icon-tooltip',
  // 上传图标
  upload: 'sidebar/上传',
};
