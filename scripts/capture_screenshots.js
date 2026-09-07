import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const SCREENSHOT_DIR = path.resolve('./screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const DASHBOARDS = [
  { tab: 'mr_dashboard', filename: 'mr_dashboard.png', label: 'Management Review Command Center' },
  { tab: 'dcr_workflow', filename: 'dcr_workflow.png', label: 'Document Change Request' },
  { tab: 'compliance_map', filename: 'compliance_map.png', label: 'ISO 9001 Gap Map' },
  { tab: 'objectives', filename: 'objectives.png', label: 'Strategic Objectives' },
  { tab: 'voc', filename: 'voc.png', label: 'Unified VoC / Client Intake' },
  { tab: 'pms', filename: 'pms.png', label: 'Customer Satisfaction CSI Dashboard' },
  { tab: 'suppliers', filename: 'suppliers.png', label: 'Approved Vendors / Supplier Dashboard' },
  { tab: 'calibration_register', filename: 'calibration_register.png', label: 'Calibration Register' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function run() {
  console.log('--- Starting QMS Dashboard Screenshot Capture ---');

  // Verify preview server is alive
  try {
    const res = await fetch('http://localhost:4173');
    if (!res.ok) throw new Error(`Status ${res.status}`);
    console.log('Preview server is responding on http://localhost:4173');
  } catch (err) {
    console.error('Preview server not accessible on port 4173:', err.message);
    process.exit(1);
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(os.tmpdir(), 'qms-chrome-capture-' + Date.now());
  fs.mkdirSync(tempProfile, { recursive: true });

  console.log('Spawning headless Chrome instance...');
  const chromeArgs = [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempProfile}`,
    '--window-size=1440,900',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ];

  const chrome = spawn(chromePath, chromeArgs);
  chrome.on('error', (err) => {
    console.error('Failed to start Chrome:', err);
  });

  try {
    await waitForHttp('http://127.0.0.1:9222/json/version', 10000);
    console.log('Chrome remote debugging interface ready.');

    const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No page target with webSocketDebuggerUrl found in Chrome');
    }

    console.log('Connecting to Chrome CDP at:', pageTarget.webSocketDebuggerUrl);
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id && callbacks.has(data.id)) {
          const { resolve, reject } = callbacks.get(data.id);
          callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Seed project data so wizard does not appear
    const seedScript = `
      localStorage.setItem('qatrial:project', JSON.stringify({
        state: {
          project: {
            id: 'proj-plant-tech-001',
            name: 'Plant-Tech Arabia QMS ISO 9001:2015',
            version: '3.0.0',
            description: 'ISO 9001:2015 Quality Management Platform',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z'
          }
        },
        version: 0
      }));
    `;
    await send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });

    // Initial navigation
    console.log('Navigating to http://localhost:4173 ...');
    await send('Page.navigate', { url: 'http://localhost:4173/' });
    await sleep(2000);

    // Also run seed in current context to be 100% sure
    await send('Runtime.evaluate', { expression: seedScript });
    await sleep(500);

    for (const item of DASHBOARDS) {
      console.log(`\nCapturing [${item.tab}] -> ${item.filename} (${item.label})...`);
      
      // Navigate or click tab
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btn = document.querySelector('[data-tab="${item.tab}"]');
            if (btn) {
              btn.click();
              return 'clicked';
            }
            // fallback: find button by text
            const buttons = Array.from(document.querySelectorAll('button'));
            const match = buttons.find(b => b.textContent && b.textContent.includes('${item.tab}'));
            if (match) {
              match.click();
              return 'clicked-by-text';
            }
            return 'not-found';
          })()
        `
      });

      // Wait 1.5s for chunk to load, render, charts to draw
      await sleep(1500);

      // Capture screenshot
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const targetPath = path.join(SCREENSHOT_DIR, item.filename);
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(targetPath, buffer);

      const size = fs.statSync(targetPath).size;
      console.log(`Saved: ${targetPath} (${size} bytes)`);
      if (size < 10000) {
        console.warn(`Warning: file size ${size} is smaller than expected.`);
      }
    }

    ws.close();
    console.log('\n--- All 8 screenshots captured successfully! ---');
  } finally {
    try {
      chrome.kill('SIGTERM');
    } catch (_) {}
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (_) {}
  }
}

run().catch((err) => {
  console.error('Fatal error capturing screenshots:', err);
  process.exit(1);
});
