import mongoose from 'mongoose';
import { perf } from './performance.js';

const SLOW_QUERY_THRESHOLD = 100;

const operations = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
  'insertOne', 'insertMany', 'updateOne', 'updateMany',
  'deleteOne', 'deleteMany', 'countDocuments', 'distinct', 'aggregate',
];

export function installMongoPerf() {
  mongoose.plugin((schema) => {
    for (const op of operations) {
      schema.pre(op, function () {
        this._perfStart = Date.now();
      });
      schema.post(op, function () {
        if (!this._perfStart) return;
        const duration = Date.now() - this._perfStart;
        const modelName = this.model?.modelName || 'unknown';
        perf.record('mongodb', `${modelName}.${op}`, duration);

        if (duration > SLOW_QUERY_THRESHOLD) {
          const msg = JSON.stringify({
            type: 'slow_query',
            model: modelName,
            operation: op,
            durationMs: duration,
            threshold: SLOW_QUERY_THRESHOLD,
          });
          console.warn(`[PERF] ${msg}`);
        }
      });
    }
  });
}
