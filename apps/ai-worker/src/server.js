import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import express from "express";
import { z } from "zod";
import { assertConfig, config, hasTlsConfig } from "./config.js";
import { DEBATE_MODELS, DEBATE_ROUND_COUNT, runProposalDebate } from "./debateService.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

app.use(express.json({ limit: "1mb" }));

const proposalSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  category: z.string().min(2),
  info: z.string().max(5000).optional().default(""),
  neededFunds: z.coerce.number().positive(),
  currency: z.string().min(2).max(10).optional().default("USD"),
});

const debateRequestSchema = z.object({
  proposal: proposalSchema,
});

function writeSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/v1/debate/proposals/evaluate", async (req, res) => {
  const parsed = debateRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await runProposalDebate(parsed.data.proposal);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: "Failed to run agentic debate",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/v1/debate/proposals/evaluate/stream", async (req, res) => {
  const parsed = debateRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let isClosed = false;
  const keepAliveTimer = setInterval(() => {
    if (!isClosed) {
      res.write(": keep-alive\n\n");
    }
  }, 15000);

  const markClosed = () => {
    isClosed = true;
    clearInterval(keepAliveTimer);
  };

  req.on("aborted", markClosed);
  res.on("close", markClosed);

  writeSseEvent(res, "connected", {
    success: true,
    models: DEBATE_MODELS,
    roundCount: DEBATE_ROUND_COUNT,
    timestamp: new Date().toISOString(),
  });

  try {
    const result = await runProposalDebate(parsed.data.proposal, {
      shouldContinue: () => !isClosed,
      onProgress: async (event) => {
        if (isClosed) {
          return;
        }

        writeSseEvent(res, event.type, event);
      },
    });

    if (!isClosed) {
      writeSseEvent(res, "stream_end", {
        success: true,
        aggregateScore: result.final.aggregateScore,
        fundingPriorityScore: result.final.fundingPriorityScore,
      });
      res.end();
      clearInterval(keepAliveTimer);
    }
  } catch (error) {
    if (!isClosed) {
      writeSseEvent(res, "error", {
        success: false,
        error: "Failed to run agentic debate stream",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      res.end();
      clearInterval(keepAliveTimer);
    }
  }
});

try {
  assertConfig();
  const servers = [];

  if (!config.httpsOnly || !hasTlsConfig()) {
    const httpServer = http.createServer(app);
    httpServer.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`AI engine HTTP listening on port ${config.port}`);
    });
    servers.push(httpServer);
  }

  if (hasTlsConfig()) {
    const tlsOptions = {
      key: fs.readFileSync(config.tlsKeyPath),
      cert: fs.readFileSync(config.tlsCertPath),
      ...(config.tlsCaPath ? { ca: fs.readFileSync(config.tlsCaPath) } : {}),
    };

    const httpsServer = https.createServer(tlsOptions, app);
    httpsServer.listen(config.httpsPort, () => {
      // eslint-disable-next-line no-console
      console.log(`AI engine HTTPS listening on port ${config.httpsPort}`);
    });
    servers.push(httpsServer);
  }

  if (servers.length === 0) {
    throw new Error(
      "No listener was started. Configure HTTP or provide TLS cert/key paths for HTTPS.",
    );
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
