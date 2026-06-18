/* ── Note → semitone offset ────────────────────────────────────────────────── */
const NOTE_SEMITONES = {
  'C':0,'B#':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'Fb':4,
  'F':5,'E#':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,
  'A#':10,'Bb':10,'B':11,'Cb':11,
};

function noteToFrequency(note, octave) {
  const semitone = NOTE_SEMITONES[note] ?? 0;
  const midiNote = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

class Synth {
  constructor() {
    this._ctx = null;
    this._enabled = true;
    this._activeChordNodes = [];
    this._sequencePlaying = false;
    this._sequenceCompletionTimer = null;
    this._sequenceTimeouts = [];
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  playNote(note, octave = 4, duration = 0.8) {
    if (!this._enabled) return;
    const ctx  = this._getCtx();
    const freq = noteToFrequency(note, octave);
    const osc    = ctx.createOscillator();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4,  ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  playChord(notes, octave = 4) {
    if (!this._enabled) return;
    notes.forEach(n => this.playNote(n, octave, 1.2));
  }

  playArpeggio(notes, octave = 4, gap = 80) {
    if (!this._enabled) return;
    notes.forEach((n, i) => setTimeout(() => this.playNote(n, octave, 0.6), i * gap));
  }

  playAscendingArpeggio(notes, startOctave = 4, gap = 80) {
    if (!this._enabled || notes.length === 0) return;
    let octave = startOctave;
    let prevSemitone = NOTE_SEMITONES[notes[0]] ?? 0;
    notes.forEach((note, i) => {
      const cur = NOTE_SEMITONES[note] ?? 0;
      if (i > 0 && cur < prevSemitone) octave++;
      prevSemitone = cur;
      const o = octave;
      setTimeout(() => this.playNote(note, o, 0.6), i * gap);
    });
  }

  playSustainedChord(notes, octave = 4, duration = 1.2) {
    if (!this._enabled) return;
    const ctx = this._getCtx();
    const now = ctx.currentTime;

    this._activeChordNodes.forEach(g => {
      try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.1); } catch {}
    });
    this._activeChordNodes = [];

    notes.forEach(note => {
      const freq     = noteToFrequency(note, octave);
      const osc      = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter   = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.08);
      gainNode.gain.setValueAtTime(0.25, now + duration - 0.15);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(filter); filter.connect(gainNode); gainNode.connect(ctx.destination);
      osc.start(now); osc.stop(now + duration);
      this._activeChordNodes.push(gainNode);
    });
  }

  stopAll() {
    if (this._ctx) {
      const now = this._ctx.currentTime;
      this._activeChordNodes.forEach(g => {
        try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.05); } catch {}
      });
    }
    this._activeChordNodes = [];
    this._sequencePlaying = false;
    this._sequenceTimeouts.forEach(t => clearTimeout(t));
    this._sequenceTimeouts = [];
    if (this._sequenceCompletionTimer !== null) { clearTimeout(this._sequenceCompletionTimer); this._sequenceCompletionTimer = null; }
  }

  playProgressionSequence(chords, octave = 4, chordDuration = 2000, onComplete) {
    if (!this._enabled || chords.length === 0) return;
    this.stopAll();
    this._sequencePlaying = true;
    const sustain = (chordDuration / 1000) + 0.3;

    this.playSustainedChord(chords[0], octave, sustain);
    this._sequenceTimeouts = [];
    chords.slice(1).forEach((chordNotes, i) => {
      const t = setTimeout(() => {
        if (!this._sequencePlaying) return;
        this.playSustainedChord(chordNotes, octave, sustain);
      }, (i + 1) * (chordDuration - 50));
      this._sequenceTimeouts.push(t);
    });

    const total = chords.length * chordDuration;
    this._sequenceCompletionTimer = setTimeout(() => {
      this._sequencePlaying = false;
      this._sequenceCompletionTimer = null;
      if (onComplete) onComplete();
    }, total + 500);
  }

  setEnabled(val) { this._enabled = val; }
  toggle() { this._enabled = !this._enabled; return this._enabled; }
  resume() { if (this._ctx?.state === 'suspended') this._ctx.resume(); }
}

/** Singleton shared across tools on the same page */
const synth = new Synth();
