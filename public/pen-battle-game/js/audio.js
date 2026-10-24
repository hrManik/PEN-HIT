/**
 * Pen Battle: Bench Challenge
 * Web Audio API Sound Synthesizer
 * 100% procedural, offline, zero external dependencies
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    
    // Read persisted mute state if available
    try {
      const saved = localStorage.getItem('pen_battle_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch (e) {
      // Storage access blocked or unsupported
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.45;
        this.masterGain.connect(this.ctx.destination);
      }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
    }
    try {
      localStorage.setItem('pen_battle_muted', this.muted);
    } catch (e) {}
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Snappy pen flick release sound
   * @param {number} powerRatio - 0.0 to 1.0 representing power
   */
  playFlick(powerRatio = 0.5) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Frequency starts high and drops quickly like a snapping finger/pen
    const startFreq = 220 + powerRatio * 380;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

    gain.gain.setValueAtTime(0.6 * (0.4 + powerRatio * 0.6), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);

    // Add high click noise burst
    this.playNoiseClick(t, 0.03, 1400);
  }

  /**
   * Hard plastic pen-to-pen impact clack
   * @param {number} speed - collision impact magnitude
   */
  playClack(speed = 500) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const intensity = Math.min(Math.max(speed / 600, 0.25), 1.0);

    // Resonant bandpass filtered impulse
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 950 + intensity * 600;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.2, t);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(intensity * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);

    this.playNoiseClick(t, 0.02, 2800);
  }

  /**
   * Noise click helper for crisp material transients
   */
  playNoiseClick(time, duration, filterFreq) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    filter.Q.setValueAtTime(3.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  /**
   * Falling off the bench whoosh followed by floor thud
   */
  playFall() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.38);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + 0.38);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);

    // Floor thud after falling
    setTimeout(() => {
      if (this.muted || !this.ctx) return;
      const thudTime = this.ctx.currentTime;
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();

      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(120, thudTime);
      thudOsc.frequency.exponentialRampToValueAtTime(35, thudTime + 0.15);

      thudGain.gain.setValueAtTime(0.7, thudTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.16);

      thudOsc.connect(thudGain);
      thudGain.connect(this.masterGain);

      thudOsc.start(thudTime);
      thudOsc.stop(thudTime + 0.18);
    }, 280);
  }

  /**
   * Celebratory point scoring chime
   */
  playScore() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0, t + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.35, t + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.38);
    });
  }

  /**
   * Foul buzzer for self-fall
   */
  playFoul() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.setValueAtTime(110, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * Victorious fanfare on match win
   */
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0.0, dur: 0.25 },
      { notes: [587.33, 739.99, 880.00], time: 0.22, dur: 0.25 },
      { notes: [659.25, 830.61, 987.77], time: 0.44, dur: 0.3 },
      { notes: [783.99, 987.77, 1174.66, 1567.98], time: 0.72, dur: 0.8 }
    ];

    const t = this.ctx.currentTime;

    chords.forEach(c => {
      c.notes.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + c.time);

        gain.gain.setValueAtTime(0, t + c.time);
        gain.gain.linearRampToValueAtTime(0.2, t + c.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t + c.time);
        osc.stop(t + c.time + c.dur + 0.05);
      });
    });
  }
}

// Attach globally for clean vanilla modular script loading
window.AudioManager = AudioManager;
