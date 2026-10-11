// ==============================================================================
// 作家禅定音景合成器 (Web Audio Ambient Sound Synthesizer)
// 纯前端 Web Audio API 算法生成自然音效，100% 离线、零外部资源依赖
// 支持：雨打窗扉 (Rain)、林间柴火 (Fireplace)、古刹禅钟 (Temple Bell)、夏夜微鸣 (Crickets)
// ==============================================================================

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentType: string | null = null;
  private gainNode: GainNode | null = null;
  private timer: number | null = null;
  private activeNodes: (AudioNode | number)[] = [];

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isPlaying(): boolean {
    return this.currentType !== null;
  }

  public getCurrentSound(): string | null {
    return this.currentType;
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      } catch {}
    }
    setTimeout(() => {
      this.cleanup();
    }, 550);
  }

  private cleanup() {
    this.activeNodes.forEach((node) => {
      try {
        if (typeof node === 'number') {
          clearInterval(node);
        } else if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        } else if ('disconnect' in node) {
          node.disconnect();
        }
      } catch {}
    });
    this.activeNodes = [];
    this.gainNode = null;
    this.currentType = null;
  }

  public play(type: 'rain' | 'fire' | 'bell' | 'crickets', volume: number = 0.3) {
    this.stop();
    setTimeout(() => {
      const ctx = this.getAudioContext();
      this.currentType = type;
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      this.gainNode.connect(ctx.destination);

      switch (type) {
        case 'rain':
          this.generateRain(ctx, this.gainNode);
          break;
        case 'fire':
          this.generateFire(ctx, this.gainNode);
          break;
        case 'bell':
          this.generateBell(ctx, this.gainNode);
          break;
        case 'crickets':
          this.generateCrickets(ctx, this.gainNode);
          break;
      }
    }, 100);
  }

  private generateRain(ctx: AudioContext, master: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    // 粉红噪声算法模拟细雨连绵
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(master);
    whiteNoise.start();

    this.activeNodes.push(whiteNoise, filter);
  }

  private generateFire(ctx: AudioContext, master: GainNode) {
    // 低频燃烧轰鸣 + 随机噼啪爆鸣
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(350, ctx.currentTime);

    noiseSource.connect(lowpass);
    lowpass.connect(master);
    noiseSource.start();
    this.activeNodes.push(noiseSource, lowpass);

    // 随机噼啪柴火声
    const crackleInterval = window.setInterval(() => {
      if (!this.currentType) return;
      if (Math.random() > 0.4) {
        const osc = ctx.createOscillator();
        const crackleGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150 + Math.random() * 1200, ctx.currentTime);
        crackleGain.gain.setValueAtTime(0.04 + Math.random() * 0.08, ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(crackleGain);
        crackleGain.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    }, 180);

    this.activeNodes.push(crackleInterval);
  }

  private generateBell(ctx: AudioContext, master: GainNode) {
    // 悠远古刹铜钟：每 12 秒鸣击一次
    const strike = () => {
      if (!this.currentType) return;
      const baseFreq = 220; // A3 音
      const partials = [1, 2.76, 5.4, 8.9];
      const gains = [0.6, 0.25, 0.12, 0.05];

      partials.forEach((mult, idx) => {
        const osc = ctx.createOscillator();
        const partialGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, ctx.currentTime);

        const decay = 6.0 / (idx + 1);
        partialGain.gain.setValueAtTime(gains[idx] * 0.3, ctx.currentTime);
        partialGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);

        osc.connect(partialGain);
        partialGain.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + decay + 0.1);
      });
    };

    strike();
    const bellInterval = window.setInterval(strike, 14000);
    this.activeNodes.push(bellInterval);
  }

  private generateCrickets(ctx: AudioContext, master: GainNode) {
    const cricketInterval = window.setInterval(() => {
      if (!this.currentType) return;
      const osc = ctx.createOscillator();
      const cricketGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(4500 + Math.random() * 500, ctx.currentTime);

      cricketGain.gain.setValueAtTime(0.02, ctx.currentTime);
      cricketGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(cricketGain);
      cricketGain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    }, 450);

    this.activeNodes.push(cricketInterval);
  }
}

export const ambientSound = new AmbientSoundEngine();
