/**
 * Test script for LiveKit text agent using @livekit/rtc-node.
 */
import { Room, RoomEvent } from '@livekit/rtc-node';

const DASHBOARD_URL = 'http://localhost:3000';
const AGENT_ID = 'd46612fb-1ddb-4927-b490-42f74670675a';

async function main() {
  console.log('[TEST] Getting token...');
  const res = await fetch(`${DASHBOARD_URL}/api/livekit/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: AGENT_ID }),
  });
  const { token, serverUrl, roomName } = await res.json();
  console.log(`[TEST] Room: ${roomName}, Server: ${serverUrl}`);

  const room = new Room();
  const agentMessages = [];

  // Register text stream handlers for agent responses
  function makeHandler(label) {
    return (reader, ...rest) => {
      const identity = typeof rest[0] === 'string' ? rest[0] : (rest[0]?.identity || '');
      reader.readAll().then(text => {
        if (String(identity).startsWith('dashboard')) return;
        const trimmed = text.trim();
        if (trimmed) {
          console.log(`\n  [AGENT/${label}] ${trimmed}`);
          if (label !== 'events') agentMessages.push(trimmed);
        }
      }).catch(() => {});
    };
  }

  room.registerTextStreamHandler('lk.transcription', makeHandler('transcription'));
  room.registerTextStreamHandler('lk.chat', makeHandler('chat'));
  room.registerTextStreamHandler('lk.agent.events', makeHandler('events'));

  // Also listen for transcription events
  room.on(RoomEvent.ChatMessage, (msg, participant) => {
    if (participant?.identity?.startsWith('dashboard')) return;
    console.log(`\n  [AGENT/chatmsg] ${msg.message || JSON.stringify(msg)}`);
  });

  console.log('[TEST] Connecting...');
  await room.connect(serverUrl, token, { autoSubscribe: true });
  console.log('[TEST] Connected! Waiting 15s for greeting...\n');
  await sleep(15000);

  // Test conversation
  const steps = [
    { msg: 'Консультація', wait: 12000, desc: 'Answer: what service?' },
    { msg: 'Так, хочу записатися', wait: 12000, desc: 'Wants booking -> TRUE' },
    { msg: 'Завтра', wait: 15000, desc: 'Date for check_slots tool' },
    { msg: 'О десятій', wait: 12000, desc: 'Time selection' },
    { msg: 'Іван Петренко', wait: 12000, desc: 'Patient name' },
    { msg: 'Так, правильно', wait: 12000, desc: 'Confirm phone' },
  ];

  for (const { msg, wait, desc } of steps) {
    console.log(`\n[USER] ${msg}  (${desc})`);
    const lp = room.localParticipant;
    try {
      await lp.sendText(msg, { topic: 'lk.chat' });
    } catch (e1) {
      console.log(`  [WARN] sendText failed: ${e1.message}, trying sendChatMessage...`);
      try {
        await lp.sendChatMessage(msg);
      } catch (e2) {
        console.log(`  [WARN] sendChatMessage also failed: ${e2.message}`);
      }
    }
    await sleep(wait);
  }

  console.log('\n\n========== RESULTS ==========');
  console.log(`Total agent messages: ${agentMessages.length}`);
  agentMessages.forEach((m, i) => console.log(`  ${i + 1}. ${m.substring(0, 200)}`));
  console.log('=============================\n');

  await room.disconnect();
  process.exit(0);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => {
  console.error('[TEST] Fatal:', err.message || err);
  process.exit(1);
});
