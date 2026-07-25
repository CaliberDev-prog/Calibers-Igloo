import mongoose from 'mongoose';

let connected = false;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[MONGO] MONGODB_URI not set in .env - tickets will not persist across restarts');
    return false;
  }

  const isSrv = uri.startsWith('mongodb+srv://');

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log('[MONGO] Connected to MongoDB');
    return true;
  } catch (err) {
    console.error('[MONGO] Connection failed:', err.message);

    if (isSrv && (err.code === 'ENODATA' || err.message.includes('querySrv') || err.message.includes('ENODATA'))) {
      console.error('[MONGO] SRV lookup failed. Your MongoDB Atlas cluster may be paused, deleted, or DNS-blocked.');
      console.error('[MONGO] Options:');
      console.error('  1. Check if your Atlas cluster is running (not paused)');
      console.error('  2. Replace the SRV URI with a direct connection string:');
      console.error('     mongodb://username:password@host1:27017,host2:27017/?ssl=true&replicaSet=Cluster0');
      console.error('  3. Use a local MongoDB: mongodb://localhost:27017/calibers-igloo');
    }

    return false;
  }
}

export function isMongoConnected() {
  return connected;
}
