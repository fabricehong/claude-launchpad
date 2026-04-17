import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import auth from './middleware/auth.js';
import browseRouter from './routes/browse.js';
import sessionsRouter from './routes/sessions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT ?? 3456;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.use('/api', auth);
app.use('/api/browse', browseRouter);
app.use('/api/sessions', sessionsRouter);

app.get('{*splat}', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Claude Launchpad running on port ${port}`);
});
