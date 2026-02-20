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

        // TODO: Here is where we would trigger the GitHub API push and Vercel Hook
        console.log('🚀 Local change complete. (GitHub push and Vercel hook omitted in local test)');

    } catch (e) {
        console.error('💥 Error applying change:', e);
    }
}
