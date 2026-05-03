import Tesseract from "tesseract.js";
import pdfToText from "react-pdftotext";

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    try {
      return await pdfToText(file);
    } catch (e) {
      console.warn("Local PDF extraction failed:", e);
      return "";
    }
  }

  if (file.type.startsWith("image/")) {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      return text;
    } catch (e) {
      console.warn("Local Image OCR failed:", e);
      return "";
    }
  }

  if (file.type === "text/plain" || file.type === "text/markdown") {
    return await file.text();
  }

  return "";
}

export async function extractTextFromBase64(base64: string, mimeType: string): Promise<string> {
  // Convert base64 to File/Blob for local processing
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  const blob = await response.blob();
  const file = new File([blob], "uploaded_file", { type: mimeType });
  return await extractTextFromFile(file);
}
