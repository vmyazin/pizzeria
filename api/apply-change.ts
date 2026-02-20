import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Triggered when owner replies "YES"
  // 2. Reads the pending change from pending-changes.json
  // 3. Modifies the target JSON (menu, hours, about) via GitHub API commit
  // 4. Clears the pending change
  // 5. Triggers VERCEL_DEPLOY_HOOK_URL to rebuild site
  
  res.status(200).json({ message: "apply-change executed (placeholder)" });
}
