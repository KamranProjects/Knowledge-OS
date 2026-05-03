import { GoogleGenerativeAI } from "@google/generative-ai";

// Simple local vector store implementation
interface VectorRecord {
  id: string;
  sourceId: string;
  text: string;
  embedding: number[];
  type: "knowledge" | "memory";
}

let vectorStore: VectorRecord[] = [];

// Initialize Google AI client lazily
let genAIInstance: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

export async function ingestDocument(sourceId: string, text: string, type: "knowledge" | "memory" = "knowledge", apiKey?: string) {
  const cleanText = text.replace(/[\r\n]+/g, "\n").trim();
  if (cleanText.length < 2) return;

  const paragraphs = cleanText.split("\n\n").filter(p => p.trim().length > 10);
  
  let chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length > 800) {
      const subChunks = para.match(/[^\.!\?]+[\.!\?]+/g) || [para];
      chunks.push(...subChunks);
    } else {
      chunks.push(para);
    }
  }

  chunks = chunks.map(c => c.trim()).filter(c => c.length > 20);
  if (chunks.length === 0) return;

  console.log(`Ingesting document ${sourceId} [${type}] - ${chunks.length} chunks (Batch Mode)`);
  
  // Use provided key or global instance
  const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : getGenAI();
  const versions = [undefined, "v1beta", "v1"];
  
  try {
    // Process in batches of 100 (Gemini limit)
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const currentBatch = chunks.slice(i, i + batchSize);
      
      let result;
      let lastErr;
      for (const ver of versions) {
        try {
          const model = genAI.getGenerativeModel({ model: "text-embedding-004" }, ver ? { apiVersion: ver } : undefined);
          result = await model.batchEmbedContents({
            requests: currentBatch.map(c => ({ content: { parts: [{ text: c }], role: "user" } }))
          });
          break;
        } catch (e: any) {
          lastErr = e;
          if (e.toString().includes("404") || e.toString().includes("400")) continue;
          throw e;
        }
      }

      if (!result) throw lastErr || new Error("Batch embedding failed across all versions.");
      const embeddings = result.embeddings;
      
      embeddings.forEach((emb, index) => {
        vectorStore.push({
          id: Math.random().toString(36).substr(2, 9),
          sourceId,
          text: currentBatch[index],
          embedding: emb.values,
          type
        });
      });
    }
    console.log(`Successfully ingested ${chunks.length} chunks for ${sourceId}`);
  } catch (err) {
    console.error("Batch embedding failed:", err);
  }
}

export async function queryRAG(query: string, type: "knowledge" | "memory" = "knowledge", topK: number = 3, apiKey?: string) {
  const filteredStore = vectorStore.filter(v => v.type === type);
  if (filteredStore.length === 0) return [];

  try {
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : getGenAI();
    const versions = [undefined, "v1beta", "v1"];
    
    let result;
    let lastErr;
    for (const ver of versions) {
      try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" }, ver ? { apiVersion: ver } : undefined);
        result = await model.embedContent(query);
        break;
      } catch (e: any) {
        lastErr = e;
        if (e.toString().includes("404") || e.toString().includes("400")) continue;
        throw e;
      }
    }
    
    if (!result) throw lastErr || new Error("Query embedding failed across all versions.");
    const queryEmbedding = result.embedding.values;

    const results = filteredStore.map(record => {
      const similarity = cosineSimilarity(queryEmbedding, record.embedding);
      return { ...record, similarity };
    });

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (err) {
    console.error("Query embedding failed:", err);
    return [];
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  return dotProduct / (mA * mB);
}

export function clearStore(sourceId?: string) {
  if (sourceId) {
    vectorStore = vectorStore.filter(v => v.sourceId !== sourceId);
  } else {
    vectorStore = [];
  }
}
