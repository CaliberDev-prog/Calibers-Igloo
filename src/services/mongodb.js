import mongoose from 'mongoose';

let connected = false;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[MONGO] MONGODB_URI not set in .env - tickets will not persist across restarts');
    return false;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log('[MONGO] Connected to MongoDB');
    return true;
  } catch (err) {
    console.error('[MONGO] Connection failed:', err.message);
    connected = false;

    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv') || err.message.includes('ENODATA')) {
      console.error('[MONGO] DNS/Atlas lookup failed. Check that:');
      console.error('  1. Your Atlas cluster is running (not paused)');
      console.error('  2. Your IP is whitelisted in Atlas');
      console.error('  3. The connection string is correct');
    }

    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  connected = false;
  console.warn('[MONGO] Disconnected from MongoDB');
});

mongoose.connection.on('error', (err) => {
  connected = false;
  console.error('[MONGO] Connection error:', err.message);
});

export function isMongoConnected() {
  return connected && mongoose.connection.readyState === 1;
}
