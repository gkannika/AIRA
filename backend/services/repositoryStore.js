const { isUsingMemoryStore, memoryStore } = require('../config/db');
const Repository = require('../models/Repository');

/**
 * Thin data-access layer that transparently uses either MongoDB (via
 * Mongoose) or the in-memory Map, depending on what's available.
 * Every other module in the app just calls these functions and doesn't
 * need to know which backing store is active.
 */

async function create(doc) {
  if (isUsingMemoryStore()) {
    memoryStore.set(doc._id, { ...doc, createdAt: new Date() });
    return memoryStore.get(doc._id);
  }
  const created = await Repository.create(doc);
  return created.toObject();
}

async function findById(id) {
  if (isUsingMemoryStore()) {
    return memoryStore.get(id) || null;
  }
  const found = await Repository.findById(id);
  return found ? found.toObject() : null;
}

async function updateById(id, patch) {
  if (isUsingMemoryStore()) {
    const existing = memoryStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    memoryStore.set(id, updated);
    return updated;
  }
  const updated = await Repository.findByIdAndUpdate(id, patch, { new: true });
  return updated ? updated.toObject() : null;
}

module.exports = { create, findById, updateById };
