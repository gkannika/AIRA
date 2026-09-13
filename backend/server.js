require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const repositoryRoutes = require('./routes/repository.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mockMode: process.env.MOCK_MODE !== 'false',
    time: new Date().toISOString(),
  });
});

app.use('/api/repository', repositoryRoutes);

// Centralized error handler - always returns structured JSON
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong while processing the request.',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` } });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`AI Repository Intelligence backend listening on http://localhost:${PORT}`);
    logger.info(`Mock mode: ${process.env.MOCK_MODE !== 'false'}`);
  });
}

start();
