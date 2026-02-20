import * as fs from 'fs';
import * as path from 'path';

export async function applyPendingChange(changeId: string) {
    console.log(`\n--- [APPLY] Applying Change ID: ${changeId} ---`);
    const pendingPath = path.join(process.cwd(), 'pending', 'pending-changes.json');
    const contentDir = path.join(process.cwd(), 'content');

    if (!fs.existsSync(pendingPath)) {
        console.error('❌ pending-changes.json not found.');
        return;
    }

    const pendingData = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    const changeIndex = pendingData.pending.findIndex((c: any) => c.id === changeId);

    if (changeIndex === -1) {
        console.error(`❌ Change ID ${changeId} not found in pending list.`);
        return;
    }

    const change = pendingData.pending[changeIndex];
    const proposedState = change.proposedState;

    try {
        // Determine which file to update based on the structure of proposedState
        // This is a bit naive, but Gemini is instructed to return the full file content
        let targetFile = '';
        if (proposedState.highlights) targetFile = 'menu.json';
        else if (proposedState.monday) targetFile = 'hours.json';
        else if (proposedState.title || proposedState.content) targetFile = 'about.json';

        if (!targetFile) {
            console.error('❌ Could not determine target file from proposed state.');
            return;
        }

        console.log(`✍️ Updating ${targetFile}...`);
        fs.writeFileSync(path.join(contentDir, targetFile), JSON.stringify(proposedState, null, 2));
        console.log(`✅ ${targetFile} updated successfully.`);

        // Remove from pending
        pendingData.pending.splice(changeIndex, 1);
        fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));
        console.log('🗑️ Change removed from pending list.');

        const githubToken = import.meta.env.GITHUB_TOKEN;
        const githubRepo = import.meta.env.GITHUB_REPO;
        const vercelHook = import.meta.env.VERCEL_DEPLOY_HOOK_URL;

        if (githubToken && githubRepo) {
            console.log(`🚀 Pushing update to GitHub (${githubRepo})...`);
            try {
                const filePath = `content/${targetFile}`;
                const fileContentStr = JSON.stringify(proposedState, null, 2);
                const fileContentBase64 = Buffer.from(fileContentStr).toString('base64');
                
                // Get the file's current SHA
                const getFileRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                    }
                });
                const fileData: any = await getFileRes.json();
                const sha = fileData.sha;

                // Put new file content
                const updateRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filePath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `Automated update for ${targetFile} via Email`,
                        content: fileContentBase64,
                        sha: sha
                    })
                });

                if (updateRes.ok) {
                    console.log(`✅ Successfully pushed ${targetFile} to GitHub.`);
                } else {
                    console.error('❌ Failed to push to GitHub:', await updateRes.text());
                }
            } catch (err) {
                console.error('❌ Error interacting with GitHub API:', err);
            }
        } else {
            console.log('⚠️ Skipping GitHub commit: GITHUB_TOKEN or GITHUB_REPO not set');
        }

        if (vercelHook) {
            console.log('🚀 Triggering Vercel Deploy Hook...');
            try {
                const vercelRes = await fetch(vercelHook, { method: 'POST' });
                if (vercelRes.ok) {
                    console.log('✅ Vercel Deploy Hook triggered successfully.');
                } else {
                    console.error('❌ Failed to trigger Vercel deploy hook:', await vercelRes.text());
                }
            } catch (err) {
                console.error('❌ Error triggering Vercel deploy hook:', err);
            }
        } else {
            console.log('⚠️ Skipping Vercel Deploy Hook: VERCEL_DEPLOY_HOOK_URL not set');
        }

    } catch (e) {
        console.error('💥 Error applying change:', e);
    }
}
