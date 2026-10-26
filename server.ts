import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { connectToDatabase, isDbConnected } from "./src/db/connection";
import { DossierModel, AuditLogModel, UserModel } from "./src/db/models";

// In-memory fallback if MongoDB is not running locally in preview
let inMemoryDossiers: any[] = [];
let inMemoryLogs: any[] = [];
let inMemoryUsers: any[] = [];

try {
  const dossiersFile = path.join(process.cwd(), "src", "db", "dossiers.json");
  if (fs.existsSync(dossiersFile)) {
    inMemoryDossiers = JSON.parse(fs.readFileSync(dossiersFile, "utf-8"));
  }
  const logsFile = path.join(process.cwd(), "src", "db", "audit_logs.json");
  if (fs.existsSync(logsFile)) {
    inMemoryLogs = JSON.parse(fs.readFileSync(logsFile, "utf-8"));
  }
  const usersFile = path.join(process.cwd(), "src", "db", "users.json");
  if (fs.existsSync(usersFile)) {
    inMemoryUsers = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load initial db json fallback:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Connect to MongoDB
  connectToDatabase().catch((err) => console.warn("[MongoDB init]", err));

  // --- API Routes ---

  // Health and connection status
  app.get("/api/status", async (_req, res) => {
    const mongoStatus = isDbConnected();
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      database: "srsp_pensions",
      mongoConnected: mongoStatus,
      collections: {
        dossiers: mongoStatus ? await DossierModel.countDocuments().catch(() => inMemoryDossiers.length) : inMemoryDossiers.length,
        audit_logs: mongoStatus ? await AuditLogModel.countDocuments().catch(() => inMemoryLogs.length) : inMemoryLogs.length,
      },
    });
  });

  // GET /api/dossiers
  app.get("/api/dossiers", async (_req, res) => {
    try {
      if (isDbConnected()) {
        const dossiers = await DossierModel.find().lean();
        if (dossiers && dossiers.length > 0) {
          return res.json(dossiers);
        }
      }
      res.json(inMemoryDossiers);
    } catch (err: any) {
      res.status(500).json({ error: err.message, fallback: inMemoryDossiers });
    }
  });

  // POST /api/dossiers (create or update)
  app.post("/api/dossiers", async (req, res) => {
    const dossierData = req.body;
    const docId = dossierData.id || dossierData._id || `dos-${Date.now()}`;
    const payload = { ...dossierData, id: docId, _id: docId, updatedAt: new Date().toISOString() };

    try {
      if (isDbConnected()) {
        await DossierModel.findOneAndUpdate(
          { $or: [{ id: docId }, { _id: docId }, { numeroDossier: dossierData.numeroDossier }] },
          payload,
          { upsert: true, new: true }
        );
      }

      // Update in memory
      const idx = inMemoryDossiers.findIndex((d) => d.id === docId || d._id === docId || d.numeroDossier === dossierData.numeroDossier);
      if (idx >= 0) {
        inMemoryDossiers[idx] = payload;
      } else {
        inMemoryDossiers.unshift(payload);
      }

      res.status(201).json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/dossiers/:id
  app.put("/api/dossiers/:id", async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, id, _id: id, updatedAt: new Date().toISOString() };

    try {
      if (isDbConnected()) {
        await DossierModel.findOneAndUpdate(
          { $or: [{ id }, { _id: id }] },
          { $set: updates },
          { upsert: true, new: true }
        );
      }

      const idx = inMemoryDossiers.findIndex((d) => d.id === id || d._id === id);
      if (idx >= 0) {
        inMemoryDossiers[idx] = { ...inMemoryDossiers[idx], ...updates };
      } else {
        inMemoryDossiers.push(updates);
      }

      res.json(updates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/dossiers/:id
  app.delete("/api/dossiers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (isDbConnected()) {
        await DossierModel.deleteOne({ $or: [{ id }, { _id: id }] });
      }
      inMemoryDossiers = inMemoryDossiers.filter((d) => d.id !== id && d._id !== id);
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit-logs
  app.get("/api/audit-logs", async (_req, res) => {
    try {
      if (isDbConnected()) {
        const logs = await AuditLogModel.find().sort({ timestamp: -1 }).lean();
        if (logs && logs.length > 0) {
          return res.json(logs);
        }
      }
      res.json(inMemoryLogs);
    } catch (err: any) {
      res.status(500).json({ error: err.message, fallback: inMemoryLogs });
    }
  });

  // POST /api/audit-logs
  app.post("/api/audit-logs", async (req, res) => {
    const logData = req.body;
    const logId = logData.id || logData._id || `log-${Date.now()}`;
    const payload = { ...logData, id: logId, _id: logId, timestamp: logData.timestamp || new Date().toISOString() };

    try {
      if (isDbConnected()) {
        await AuditLogModel.create(payload);
      }
      inMemoryLogs.unshift(payload);
      res.status(201).json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/sync (batch upload all dossiers)
  app.post("/api/sync", async (req, res) => {
    const { dossiers, logs } = req.body;
    try {
      if (Array.isArray(dossiers) && isDbConnected()) {
        for (const d of dossiers) {
          const id = d.id || d._id;
          await DossierModel.findOneAndUpdate({ $or: [{ id }, { _id: id }] }, d, { upsert: true });
        }
      }
      if (Array.isArray(dossiers)) {
        inMemoryDossiers = dossiers;
      }
      if (Array.isArray(logs)) {
        inMemoryLogs = logs;
      }
      res.json({ success: true, countDossiers: inMemoryDossiers.length, countLogs: inMemoryLogs.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
