/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineDistortion: WaveShaperNode | null = null;
  private isEngineRunning = false;

  // Tire screech / drift noise nodes
  private driftNoiseNode: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;

  // Nitro noise nodes
  private nitroNoiseNode: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;

  private isMuted = false;
  private masterVolume = 0.8;
  private engineVolume = 0.65;
  private sfxVolume = 0.85;

  private isInitialized = false;

  constructor() {
    // Listen for tab visibility to mute/unmute
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAll();
        } else {
          this.resumeAll();
        }
      });
    }
  }

  private initContext() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Engine bus
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.initDriftSynth();
      this.initNitroSynth();
      this.isInitialized = true;
    } catch (e) {
      console.warn('[Audio] Could not initialize Web Audio context:', e);
    }
  }

  private createDistortionCurve(amount = 20): Float32Array {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx || !this.engineGain || this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;

      // Primary cylinder rumble
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(55, now);

      // Secondary harmonic overtone
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(110, now);

      // Deep sub-bass pulse
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'sine';
      this.engineSubOsc.frequency.setValueAtTime(28, now);

      // Exhaust wave-shaper
      this.engineDistortion = this.ctx.createWaveShaper();
      (this.engineDistortion as unknown as { curve: Float32Array }).curve = this.createDistortionCurve(15);
      this.engineDistortion.oversample = '2x';

      // Low-pass throttle filter
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, now);
      this.engineFilter.Q.setValueAtTime(2.5, now);

      this.engineOsc1.connect(this.engineDistortion);
      this.engineOsc2.connect(this.engineDistortion);
      this.engineSubOsc.connect(this.engineFilter);

      this.engineDistortion.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);
      this.engineSubOsc.start(now);

      this.isEngineRunning = true;
    } catch (e) {
      console.warn('[Audio] Error starting engine audio:', e);
    }
  }

  public updateEngine(rpmNormalized: number, throttle: number, speedRatio: number) {
    if (!this.ctx || !this.isEngineRunning) return;

    const clampedRpm = Math.max(0, Math.min(1, rpmNormalized));
    const now = this.ctx.currentTime;

    // Base pitch modulation: 45Hz idle -> 340Hz redline
    const baseFreq = 48 + clampedRpm * 280 + speedRatio * 40;
    if (this.engineOsc1) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    }
    if (this.engineOsc2) {
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);
    }
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    }

    // Dynamic intake / exhaust filter opening under throttle load
    if (this.engineFilter) {
      const targetCutoff = 350 + clampedRpm * 2200 + throttle * 1200;
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);
    }

    // Volume ducking / boost under load
    if (this.engineGain) {
      const targetVol = this.engineVolume * (0.4 + clampedRpm * 0.4 + throttle * 0.2);
      this.engineGain.gain.setTargetAtTime(targetVol, now, 0.04);
    }
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineSubOsc?.disconnect();
      this.engineFilter?.disconnect();
      this.engineDistortion?.disconnect();
    } catch {}
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.engineDistortion = null;
    this.isEngineRunning = false;
  }

  private initDriftSynth() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.driftNoiseNode = this.ctx.createBufferSource();
      this.driftNoiseNode.buffer = noiseBuffer;
      this.driftNoiseNode.loop = true;

      this.driftFilter = this.ctx.createBiquadFilter();
      this.driftFilter.type = 'bandpass';
      this.driftFilter.frequency.value = 1100;
      this.driftFilter.Q.value = 4.0;

      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.value = 0.0001;

      this.driftNoiseNode.connect(this.driftFilter);
      this.driftFilter.connect(this.driftGain);
      this.driftGain.connect(this.sfxGain);

      this.driftNoiseNode.start(0);
    } catch (e) {
      console.warn('[Audio] Drift synth error', e);
    }
  }

  public updateDrift(slipIntensity: number) {
    if (!this.driftGain || !this.driftFilter || !this.ctx) return;
    const intensity = Math.max(0, Math.min(1, slipIntensity));
    const now = this.ctx.currentTime;
    const targetGain = intensity > 0.15 ? (intensity * 0.6) : 0.0001;
    this.driftGain.gain.setTargetAtTime(targetGain, now, 0.04);
    this.driftFilter.frequency.setTargetAtTime(950 + intensity * 600, now, 0.05);
  }

  private initNitroSynth() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.nitroNoiseNode = this.ctx.createBufferSource();
      this.nitroNoiseNode.buffer = noiseBuffer;
      this.nitroNoiseNode.loop = true;

      const nitroFilter = this.ctx.createBiquadFilter();
      nitroFilter.type = 'highpass';
      nitroFilter.frequency.value = 1400;

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.value = 0.0001;

      this.nitroNoiseNode.connect(nitroFilter);
      nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.sfxGain);

      this.nitroNoiseNode.start(0);
    } catch (e) {
      console.warn('[Audio] Nitro synth error', e);
    }
  }

  public updateNitro(isActive: boolean) {
    if (!this.nitroGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = isActive ? 0.45 : 0.0001;
    this.nitroGain.gain.setTargetAtTime(target, now, 0.06);
  }

  public playCheckpointSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.09); // A5

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playCountdownBeep(isGo = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

      gain.gain.setValueAtTime(isGo ? 0.5 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.5 : 0.22));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + (isGo ? 0.5 : 0.22));
    } catch {}
  }

  public playCrashSound(intensity = 0.5) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

      const vol = Math.min(0.6, 0.2 + intensity * 0.4);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  public playVictoryFanfare() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const time = now + idx * 0.12;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(time);
        osc.stop(time + 0.45);
      });
    } catch {}
  }

  public playUiClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playUpgradeSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      [440, 554, 659].forEach((freq, idx) => {
        const time = now + idx * 0.06;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(time);
        osc.stop(time + 0.18);
      });
    } catch {}
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public setEngineVolume(vol: number) {
    this.engineVolume = Math.max(0, Math.min(1, vol));
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public pauseAll() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeAll() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

export const soundManager = new SoundSynthesizer();
