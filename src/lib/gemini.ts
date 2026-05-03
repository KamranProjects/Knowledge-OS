
export async function callGemini(payload: {
  model?: string;
  contents: any[];
  systemInstruction?: string;
  config?: any;
  attachments?: { data: string, mimeType: string }[];
}) {
  const customKey = localStorage.getItem("custom_gemini_key")?.trim();
  const openaiKey = localStorage.getItem("custom_openai_key")?.trim();
  const deepseekKey = localStorage.getItem("custom_deepseek_key")?.trim();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (customKey) headers["x-gemini-key"] = customKey;
  if (openaiKey) headers["x-openai-key"] = openaiKey;
  if (deepseekKey) headers["x-deepseek-key"] = deepseekKey;

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers,
    body: JSON.stringify({
        model: payload.model || "gemini-1.5-flash-latest",
        contents: payload.contents,
        systemInstruction: payload.systemInstruction,
        config: payload.config,
        attachments: payload.attachments
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Gemini request failed");
  }

  return response.json();
}
