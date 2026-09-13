const mongoose = require('mongoose');

/**
 * Repository analysis document.
 * Stores metadata, analysis status, and all derived artifacts:
 * file tree, technologies, dependency graph, generated summaries/docs.
 */
const RepositorySchema = new mongoose.Schema(
  {
    _id: { type: String }, // uuid, set explicitly so both Mongo and memory store agree
    githubUrl: { type: String, required: true },
    name: { type: String },
    owner: { type: String },
    status: {
      type: String,
      enum: ['queued', 'cloning', 'scanning', 'parsing', 'analyzing', 'completed', 'failed'],
      default: 'queued',
    },
    statusMessage: { type: String },
    error: { type: mongoose.Schema.Types.Mixed },

    stats: {
      totalFiles: Number,
      totalFolders: Number,
      totalLinesOfCode: Number,
      sizeMB: Number,
    },

    languages: [{ name: String, fileCount: Number, percentage: Number }],
    frameworks: [{ type: String }],
    technologies: [{ type: String }],
    configFiles: [{ type: String }],

    tree: { type: mongoose.Schema.Types.Mixed }, // nested folder/file tree
    fileExplanations: { type: mongoose.Schema.Types.Mixed }, // path -> explanation

    dependencyGraph: {
      nodes: [{ id: String, label: String, type: String }],
      edges: [{ source: String, target: String }],
      mermaid: String,
    },

    summary: {
      overview: String,
      architecture: String,
      insights: [String],
      techStackNarrative: String,
    },

    documentation: { type: String }, // AI-generated README

    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { minimize: false }
);

module.exports = mongoose.models.Repository || mongoose.model('Repository', RepositorySchema);
