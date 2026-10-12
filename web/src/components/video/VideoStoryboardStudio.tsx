// ==============================================================================
// 企业商业级 AI 视频分镜与跨模型提示词工坊 (Cinematic Video Storyboard Studio)
// 将小说场景深度解构为影视级电影分镜，输出标准生产载荷支持可灵、Sora、Runway、海螺等平台
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Film,
  Video,
  Play,
  Pause,
  Download,
  Copy,
  Plus,
  Trash2,
  Sparkles,
  Camera,
  Layers,
  Wand2,
  Sliders,
  Maximize2,
  Check,
  ChevronRight,
  Clock,
  Volume2,
  Tv,
  FileCode,
  Share2,
} from 'lucide-react';

export type ShotType = 'EXTREME_CLOSE_UP' | 'CLOSE_UP' | 'MEDIUM' | 'WIDE' | 'AERIAL';
export type CameraMovement =
  | 'DOLLY_IN'
  | 'DOLLY_OUT'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'TRACKING'
  | 'ORBIT'
  | 'VERTIGO_ZOOM'
  | 'STATIC';
export type VideoPlatform =
  | 'KLING'
  | 'SORA'
  | 'RUNWAY_GEN3'
  | 'HAILUO_MINIMAX'
  | 'MIDJOURNEY'
  | 'COMFYUI_JSON';

export interface VideoShotItem {
  id: string;
  shot_number: number;
  duration_seconds: number;
  shot_type: ShotType;
  camera_movement: CameraMovement;
  visual_prompt: string;
  motion_prompt: string;
  negative_prompt: string;
  lighting: string;
  character_references: string[];
  sound_cue: string;
  dialogue_cue: string;
}

export const VideoStoryboardStudio: React.FC = () => {
  const { novel, activeChapter, activeScene } = useNovel();

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '2.39:1'>('16:9');
  const [targetPlatform, setTargetPlatform] = useState<VideoPlatform>('KLING');
  const [selectedShotId, setSelectedShotId] = useState<string>('shot-1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 初始企业级分镜数据（以小说高潮冲突场景为例）
  const [shots, setShots] = useState<VideoShotItem[]>([
    {
      id: 'shot-1',
      shot_number: 1,
      duration_seconds: 5,
      shot_type: 'WIDE',
      camera_movement: 'DOLLY_IN',
      visual_prompt:
        '浩瀚夜幕下，天绝深谷孤峰耸立，漫天赤色雷霆如蛛网般在墨云深处翻滚奔涌。残破的古剑宗石碑半掩于碎石之中，青苔与血渍斑驳。',
      motion_prompt:
        '镜头沿碎石峡谷向前平稳推进，云层中雷光间歇性闪烁爆亮，狂风卷起碎石残叶迎面扑来。',
      negative_prompt:
        'distorted anatomy, low resolution, blurry, flickering, extra limbs, bad hands, artifacts, 3D render look',
      lighting: '暗黑悬疑冷光底色，伴随赤红色闪电骤亮形成的超高动态反差轮廓光。',
      character_references: ['林越（玄黑劲装）'],
      sound_cue: '远空低沉滚雷轰鸣，狂风呼啸穿过峡谷岩缝的凄厉风啸。',
      dialogue_cue: '（画外旁白）：三万年天道死局，终归要在此地分个分晓。',
    },
    {
      id: 'shot-2',
      shot_number: 2,
      duration_seconds: 4,
      shot_type: 'MEDIUM',
      camera_movement: 'TRACKING',
      visual_prompt:
        '主角林越手持一柄裂纹古剑立于悬崖边缘，玄色衣袍在狂风中猎猎作响。他左肩伤口渗出血迹，但眼神冷如寒潭孤星。',
      motion_prompt:
        '侧面平行跟随运镜，林越缓缓拔剑出鞘半寸，剑身青铜残片亮起幽蓝色晦暗符文微光。',
      negative_prompt:
        'blurry face, mutated fingers, plastic skin, oversaturated, deformed body',
      lighting: '剑身散发的幽蓝灵光照亮主角冷峻的下颌线，背后是黑云滚滚的深渊。',
      character_references: ['林越'],
      sound_cue: '长剑出鞘的金铁清鸣，伴随真元摩擦产生的低频蜂鸣。',
      dialogue_cue: '林越（低沉冷笑）：“夜枭，你追了三千里，就是为了这块烂铜片？”',
    },
    {
      id: 'shot-3',
      shot_number: 3,
      duration_seconds: 5,
      shot_type: 'CLOSE_UP',
      camera_movement: 'ORBIT',
      visual_prompt:
        '反派夜枭的身影在十丈外血雾中若隐若现，苍白的面容笼罩在猩红兜帽阴影下，指尖正盘旋着三枚森然白骨短刃。',
      motion_prompt:
        '半圆弧形环绕运镜，血雾自四周向中央聚拢，夜枭嘴角勾起一抹残忍轻蔑的弧度，指尖骨刃骤然提速飞旋。',
      negative_prompt: 'deformed face, cross-eyed, low quality, artifacts',
      lighting: '浓烈猩红血煞微光与环境阴暗对冲，强烈的戏剧化背光轮廓。',
      character_references: ['夜枭'],
      sound_cue: '血雾翻腾的黏腻声，白骨飞刃划破空气的高频破空锐响。',
      dialogue_cue: '夜枭：“林师弟，交出来，师兄留你一具全尸。”',
    },
    {
      id: 'shot-4',
      shot_number: 4,
      duration_seconds: 6,
      shot_type: 'EXTREME_CLOSE_UP',
      camera_movement: 'VERTIGO_ZOOM',
      visual_prompt:
        '极度特写：林越眼眸瞳孔急速收缩，青铜古剑彻底出鞘，古朴篆文如星河爆发，虚空被凌厉剑气撕裂出一道漆黑裂隙。',
      motion_prompt:
        '镜头执行急速希区柯克变焦（背景向后拉远、瞳孔急速压迫推进），刺目光华自剑锋瞬间炸裂，冲击波震碎四周落石。',
      negative_prompt: 'motion blur distortion, washed out, artifacts',
      lighting: '剑芒爆发瞬间的全屏高色温强白光与冷蓝光晕交织。',
      character_references: ['林越'],
      sound_cue: '万千剑鸣汇聚如海啸暴击，空间震碎的沉闷轰隆。',
      dialogue_cue: '林越：“太虚斩道——破！”',
    },
  ]);

  const activeShot = shots.find((s) => s.id === selectedShotId) || shots[0];
  const totalDuration = shots.reduce((sum, s) => sum + s.duration_seconds, 0);

  // 播放模拟计时器
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // 根据当前播放时间映射到对应的 shot
  useEffect(() => {
    let accumulated = 0;
    for (const s of shots) {
      accumulated += s.duration_seconds;
      if (playbackTime < accumulated) {
        setSelectedShotId(s.id);
        break;
      }
    }
  }, [playbackTime, shots]);

  const handleAddShot = () => {
    const newIdx = shots.length + 1;
    const newShot: VideoShotItem = {
      id: `shot-${Date.now()}`,
      shot_number: newIdx,
      duration_seconds: 5,
      shot_type: 'MEDIUM',
      camera_movement: 'DOLLY_IN',
      visual_prompt: '新场景分镜：描述人物关键动作、环境光影、情绪气氛与构图视点。',
      motion_prompt: '动态运镜演变：镜头推进、主体移动与环境互动细节。',
      negative_prompt:
        'distorted limbs, blurry, low resolution, bad hands, artifacts, unnatural anatomy',
      lighting: '电影级体积光与高对比轮廓光',
      character_references: ['主角'],
      sound_cue: '环境音效与背景情绪音轨',
      dialogue_cue: '台词或旁白细节',
    };
    setShots([...shots, newShot]);
    setSelectedShotId(newShot.id);
  };

  const handleDeleteShot = (id: string) => {
    if (shots.length <= 1) return;
    const filtered = shots.filter((s) => s.id !== id);
    // 重排 shot_number
    const reordered = filtered.map((s, idx) => ({ ...s, shot_number: idx + 1 }));
    setShots(reordered);
    setSelectedShotId(reordered[0].id);
  };

  const handleUpdateActiveShot = (field: keyof VideoShotItem, value: any) => {
    setShots(
      shots.map((s) => (s.id === activeShot.id ? { ...s, [field]: value } : s))
    );
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 生成不同平台的专属导出文本
  const generateExportContent = (platform: VideoPlatform): string => {
    if (platform === 'KLING') {
      const payload = {
        generator: 'NovManager-Cinematic-Engine',
        model_target: 'Kling-v1.5-Pro',
        aspect_ratio: aspectRatio,
        shots_count: shots.length,
        total_duration_sec: totalDuration,
        shots_sequence: shots.map((s) => ({
          shot_index: s.shot_number,
          duration_sec: s.duration_seconds,
          camera_movement: s.camera_movement.toLowerCase(),
          prompt: `${s.visual_prompt} | ${s.motion_prompt} | ${s.lighting}`,
          negative_prompt: s.negative_prompt,
        })),
      };
      return JSON.stringify(payload, null, 2);
    }

    if (platform === 'SORA') {
      let cumTime = 0;
      const seq = shots.map((s) => {
        const startT = `${Math.floor(cumTime / 60)
          .toString()
          .padStart(2, '0')}:${(cumTime % 60).toString().padStart(2, '0')}`;
        cumTime += s.duration_seconds;
        const endT = `${Math.floor(cumTime / 60)
          .toString()
          .padStart(2, '0')}:${(cumTime % 60).toString().padStart(2, '0')}`;
        return {
          shot_id: `Shot-${s.shot_number.toString().padStart(2, '0')}`,
          timestamp: `${startT} - ${endT}`,
          visual_description: s.visual_prompt,
          camera_direction: s.camera_movement,
          cinematography_lighting: s.lighting,
          audio_sfx_cue: s.sound_cue,
          dialogue: s.dialogue_cue,
        };
      });
      return JSON.stringify(
        { project: novel.title || 'NovManager', sequence: seq },
        null,
        2
      );
    }

    if (platform === 'RUNWAY_GEN3') {
      return shots
        .map(
          (s) =>
            `Shot ${s.shot_number} (${s.duration_seconds}s): [Camera: ${s.camera_movement.replace('_', ' ').toLowerCase()}] ${s.visual_prompt}. ${s.motion_prompt}. Lighting: ${s.lighting} --ar ${aspectRatio}`
        )
        .join('\n\n');
    }

    if (platform === 'MIDJOURNEY') {
      return shots
        .map(
          (s) =>
            `/imagine prompt: cinematic keyframe, shot ${s.shot_number}, ${s.visual_prompt}, ${s.lighting}, shot type: ${s.shot_type.toLowerCase()} --ar ${aspectRatio} --style raw --v 6.1 --s 250`
        )
        .join('\n\n');
    }

    if (platform === 'HAILUO_MINIMAX') {
      return shots
        .map(
          (s) =>
            `【镜头${s.shot_number} (${s.duration_seconds}秒)】高稳定性写实动作：${s.visual_prompt}。动态指令：${s.motion_prompt}。运镜轨迹：${s.camera_movement}。`
        )
        .join('\n\n');
    }

    // COMFYUI_JSON
    const nodes = shots.map((s, idx) => ({
      node_id: idx + 1,
      class_type: 'KSamplerAdvanced',
      inputs: {
        positive_prompt: `${s.visual_prompt}, ${s.lighting}`,
        negative_prompt: s.negative_prompt,
        aspect_ratio: aspectRatio,
        steps: 30,
        cfg: 7.0,
      },
    }));
    return JSON.stringify({ comfyui_video_pipeline: nodes }, null, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="studio-container">
        {/* 顶部标题栏与全局控制栏 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Film className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                AI 影视分镜与多模型提示词工坊
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5 font-mono font-medium">
                Cinematic Engine v2.0
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              将当前小说手稿场景智能解构为工业级电影分镜序列，一键生成支持可灵、Sora、Runway、海螺等大模型的标准提示词。
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* 画幅比选择 */}
            <div className="flex items-center rounded-xl p-1 border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              {(['16:9', '9:16', '2.39:1'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                    aspectRatio === ratio
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'hover:opacity-80'
                  }`}
                  style={{ color: aspectRatio === ratio ? '#ffffff' : 'var(--text-muted)' }}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* 一键导出跨平台指令 */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              导出跨模型提示词
            </button>
          </div>
        </div>

        {/* 主视窗区：左侧影视运镜预览播放器 + 右侧分镜属性调校控台 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* 左侧：电影视窗与时间轴序列 (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* 电影监视器视窗 (Cinema Monitor) */}
            <div className="cinema-card overflow-hidden flex flex-col">
              {/* 监视器顶部状态条 */}
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs font-mono text-stone-400 bg-black/40">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    REC [CAM A]
                  </span>
                  <span>SHOT {activeShot.shot_number.toString().padStart(2, '0')}</span>
                  <span>{activeShot.shot_type}</span>
                  <span>{activeShot.camera_movement}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {Math.floor(playbackTime / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(playbackTime % 60).toString().padStart(2, '0')} /{' '}
                    {Math.floor(totalDuration / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(totalDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* 画面拟真模拟视口 */}
              <div
                className="relative flex items-center justify-center p-8 min-h-[340px] bg-gradient-to-b from-stone-900 to-black overflow-hidden select-none"
                style={{
                  aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '2.39/1',
                }}
              >
                {/* 构图辅助十字线与安全框 */}
                <div className="absolute inset-4 border border-white/10 pointer-events-none rounded-lg" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 border border-white/15 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-amber-400/80 rounded-full" />
                  </div>
                </div>

                {/* 动态运镜轨迹水波 */}
                <div className="text-center z-10 max-w-lg px-6 py-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                  <div className="text-xs uppercase tracking-widest text-amber-400 font-mono mb-2">
                    {activeShot.camera_movement} • {activeShot.shot_type}
                  </div>
                  <p className="text-sm leading-relaxed text-stone-200 font-medium">
                    {activeShot.visual_prompt}
                  </p>
                  {activeShot.dialogue_cue && (
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs italic text-amber-200/90">
                      💬 {activeShot.dialogue_cue}
                    </div>
                  )}
                </div>

                {/* 底部浮水印 */}
                <div className="absolute bottom-3 right-4 text-[10px] font-mono text-white/30 tracking-wider">
                  NOV-AI CINE ENGINE • {aspectRatio}
                </div>
              </div>

              {/* 播放控制与时间轴进度条 */}
              <div className="p-4 bg-black/50 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                {/* 时间轴进度条 */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative cursor-pointer">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${totalDuration ? (playbackTime / totalDuration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-stone-400">
                    <span>
                      镜头 {activeShot.shot_number} / {shots.length}
                    </span>
                    <span>总时长: {totalDuration} 秒</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPlaybackTime(0);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-stone-300 hover:bg-white/10 border border-white/10 transition"
                >
                  重置
                </button>
              </div>
            </div>

            {/* 分镜卡片序列列表 (Horizontal / Grid timeline) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-main)' }}>
                  分镜镜头序列 ({shots.length} 个镜头 • 累计 {totalDuration}s)
                </h3>
                <button
                  onClick={handleAddShot}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新建镜头
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {shots.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedShotId(s.id)}
                    className={`literary-card p-4 cursor-pointer relative group transition ${
                      s.id === selectedShotId
                        ? 'ring-2 ring-amber-500 shadow-md'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        SHOT #{s.shot_number}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-stone-400">
                          {s.duration_seconds}s
                        </span>
                        {shots.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteShot(s.id);
                            }}
                            className="p-1 rounded text-red-500/60 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-medium mb-1.5 line-clamp-2" style={{ color: 'var(--text-main)' }}>
                      {s.visual_prompt}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 mt-2">
                      <span className="px-1.5 py-0.5 rounded bg-stone-500/10">
                        {s.shot_type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-stone-500/10">
                        {s.camera_movement}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：单镜头工业级属性调校控台 (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="literary-card">
              <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                    镜头 #{activeShot.shot_number} 工业级参数调校
                  </h3>
                </div>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {activeShot.duration_seconds} 秒
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* 景别与时长 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      镜头景别 (Shot Type)
                    </label>
                    <select
                      value={activeShot.shot_type}
                      onChange={(e) => handleUpdateActiveShot('shot_type', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      <option value="EXTREME_CLOSE_UP">大特写 (Extreme Close-Up)</option>
                      <option value="CLOSE_UP">近景 (Close-Up)</option>
                      <option value="MEDIUM">中景 (Medium Shot)</option>
                      <option value="WIDE">全景 (Wide Shot)</option>
                      <option value="AERIAL">航拍全景 (Aerial View)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      运镜方式 (Camera Motion)
                    </label>
                    <select
                      value={activeShot.camera_movement}
                      onChange={(e) => handleUpdateActiveShot('camera_movement', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      <option value="DOLLY_IN">推进 (Dolly In)</option>
                      <option value="DOLLY_OUT">拉远 (Dolly Out)</option>
                      <option value="PAN_LEFT">左摇 (Pan Left)</option>
                      <option value="PAN_RIGHT">右摇 (Pan Right)</option>
                      <option value="TRACKING">平移跟随 (Tracking)</option>
                      <option value="ORBIT">环绕旋转 (Orbit)</option>
                      <option value="VERTIGO_ZOOM">希区柯克变焦 (Vertigo Zoom)</option>
                      <option value="STATIC">静止固定 (Static)</option>
                    </select>
                  </div>
                </div>

                {/* 镜头时长滑块 */}
                <div>
                  <div className="flex justify-between font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>镜头时长</span>
                    <span className="font-mono">{activeShot.duration_seconds} 秒</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    value={activeShot.duration_seconds}
                    onChange={(e) => handleUpdateActiveShot('duration_seconds', parseInt(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>

                {/* 画面提示词 (Visual Prompt) */}
                <div>
                  <label className="block font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    画面视觉描述 (Visual Prompt)
                  </label>
                  <textarea
                    rows={4}
                    value={activeShot.visual_prompt}
                    onChange={(e) => handleUpdateActiveShot('visual_prompt', e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs bg-transparent leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    placeholder="精细描绘镜头起始帧画面构图、主体外貌细节、光影氛围..."
                  />
                </div>

                {/* 动态演变提示词 (Motion Prompt) */}
                <div>
                  <label className="block font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    动作演变与物理动态 (Motion Dynamics)
                  </label>
                  <textarea
                    rows={2}
                    value={activeShot.motion_prompt}
                    onChange={(e) => handleUpdateActiveShot('motion_prompt', e.target.value)}
                    className="w-full p-3 rounded-xl border text-xs bg-transparent leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    placeholder="描述主体动态变化、镜头运动轨迹与环境交互..."
                  />
                </div>

                {/* 光影视效与氛围 */}
                <div>
                  <label className="block font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    光影视效调色 (Cinematography & Lighting)
                  </label>
                  <input
                    type="text"
                    value={activeShot.lighting}
                    onChange={(e) => handleUpdateActiveShot('lighting', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-transparent"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    placeholder="如：丁达尔效应，微光暗调，冷峻高光..."
                  />
                </div>

                {/* 音轨与台词设计 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      环境音效 (SFX Cue)
                    </label>
                    <input
                      type="text"
                      value={activeShot.sound_cue}
                      onChange={(e) => handleUpdateActiveShot('sound_cue', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs bg-transparent"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                      placeholder="如：风啸声、剑鸣破空..."
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      台词与配音 (Voiceover)
                    </label>
                    <input
                      type="text"
                      value={activeShot.dialogue_cue}
                      onChange={(e) => handleUpdateActiveShot('dialogue_cue', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs bg-transparent"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                      placeholder="如：角色对话或内心独白..."
                    />
                  </div>
                </div>

                {/* 负向提示词 (Negative Prompt) */}
                <div className="pt-2">
                  <label className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    负向防崩词 (Negative Prompts)
                  </label>
                  <input
                    type="text"
                    value={activeShot.negative_prompt}
                    onChange={(e) => handleUpdateActiveShot('negative_prompt', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-[11px] font-mono bg-transparent text-stone-500"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 导出多平台工业提示词弹窗 (Multi-Platform Export Modal) */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
              className="literary-card w-full max-w-3xl max-h-[85vh] flex flex-col p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <Share2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
                      多模型标准视频提示词导出工坊
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      输出经过格式化与参数调优的标准载荷，直接粘入下游商业 AI 视频平台。
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-3 py-1 rounded-lg text-xs font-medium hover:bg-stone-500/10 transition"
                  style={{ color: 'var(--text-muted)' }}
                >
                  关闭
                </button>
              </div>

              {/* 平台标签切换 */}
              <div className="flex items-center gap-2 overflow-x-auto py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                {(
                  [
                    { id: 'KLING', name: '快手可灵 (Kling v1.5)' },
                    { id: 'SORA', name: 'OpenAI Sora' },
                    { id: 'RUNWAY_GEN3', name: 'Runway Gen-3' },
                    { id: 'HAILUO_MINIMAX', name: 'MiniMax 海螺' },
                    { id: 'MIDJOURNEY', name: 'Midjourney 原画' },
                    { id: 'COMFYUI_JSON', name: 'ComfyUI Workflow' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTargetPlatform(p.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                      targetPlatform === p.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'hover:bg-stone-500/10'
                    }`}
                    style={{ color: targetPlatform === p.id ? '#ffffff' : 'var(--text-muted)' }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* 导出的代码与指令预览框 */}
              <div className="flex-1 overflow-y-auto my-4 p-4 rounded-xl border font-mono text-xs leading-relaxed" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                <pre className="whitespace-pre-wrap select-all">{generateExportContent(targetPlatform)}</pre>
              </div>

              {/* 底部操作区 */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  共 {shots.length} 个镜头 • 预估成片时长: {totalDuration} 秒 • 画幅比: {aspectRatio}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      copyToClipboard(generateExportContent(targetPlatform), 'modal-copy')
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                  >
                    {copiedKey === 'modal-copy' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === 'modal-copy' ? '已复制至剪贴板' : '一键复制提示词'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
