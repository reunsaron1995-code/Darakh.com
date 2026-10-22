import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import OpenAI from 'openai';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT || 10000);
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(mp4|mov|webm|m4v)$/i.test(file.originalname || '') || /^video\//i.test(file.mimetype || '');
    cb(ok ? null : new Error('Please upload an MP4, MOV, WEBM, or M4V video.'), ok);
  }
});
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Darakh API', aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/translate-video', upload.single('video'), async (req, res) => {
  let audioPath;
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI API is not configured yet. Add OPENAI_API_KEY in the server Environment settings.' });
    if (!req.file) return res.status(400).json({ error: 'Choose a video file first.' });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    audioPath = `${req.file.path}.mp3`;
    await new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath, ['-y', '-i', req.file.path, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', audioPath]);
      let stderr = '';
      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`Could not extract audio from video. ${stderr.slice(-500)}`)));
    });

    const stat = await fs.stat(audioPath);
    if (stat.size > 24 * 1024 * 1024) return res.status(413).json({ error: 'Audio is too large for this starter version. Try a shorter video.' });
    const transcription = await client.audio.transcriptions.create({
      file: await fs.open(audioPath).then(async handle => { await handle.close(); return await import('node:fs').then(m => m.createReadStream(audioPath)); }),
      model: 'whisper-1',
      prompt: 'Transcribe the spoken Chinese accurately. Preserve the original meaning.'
    });
    const sourceText = (transcription.text || '').trim();
    if (!sourceText) return res.status(422).json({ error: 'No clear speech was detected in this video.' });

    const translated = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Translate the Chinese text into natural, clear Khmer (Cambodian). Preserve names and meaning. Return only the Khmer translation, no explanations.' },
        { role: 'user', content: sourceText }
      ]
    });
    res.json({ ok: true, sourceLanguage: 'Chinese', targetLanguage: 'Khmer', sourceText, translatedText: translated.choices?.[0]?.message?.content?.trim() || '' });
  } catch (err) {
    console.error('translate-video error:', err?.message || err);
    res.status(500).json({ error: 'Translation failed. Check the server logs and API configuration, then try a shorter video.' });
  } finally {
    if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => {});
    if (audioPath) await fs.rm(audioPath, { force: true }).catch(() => {});
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Maximum video size is 100 MB in this starter version.' });
  res.status(400).json({ error: err?.message || 'Request failed.' });
});

app.listen(port, '0.0.0.0', () => console.log(`Darakh API listening on ${port}`));
