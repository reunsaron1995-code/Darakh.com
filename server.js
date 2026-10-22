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
import { randomUUID } from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 10000);
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(mp4|mov|webm|m4v)$/i.test(file.originalname || '') || /^video\//i.test(file.mimetype || '');
    cb(ok ? null : new Error('សូមបញ្ចូលវីដេអូ MP4, MOV, WEBM ឬ M4V។'), ok);
  }
});
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(process.cwd(), { extensions: ['html'] }));

const runFfmpeg = (args) => new Promise((resolve, reject) => {
  const child = spawn(ffmpegPath, args);
  let stderr = '';
  child.stderr.on('data', d => { stderr += d.toString(); });
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${stderr.slice(-1200)}`)));
});
const safeUnlink = async p => { if (p) await fs.rm(p, { force: true }).catch(() => {}); };
const splitText = (text, max = 3500) => {
  const sentences = text.match(/[^.!?។！？]+[.!?។！？]?/g) || [text];
  const chunks = []; let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= max) current += sentence;
    else {
      if (current.trim()) chunks.push(current.trim());
      if (sentence.length <= max) current = sentence;
      else { for (let i = 0; i < sentence.length; i += max) chunks.push(sentence.slice(i, i + max).trim()); current = ''; }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
};

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'Darakh API',
  aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  features: ['Chinese speech transcription', 'Chinese-to-Khmer translation', 'Khmer voice generation', 'MP4 audio replacement']
}));

app.post('/api/translate-video', upload.single('video'), async (req, res) => {
  const tempFiles = [];
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'មិនទាន់កំណត់ OPENAI_API_KEY នៅ Render Environment ទេ។' });
    if (!req.file) return res.status(400).json({ error: 'សូមជ្រើសរើសវីដេអូជាមុនសិន។' });

    const inputPath = req.file.path; tempFiles.push(inputPath);
    const id = randomUUID();
    const audioPath = path.join(os.tmpdir(), `${id}-source.mp3`); tempFiles.push(audioPath);
    const outputPath = path.join(os.tmpdir(), `${id}-khmer-dub.mp4`); tempFiles.push(outputPath);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Extract mono audio from the uploaded video for transcription.
    await runFfmpeg(['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', audioPath]);
    const stat = await fs.stat(audioPath);
    if (stat.size > 24 * 1024 * 1024) return res.status(413).json({ error: 'សំឡេងធំពេកសម្រាប់ការសាកល្បងនេះ។ សូមសាកល្បងវីដេអូខ្លីជាងនេះ។' });

    const transcription = await client.audio.transcriptions.create({
      file: (await import('node:fs')).createReadStream(audioPath),
      model: 'whisper-1',
      prompt: 'Transcribe the spoken Chinese accurately. Preserve the original meaning.'
    });
    const sourceText = (transcription.text || '').trim();
    if (!sourceText) return res.status(422).json({ error: 'មិនបានរកឃើញសំឡេងនិយាយច្បាស់ក្នុងវីដេអូទេ។' });

    const translated = await client.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.2,
      messages: [
        { role: 'system', content: 'Translate the Chinese speech into natural, clear spoken Khmer (Cambodian). Keep names and meaning. Make it suitable for voice dubbing. Return only the Khmer translation.' },
        { role: 'user', content: sourceText }
      ]
    });
    const translatedText = translated.choices?.[0]?.message?.content?.trim() || '';
    if (!translatedText) throw new Error('The translation was empty.');

    // Generate Khmer speech in chunks so long translations are less likely to exceed TTS limits.
    const chunks = splitText(translatedText);
    if (chunks.length > 20) return res.status(413).json({ error: 'វីដេអូវែងពេកសម្រាប់ការបង្កើតសំឡេងក្នុងមួយដង។ សូមសាកល្បងវីដេអូខ្លីជាងនេះ។' });
    const speechPaths = [];
    for (let i = 0; i < chunks.length; i++) {
      const speechPath = path.join(os.tmpdir(), `${id}-khmer-${i}.mp3`); tempFiles.push(speechPath); speechPaths.push(speechPath);
      const speech = await client.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: process.env.TTS_VOICE || 'alloy',
        input: chunks[i],
        instructions: 'Speak clearly and naturally in Khmer as spoken in Cambodia. Use a calm, conversational voice. Do not speak any English unless it is part of a name.',
        response_format: 'mp3'
      });
      await fs.writeFile(speechPath, Buffer.from(await speech.arrayBuffer()));
    }

    let dubbedAudioPath = speechPaths[0];
    if (speechPaths.length > 1) {
      const listPath = path.join(os.tmpdir(), `${id}-concat.txt`); tempFiles.push(listPath);
      await fs.writeFile(listPath, speechPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
      dubbedAudioPath = path.join(os.tmpdir(), `${id}-all-khmer.mp3`); tempFiles.push(dubbedAudioPath);
      await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'libmp3lame', '-b:a', '96k', dubbedAudioPath]);
    }

    // Replace the original audio with Khmer narration, preserving the original video stream.
    // Pad the generated narration with silence if it is shorter than the video.
    await runFfmpeg(['-y', '-i', inputPath, '-i', dubbedAudioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-af', 'apad', '-shortest', '-movflags', '+faststart', outputPath]);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="Darakh-Khmer-Voice.mp4"');
    res.setHeader('X-Darakh-Source-Text', Buffer.from(sourceText, 'utf8').toString('base64'));
    res.setHeader('X-Darakh-Translated-Text', Buffer.from(translatedText, 'utf8').toString('base64'));
    res.setHeader('Access-Control-Expose-Headers', 'X-Darakh-Source-Text, X-Darakh-Translated-Text, Content-Disposition');
    res.sendFile(outputPath);
  } catch (err) {
    console.error('translate-video error:', err?.message || err);
    if (!res.headersSent) res.status(500).json({ error: 'បកប្រែមិនបានសម្រេចទេ។ សូមពិនិត្យ API Key និង Server Logs ឬសាកល្បងវីដេអូខ្លីជាងនេះ។' });
  } finally {
    if (req.file?.path) await safeUnlink(req.file.path);
    // Allow sendFile to finish before cleanup; response callback is handled below by a small delay-free close hook.
    res.on('finish', () => { for (const p of tempFiles) safeUnlink(p); });
    res.on('close', () => { for (const p of tempFiles) safeUnlink(p); });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'ទំហំវីដេអូអតិបរមា 100 MB សម្រាប់កំណែនេះ។' });
  res.status(400).json({ error: err?.message || 'មានបញ្ហាក្នុងការទទួលឯកសារ។' });
});

app.listen(port, '0.0.0.0', () => console.log(`Darakh API listening on ${port}`));
