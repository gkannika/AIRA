const mongoose = require('mongoose');
const logger = require('../utils/logger');

// In-memory fallback store used when MongoDB isn't reachable (e.g. local dev
// without Mongo installed, or MOCK_MODE). Keeps the rest of the app working
// with an identical interface (find/findOne/create/updateOne-like helpers)
// so controllers don't need to branch on which store is active.
const memoryStore = new Map();

let usingMemoryStore = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (process.env.MOCK_MODE === 'true') {
    logger.info('MOCK_MODE=true — using in-memory store, skipping MongoDB connection.');
    usingMemoryStore = true;
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    logger.info('Connected to MongoDB.');
  } catch (err) {
    logger.warn(`Could not connect to MongoDB (${err.message}). Falling back to in-memory store.`);
    usingMemoryStore = true;
  }
}

function isUsingMemoryStore() {
  return usingMemoryStore;
}

module.exports = { connectDB, isUsingMemoryStore, memoryStore };
