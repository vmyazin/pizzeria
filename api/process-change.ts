import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define the system instructions for Gemini
const SYSTEM_PROMPT = `You are an assistant for Giacomo's Pizza. Analyze the requested change to menu, hours, or about us page.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Receive email body + current JSON
  // 2. Send to Gemini Flash to parse intent
  // 3. Create a pending change entry in pending-changes.json
  // 4. Send confirmation email to OWNER_EMAIL ("Reply YES to confirm")
  
  res.status(200).json({ message: "process-change executed (placeholder)" });
}
