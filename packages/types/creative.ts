

/**
 * 视频信息
 */
export type VideoInfo = {
    /** 视频标题 */
    title: string;
    /** 视频URL */
    video_url: string;
    /** 视频分镜数量 */
    shot_count: number;
    /** 视频时长（秒） */
    duration: number;
    /** 分镜列表 */
    shots: VideoShot[];
};


/**
 * 视频分镜信息
 */
export type VideoShot = {
    /** 开始时间（HH:MM:SS 格式） */
    start: string;
    /** 结束时间 */
    end: string;
    /** 时长（秒） */
    duration: number;
    /** 文案脚本 */
    script: string;
    /** 镜头的精细描述 */
    refined_description: string;
    /** 帧图片 URL */
    image: string;
    /** 可选，如：特写/全景/中景 */
    shot_type: string;
    /** 可选，如：推镜/摇镜/跟拍 */
    camera_movement: string;
    /** 可选，如：淡入/切换/叠化 */
    transition: string;
    /** 可选，镜头的核心意图 */
    core_theme: string;
    /** 可选，专业解读 */
    interpretation: string;
    /** 主体列表 */
    subjects: string[];
    /** 可选，环境描述 */
    environment: string;
    /** 可选，光线风格 */
    lighting: string;
    /** 可选，色调 */
    color_tone: string;
    /** 可选，情绪标签 */
    emotion: string;
    /** 可选，情绪强度 0-1 */
    mood_score: number;
    /** 可选，整体氛围 */
    atmosphere: string;
    /** 关键动作列表 */
    key_actions: string[];
    /** 素材搜索关键词 */
    search_keywords: string[];
    /** 可选，重要性 0-1 */
    importance: number;
    /** 可选，视觉复杂度 0-1 */
    visual_complexity: number;
};
