import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Connect to Gmail via IMAP
  // 2. Fetch unread emails with relevant subjects
  // 3. For each email, forward contents to process-change.ts or call it directly
  
  res.status(200).json({ message: "poll-email cron executed (placeholder)" });
}
