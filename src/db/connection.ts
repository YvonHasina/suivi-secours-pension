import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export async function connectToDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/srsp_pensions';

  if (isConnected) {
    return true;
  }

  try {
    // Set a reasonable server selection timeout so it doesn't hang if MongoDB local isn't reachable
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connecté avec succès à : ${uri}`);
    return true;
  } catch (error: any) {
    console.warn(`[MongoDB] Connexion différée ou hors-ligne (${error.message}). Le serveur fonctionne avec le stockage de secours.`);
    isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
