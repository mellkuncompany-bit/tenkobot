/**
 * OCR Service for extracting data from fuel receipts using Google Cloud Vision API
 */

export interface OCRResult {
  amount: number;
  liters: number;
  date: string | null;
  rawText: string;
}

/**
 * Extract receipt data from an image using Google Cloud Vision API
 */
export async function extractReceiptData(imageUrl: string): Promise<OCRResult> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      }
    );

    const data = await visionResponse.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || "";

    // Parse the OCR text
    return parseReceiptText(text);
  } catch (error) {
    console.error("OCR extraction error:", error);
    return {
      amount: 0,
      liters: 0,
      date: null,
      rawText: "",
    };
  }
}

/**
 * Parse receipt text to extract amount, liters, and date
 */
export function parseReceiptText(text: string): OCRResult {
  // Extract amount (e.g., ¥1,234, 1234円)
  const amountMatch = text.match(/[¥￥]?([\d,]+)円?/);
  const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;

  // Extract liters (e.g., 12.34L, 12.34リットル)
  const litersMatch = text.match(/([\d.]+)\s*[Ll]|リットル/);
  const liters = litersMatch ? parseFloat(litersMatch[1]) : 0;

  // Extract date (e.g., 2026/05/10, 2026-05-10)
  const dateMatch = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : null;

  return {
    amount,
    liters,
    date,
    rawText: text,
  };
}
