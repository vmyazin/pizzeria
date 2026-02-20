import type { APIRoute } from 'astro';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export const GET: APIRoute = async ({ request }) => {
  console.log('\n--- [CRON] Starting poll-email block ---');
  
  const config = {
      imap: {
          user: import.meta.env.GMAIL_USER || '',
          password: import.meta.env.GMAIL_APP_PASSWORD || '',
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          authTimeout: 3000,
          tlsOptions: { rejectUnauthorized: false }
      }
  };

  if (!config.imap.user || !config.imap.password) {
      console.error('❌ Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables.');
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), { 
          status: 500, headers: { 'Content-Type': 'application/json' } 
      });
  }

  try {
      console.log(`Connecting to IMAP server as ${config.imap.user}...`);
      const connection = await imaps.connect(config);
      console.log('✅ Connected to IMAP successfully.');

      console.log('Opening INBOX...');
      await connection.openBox('INBOX');

      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
          bodies: ['HEADER', 'TEXT', ''],
          markSeen: true // Mark as read so we don't process it twice
      };

      console.log('Searching for UNSEEN messages...');
      const messages = await connection.search(searchCriteria, fetchOptions);

      console.log(`Found ${messages.length} unread emails.`);

      for (const item of messages) {
          const all = item.parts.find((part) => part.which === '');
          const id = item.attributes.uid;
          const idHeader = `Imap-Id: ${id}\r\n`;

          if (all) {
              const parsed = await simpleParser(idHeader + all.body);
              console.log(`\n📧 Processing Email UID: ${id}`);
              console.log(`From: ${parsed.from?.value[0]?.address}`);
              console.log(`Subject: ${parsed.subject}`);
              console.log(`Body Snippet: ${parsed.text?.substring(0, 100)}...`);
              
              const sender = parsed.from?.value[0]?.address;
              if (sender && sender === import.meta.env.OWNER_EMAIL) {
                 const bodyText = (parsed.text || '').trim().toUpperCase();
                 const subject = parsed.subject || '';

                 if (subject.includes('[Confirm Update]') && bodyText.includes('YES')) {
                    const idMatch = subject.match(/ID: (\d+)/);
                    const changeId = idMatch ? idMatch[1] : null;
                    
                    if (changeId) {
                        console.log(`✅ Received approval for Change ID: ${changeId}. Applying now...`);
                        await applyPendingChange(changeId);
                    } else {
                        console.error('❌ Received YES but could not find Change ID in subject.');
                    }
                 } else {
                    console.log('✅ New modification request from owner. Sending to analyzer...');
                    await processEmailIntent(subject, parsed.text || '', sender);
                 }
              } else {
                 console.log(`⚠️ Ignored email from unauthorized sender: ${sender}`);
              }
          }
      }

      console.log('Closing IMAP connection...');
      connection.end();
      console.log('✅ Connections closed.');

      return new Response(JSON.stringify({ status: 'Success', messagesProcessed: messages.length }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
      });

  } catch (error) {
      console.error('💥 Error in IMAP process:', error);
      return new Response(JSON.stringify({ error: String(error) }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
      });
  }
}

import { analyzeEmailIntent } from '../../lib/process-change';
import { applyPendingChange } from '../../lib/apply-logic';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

async function processEmailIntent(subject: string, text: string, sender: string) {
    console.log(`\n[Analyzer] Spinning up Gemini to process intent for ${sender}...`);
    
    const analysisResult = await analyzeEmailIntent(subject, text);
    
    if (!analysisResult) {
        console.error('❌ Failed to get a valid response from Gemini.');
        return;
    }

    console.log('\n--- 📝 Preparing Pending Change ---');
    const pendingPath = path.join(process.cwd(), 'pending', 'pending-changes.json');
    let pendingData = { pending: [] as any[] };
    
    try {
        if (fs.existsSync(pendingPath)) {
            pendingData = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
        }
    } catch (e) {
        console.log('📝 Creating new pending-changes.json file...');
    }

    // Give it a unique ID
    const changeId = Date.now().toString();
    const newChange = {
        id: changeId,
        timestamp: new Date().toISOString(),
        requestor: sender,
        requestedSubject: subject,
        proposedState: analysisResult
    };

    pendingData.pending.push(newChange);
    
    fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));
    console.log(`✅ Pending change ${changeId} saved to disk waiting for approval.`);

    console.log('\n--- 📧 Sending Confirmation Email ---');
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: import.meta.env.GMAIL_USER,
            pass: import.meta.env.GMAIL_APP_PASSWORD
        }
    });

    const mailOptions = {
        from: import.meta.env.GMAIL_USER,
        to: sender,
        subject: `[Confirm Update] Giacomo's Pizza Website - ID: ${changeId}`,
        text: `Hello,\n\nI have analyzed your request ("${subject}").\n\nBased on my understanding, here is the exact JSON data that will be updated on the website:\n\n${JSON.stringify(analysisResult, null, 2)}\n\nIf this looks correct, please reply to this email exactly with "YES" to deploy this change live.\n\nThanks,\nGiacomo's Pizza Bot`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email sent to ${sender}. Waiting for "YES" reply.`);
    } catch (e) {
        console.error('❌ Failed to send confirmation email:', e);
    }
}
