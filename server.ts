import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import vision from "@google-cloud/vision";
import { ingestDocument, queryRAG, clearStore } from "./ragService";

// Types for OCR response
interface OCRResponse {
  text: string;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT as string) : 8080;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Set up temporary service account file if provided in env
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  let clientOptions = {};
  
  if (credentialsJson) {
    try {
      const tempKeyPath = path.join(process.cwd(), "google-key.json");
      fs.writeFileSync(tempKeyPath, credentialsJson);
      clientOptions = { keyFilename: tempKeyPath };
      console.log("Service account key configured from environment.");
    } catch (err) {
      console.error("Error writing temporary service account key:", err);
    }
  }

  // Initialize Vision Client
  const visionClient = new vision.ImageAnnotatorClient(clientOptions);

  // Configure Multer for image uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // --- API ROUTES ---

  // Cloud Vision OCR Endpoint
  app.post("/api/ocr", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }

      console.log("Processing OCR for file:", req.file.originalname);
      
      const [result] = await visionClient.textDetection(req.file.buffer);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        return res.json({ text: "" });
      }

      // The first annotation contains the full block of text
      const extractedText = detections[0].description || "";

      // Also ingest into RAG brain
      const sourceId = `ocr-${Date.now()}`;
      await ingestDocument(sourceId, extractedText);

      res.json({ text: extractedText, sourceId });
    } catch (error: any) {
      console.error("Vision API Error:", error);
      res.status(500).json({ error: error.message || "Failed to process image." });
    }
  });

  app.post("/api/research/download", async (req, res) => {
    try {
      const { url, title, sourceId } = req.body;
      if (!url) return res.status(400).json({ error: "Missing URL" });

      const pdfRes = await fetch(url);
      if (!pdfRes.ok) throw new Error(`Failed to fetch PDF: ${pdfRes.statusText}`);
      
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pdfImport = await import("pdf-parse");
      const pdf = (pdfImport as any).default || pdfImport;
      const data = await pdf(buffer);
      
      if (data.numpages > 3) {
         throw new Error("App under development. This tool only supports max 3 pages.");
      }

      const text = data.text;
      if (text.length < 50) {
         throw new Error("Extracted text is too short. Might be an image-only PDF.");
      }

      await ingestDocument(sourceId || Math.random().toString(36).substr(2, 9), `TITLE: ${title}\n\nCONTENT: ${text}`, "knowledge");

      res.json({ success: true, textPreview: text.substring(0, 200) });
    } catch (error: any) {
      console.error("Download Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- RESEARCH ENGINE (ArXiv, NASA, SearXNG) ---
  app.post("/api/research/search", async (req, res) => {
    try {
      const { query, source = "arxiv" } = req.body;
      const nasaKey = req.body.nasaKey || process.env.NASA_API_KEY || "DEMO_KEY";
      if (!query) return res.status(400).json({ error: "Missing search query" });

      if (source === "searx") {
        try {
          // Use a few common public instances as fallbacks
          const instances = ["https://searx.be", "https://searxng.site", "https://baresearch.org"];
          let data = null;
          for (const instance of instances) {
            try {
              const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&format=json`);
              if (res.ok) {
                data = await res.json();
                break;
              }
            } catch (e) {}
          }
          if (!data) throw new Error("Search instances unavailable");

          const results = (data.results || []).slice(0, 10).map((r: any) => ({
            id: r.url,
            title: r.title,
            summary: r.content || "No snippet available.",
            authors: [new URL(r.url).hostname],
            source: "Web (SearXNG)",
            link: r.url
          }));
          return res.json(results);
        } catch (e: any) {
          return res.status(500).json({ error: "SearXNG search failed: " + e.message });
        }
      }

      if (source === "arxiv") {
        const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`;
        const response = await fetch(arxivUrl);
        if (!response.ok) throw new Error("ArXiv API unreachable");
        const xml = await response.text();

        // More robust manual parsing or just simplify
        const entryRegex = /<entry>(.*?)<\/entry>/gs;
        const results = [];
        let match;
        while ((match = entryRegex.exec(xml)) !== null) {
          const entry = match[1];
          const title = entry.match(/<title>(.*?)<\/title>/s)?.[1]?.replace(/\n/g, " ").trim() || "Untitled";
          const summary = entry.match(/<summary>(.*?)<\/summary>/s)?.[1]?.replace(/\n/g, " ").trim() || "No summary";
          const id = entry.match(/<id>(.*?)<\/id>/)?.[1] || "";
          const authors = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map(m => m[1]);
          const link = entry.match(/<link title="pdf" href="(.*?)"/)?.[1] || id;
          results.push({ id, title, summary, authors, source: "ArXiv", link });
        }
        return res.json(results);
      }

      if (source === "nasa") {
        const nasaUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;
        const response = await fetch(nasaUrl);
        const data = await response.json();
        const results = (data.collection?.items || []).slice(0, 10).map((item: any) => ({
          id: item.links?.[0]?.href || Math.random().toString(),
          title: item.data?.[0]?.title || "NASA Discovery",
          summary: item.data?.[0]?.description || "No description available.",
          authors: [item.data?.[0]?.center || "NASA"],
          source: "NASA",
          link: item.links?.[0]?.href
        }));
        return res.json(results);
      }

      if (source === "openalex") {
        const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=8`;
        const response = await fetch(openAlexUrl);
        const data = await response.json();
        const results = (data.results || []).map((work: any) => ({
          id: work.id,
          title: work.title || "Untitled Work",
          summary: work.abstract_inverted_index ? "Abstract available (inverted index format)" : "No abstract provided.",
          authors: work.authorships?.map((a: any) => a.author?.display_name) || [],
          source: "OpenAlex"
        }));
        return res.json(results);
      }

      if (source === "gutenberg") {
        const gutenUrl = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
        const response = await fetch(gutenUrl);
        const data = await response.json();
        const results = (data.results || []).slice(0, 8).map((book: any) => ({
          id: `https://www.gutenberg.org/ebooks/${book.id}`,
          title: book.title,
          summary: `Author: ${book.authors?.map((a: any) => a.name).join(", ")}. Subjects: ${book.subjects?.join(", ")}`,
          authors: book.authors?.map((a: any) => a.name) || [],
          source: "Gutenberg"
        }));
        return res.json(results);
      }

      if (source === "archive") {
        const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=creator&rows=8&output=json`;
        const response = await fetch(archiveUrl);
        const data = await response.json();
        const results = (data.response?.docs || []).map((doc: any) => ({
          id: `https://archive.org/details/${doc.identifier}`,
          title: doc.title || "Archive Document",
          summary: doc.description || "No description.",
          authors: [doc.creator || "Unknown"],
          source: "Internet Archive"
        }));
        return res.json(results);
      }

      res.status(400).json({ error: "Invalid source" });
    } catch (error: any) {
      console.error("Research Search Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/research/ingest", async (req, res) => {
    try {
      const { title, summary, sourceId, sourceType = "ArXiv" } = req.body;
      const content = `${sourceType.toUpperCase()} FINDINGS\nTITLE: ${title}\n\nSUMMARY: ${summary}\n\nIngested into Study Brain. Use for deep comprehension.`;
      await ingestDocument(`${sourceType.toLowerCase()}-${sourceId}`, content, "knowledge");
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual Ingest Point (Support both knowledge and memory)
  app.post("/api/ingest", async (req, res) => {
    try {
      const { sourceId, text, type } = req.body;
      const apiKey = (req.headers["x-gemini-key"] as string || process.env.GEMINI_API_KEY)?.trim();
      if (!sourceId || !text) return res.status(400).json({ error: "Missing sourceId or text" });
      await ingestDocument(sourceId, text, type || "knowledge", apiKey);
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint to fetch RAG Context (Knowledge + Memory)
  app.post("/api/context", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = (req.headers["x-gemini-key"] as string || process.env.GEMINI_API_KEY)?.trim();
      
      const [knowledgeChunks, memoryChunks] = await Promise.all([
        queryRAG(message, "knowledge", 4, apiKey),
        queryRAG(message, "memory", 3, apiKey)
      ]);

      res.json({ 
        context: knowledgeChunks.map(c => c.text).join("\n---\n"),
        memory: memoryChunks.map(c => c.text).join(", "),
        chunksFound: knowledgeChunks.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save specific bits to Memory RAG
  app.post("/api/memory", async (req, res) => {
    try {
      const { text } = req.body;
      const apiKey = (req.headers["x-gemini-key"] as string || process.env.GEMINI_API_KEY)?.trim();
      if (!text) return res.status(400).json({ error: "No memory provided" });
      await ingestDocument(`mem-${Date.now()}`, text, "memory", apiKey);
      res.json({ status: "ok" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- COGNITIVE INGESTION (PDF/OCR) ---
  app.post("/api/ingest-file", async (req, res) => {
    try {
      const { fileName, fileType, base64Data, skipOcr = false } = req.body;
      console.log(`Ingesting file: ${fileName}, type: ${fileType}, length: ${base64Data?.length}, skipOcr: ${skipOcr}`);
      const buffer = Buffer.from(base64Data, "base64");
      
      let text = "";

      if (fileType === "application/pdf") {
        try {
          const pdfImport = await import("pdf-parse");
          const pdf = (pdfImport as any).default || pdfImport;
          const data = await pdf(buffer);
          text = data.text;
          console.log(`Digital PDF extraction: ${text.length} chars found.`);
        } catch (e) {
          console.warn("Digital PDF extraction failed, will fallback to Vision if skipOcr is false");
        }
      } else if (fileType === "text/plain" || fileType === "text/markdown") {
        text = buffer.toString("utf-8");
      }

      // Logic: If we have very little text (or it's an image), and we're NOT skipping OCR, use Gemini
      const charCount = text.replace(/\s/g, '').length;
      if (!skipOcr && (charCount < 40 || fileType.startsWith("image/"))) {
        console.log(`Low text density (${charCount} chars). Engaging Gemini Vision for higher fidelity.`);
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) throw new Error("Architect encountered a cognitive stall. GEMINI_API_KEY is required for visual analysis.");
        
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Resilient model fetch
        let response;
        const versions = [undefined, "v1", "v1beta"];
        for (const ver of versions) {
          try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }, ver ? { apiVersion: ver } : undefined);
            const result = await model.generateContent([
              "Extract and transcribe all text from this content with extreme precision. If it includes diagrams, charts, formulas, or scientific figures, describe their structural logic and data points in detail so a student can fully understand the content from text alone. Return ONLY the extracted/described text.",
              {
                inlineData: {
                  data: base64Data,
                  mimeType: fileType.startsWith("application/pdf") ? "application/pdf" : fileType
                }
              }
            ]);
            response = result.response;
            break;
          } catch (e: any) {
            if (e.toString().includes("404") && ver !== "v1beta") continue;
            throw e;
          }
        }
        
        if (!response) throw new Error("Vision extraction failed across all versions.");
        text = response.text();
        console.log(`Gemini Vision extracted ${text.length} chars.`);
      }

      const { ingestDocument } = await import("./ragService");
      const apiKey = (req.headers["x-gemini-key"] as string || process.env.GEMINI_API_KEY)?.trim();
      await ingestDocument(fileName, text || "[Empty Document]", "knowledge", apiKey);

      res.json({ success: true, text, fileName });
    } catch (error: any) {
      console.error("Ingestion Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Dedicated OCR endpoint for manual trigger
  app.post("/api/ocr-manual", async (req, res) => {
    try {
      const { base64Data, fileType } = req.body;
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) throw new Error("GEMINI_API_KEY required for OCR.");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      
      let response;
      const versions = [undefined, "v1", "v1beta"];
      for (const ver of versions) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }, ver ? { apiVersion: ver } : undefined);
          const result = await model.generateContent([
            "Perform deep OCR and technical analysis on this document. Return the full text.",
            {
              inlineData: {
                data: base64Data,
                mimeType: fileType
              }
            }
          ]);
          response = result.response;
          break;
        } catch (e: any) {
          if (e.toString().includes("404") && ver !== "v1beta") continue;
          throw e;
        }
      }

      if (!response) throw new Error("OCR failed across all API versions.");
      const text = response.text();
      res.json({ text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- AI PROXY ---
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model, contents, config, systemInstruction, attachments = [] } = req.body;
      const geminiKey = (req.headers["x-gemini-key"] as string || process.env.GEMINI_API_KEY)?.trim();
      const openaiKey = (req.headers["x-openai-key"] as string || process.env.OPENAI_API_KEY)?.trim();
      const deepseekKey = (req.headers["x-deepseek-key"] as string || process.env.DEEPSEEK_API_KEY)?.trim();

      const MODEL_MAPPING: Record<string, string> = {
        "gemini-3-flash-preview": "gemini-1.5-flash-latest",
        "gemini-3.1-flash": "gemini-1.5-flash-latest",
        "gemini-1.5-flash": "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp": "gemini-2.0-flash-exp",
        "gemini-flash": "gemini-1.5-flash-latest",
        "gemini-pro": "gemini-1.5-pro-latest"
      };

      const requestedModel = model || "gemini-1.5-flash-latest";
      const targetModel = MODEL_MAPPING[requestedModel] || requestedModel;

      const isOpenAI = targetModel.startsWith("gpt-");
      const isDeepSeek = targetModel.startsWith("deepseek-");

      if (isOpenAI || isDeepSeek) {
        const apiKey = isOpenAI ? openaiKey : deepseekKey;
        const baseUrl = isOpenAI ? "https://api.openai.com/v1" : "https://api.deepseek.com/v1";

        if (!apiKey) {
          return res.status(400).json({ error: `${isOpenAI ? "OpenAI" : "DeepSeek"} key missing in headers.` });
        }

        const openAiResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              ...(systemInstruction ? [{ role: "system", content: typeof systemInstruction === 'string' ? systemInstruction : systemInstruction.parts?.[0]?.text }] : []),
              ...contents.map((c: any) => ({
                role: c.role === "model" ? "assistant" : c.role,
                content: c.parts?.[0]?.text || c.content
              }))
            ],
            ...config
          })
        });

        const data = await openAiResponse.json();
        if (!openAiResponse.ok) throw new Error(data.error?.message || "Internal LLM call failed");
        
        return res.json({
          text: data.choices?.[0]?.message?.content || "",
          raw: data
        });
      }

      // Default to Gemini
      if (!geminiKey) {
        return res.status(500).json({ error: "Architect encountered a cognitive stall. GEMINI_API_KEY is not configured in settings." });
      }

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const client = new GoogleGenerativeAI(geminiKey);

      // Preparation for multi-modal
      const lastUserContent = contents[contents.length - 1];
      if (attachments && attachments.length > 0 && lastUserContent && lastUserContent.role === "user") {
          // Robust mapping to parts
          if (!lastUserContent.parts || !Array.isArray(lastUserContent.parts)) {
              const textVal = lastUserContent.content || lastUserContent.text || "";
              lastUserContent.parts = [{ text: textVal }];
          }
          
          lastUserContent.parts = [
              ...lastUserContent.parts,
              ...attachments.map((att: any) => ({
                  inlineData: {
                      data: att.data,
                      mimeType: att.mimeType
                  }
              }))
          ];
          // Delete content/text to avoid confusion in some SDK versions
          delete lastUserContent.content;
          delete lastUserContent.text;
      }

      // Use the model provided or a safe default. 
      // If attachments are present, we MUST use a multi-modal model (flash).
      const finalModel = (attachments.length > 0) ? "gemini-1.5-flash-latest" : targetModel;

      let result;
      // Resilient initialization: try default, then v1, then v1beta
      const versions = [undefined, "v1", "v1beta"];
      let lastErr;

      for (const ver of versions) {
        try {
          const modelInstance = client.getGenerativeModel({ 
            model: finalModel,
          }, ver ? { apiVersion: ver } : undefined);

          result = await modelInstance.generateContent({
            contents,
            generationConfig: config,
            systemInstruction: typeof systemInstruction === 'string' ? systemInstruction : (systemInstruction?.parts?.[0]?.text || undefined)
          });
          break; // Success!
        } catch (err: any) {
          lastErr = err;
          const errString = err.toString();
          if (errString.includes("404") || errString.includes("not found")) {
            console.warn(`Gemini trial with version ${ver || 'default'} failed for ${finalModel}. Retrying...`);
            continue;
          }
          throw err; // Re-throw if it's not a 404 (e.g. 401, 429, 500)
        }
      }

      if (!result) throw lastErr || new Error("Failed to initialize Gemini model across all versions.");

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error("Gemini returned an empty response. This might be due to safety filters or quota limits.");
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      
      let message = error.message || "AI API call failed";
      if (message.includes("Safety")) {
        message = "Cognitive block triggered: The Architect cannot process this specific query due to safety constraints.";
      } else if (message.includes("429")) {
        message = "Neural bandwidth exceeded: Quota limit reached. Please try again in 60 seconds.";
      }
      
      res.status(500).json({ error: message });
    }
  });

  // --- YOUTUBE TRANSCRIPT ENGINE ---
  app.post("/api/youtube", async (req, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId) return res.status(400).json({ error: "Missing videoId" });
      
      const { YoutubeTranscript } = await import("youtube-transcript");
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Combine transcript into a single block with approximate timestamps
      const fullText = transcript.map(t => `[${Math.floor(t.offset / 1000)}s] ${t.text}`).join(" ");
      
      // Generate summary using Gemini
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) throw new Error("GEMINI_API_KEY missing");
      const ai = new GoogleGenerativeAI(geminiKey);
      
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(`Summarize this video transcript into 4 concise bullet points: ${fullText.substring(0, 10000)}`);
      
      const summary = response.response.text() || "Could not generate summary.";

      res.json({ transcript: fullText, summary, raw: transcript });
    } catch (error: any) {
      console.error("YouTube Error:", error);
      if (error.toString().includes("Transcript is disabled")) {
        res.status(400).json({ error: "Transcript is disabled on this video. Please ensure captions are enabled on YouTube for this video." });
      } else {
        res.status(500).json({ error: "No transcript found or video unavailable. Ensure captions are enabled." });
      }
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.all("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
