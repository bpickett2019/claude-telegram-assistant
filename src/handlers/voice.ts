/**
 * Voice Transcription Handler
 *
 * Supports Groq Whisper API and local whisper-cpp
 */

import { spawn } from 'bun';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import type { Config } from '../types';

export class VoiceHandler {
  private tempDir: string;

  constructor(private config: Config) {
    this.tempDir = join(config.workspace.dataDir, 'temp');
  }

  /**
   * Transcribe audio buffer
   */
  async transcribe(buffer: Buffer): Promise<string | null> {
    switch (this.config.voice.provider) {
      case 'groq':
        return await this.transcribeWithGroq(buffer);
      case 'whisper':
        return await this.transcribeWithWhisper(buffer);
      default:
        console.error('[Voice] No voice provider configured');
        return null;
    }
  }

  /**
   * Transcribe with Groq Whisper API
   */
  private async transcribeWithGroq(buffer: Buffer): Promise<string | null> {
    if (!this.config.voice.groqApiKey) {
      console.error('[Voice] Groq API key not configured');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', new Blob([buffer]), 'audio.ogg');
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'en'); // Auto-detect if not specified

      const response = await fetch(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.voice.groqApiKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('[Voice] Groq API error:', error);
        return null;
      }

      const result = await response.json();
      return result.text || null;
    } catch (error) {
      console.error('[Voice] Groq transcription error:', error);
      return null;
    }
  }

  /**
   * Transcribe with local whisper-cpp
   */
  private async transcribeWithWhisper(buffer: Buffer): Promise<string | null> {
    if (!this.config.voice.whisperBinary || !this.config.voice.whisperModel) {
      console.error('[Voice] Whisper binary or model not configured');
      return null;
    }

    const tempAudioPath = join(this.tempDir, `audio_${Date.now()}.ogg`);

    try {
      // Save audio to temp file
      await writeFile(tempAudioPath, buffer);

      // Convert OGG to WAV (whisper-cpp requires WAV)
      const wavPath = tempAudioPath.replace('.ogg', '.wav');

      // Use ffmpeg to convert
      const convertProc = spawn([
        'ffmpeg',
        '-i', tempAudioPath,
        '-ar', '16000', // Sample rate 16kHz
        '-ac', '1',     // Mono
        '-c:a', 'pcm_s16le', // 16-bit PCM
        wavPath,
      ], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      await convertProc.exited;

      // Run whisper-cpp
      const whisperProc = spawn([
        this.config.voice.whisperBinary,
        '-m', this.config.voice.whisperModel,
        '-f', wavPath,
        '--output-txt', // Output as text
        '--no-timestamps', // No timestamps in output
      ], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(whisperProc.stdout).text();
      const exitCode = await whisperProc.exited;

      // Cleanup
      await unlink(tempAudioPath).catch(() => {});
      await unlink(wavPath).catch(() => {});

      if (exitCode !== 0) {
        console.error('[Voice] whisper-cpp failed');
        return null;
      }

      // Parse output (whisper-cpp outputs to file, but also to stdout)
      const transcription = output.trim();
      return transcription || null;
    } catch (error) {
      console.error('[Voice] Local Whisper error:', error);

      // Cleanup on error
      await unlink(tempAudioPath).catch(() => {});

      return null;
    }
  }

  /**
   * Check if voice transcription is configured
   */
  isConfigured(): boolean {
    if (this.config.voice.provider === 'none') {
      return false;
    }

    if (this.config.voice.provider === 'groq') {
      return !!this.config.voice.groqApiKey;
    }

    if (this.config.voice.provider === 'whisper') {
      return !!(this.config.voice.whisperBinary && this.config.voice.whisperModel);
    }

    return false;
  }

  /**
   * Get configuration message for user
   */
  getConfigMessage(): string {
    if (this.config.voice.provider === 'none') {
      return 'Voice transcription is not configured.\n\n' +
        'To enable:\n' +
        '1. Get a free Groq API key from console.groq.com\n' +
        '2. Add to .env: VOICE_PROVIDER=groq and GROQ_API_KEY=...\n' +
        '3. Restart the bot';
    }

    if (this.config.voice.provider === 'groq' && !this.config.voice.groqApiKey) {
      return 'Groq voice provider is selected but API key is missing.\n\n' +
        'Add GROQ_API_KEY to .env and restart.';
    }

    if (this.config.voice.provider === 'whisper') {
      if (!this.config.voice.whisperBinary) {
        return 'Local Whisper is selected but binary path is missing.\n\n' +
          'Install whisper-cpp and set WHISPER_BINARY in .env';
      }
      if (!this.config.voice.whisperModel) {
        return 'Local Whisper is selected but model path is missing.\n\n' +
          'Download a model and set WHISPER_MODEL_PATH in .env';
      }
    }

    return 'Voice transcription is configured.';
  }
}
