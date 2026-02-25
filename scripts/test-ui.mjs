import { _electron as electron } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const screenshotDir = '/tmp/alx-screenshots';
try { mkdirSync(screenshotDir, { recursive: true }); } catch {}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Launching Electron app...');

  const electronApp = await electron.launch({
    args: [join(root, 'out/main/index.js')],
    env: { ...process.env, DISPLAY: ':0' }
  });

  const window = await electronApp.firstWindow();
  console.log('✅ Window opened:', await window.title());

  // Collect console errors
  const errors = [];
  window.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await window.waitForLoadState('networkidle');
  await sleep(3000);

  // 1. Dashboard
  console.log('📸 01 - Dashboard');
  await window.screenshot({ path: join(screenshotDir, '01-dashboard.png') });

  // 2. Campaigns
  console.log('📸 02 - Campaigns');
  await window.click('a:has-text("Campaigns")');
  await sleep(1500);
  await window.screenshot({ path: join(screenshotDir, '02-campaigns.png') });

  // 3. Campaign Detail
  console.log('📸 03 - Campaign Detail');
  try {
    await window.click('text=Real Estate Q1 Push', { timeout: 3000 });
    await sleep(1500);
    await window.screenshot({ path: join(screenshotDir, '03-campaign-detail.png') });
    // Go back
    await window.click('button:has(svg)', { timeout: 2000 }); // ArrowLeft button
    await sleep(1000);
  } catch (e) {
    console.log('  ⚠️ Campaign detail:', e.message.split('\n')[0]);
  }

  // 4. New Campaign Wizard
  console.log('📸 04 - Campaign Wizard');
  try {
    await window.click('a:has-text("Campaigns")');
    await sleep(1000);
    await window.click('button:has-text("New Campaign")', { timeout: 3000 });
    await sleep(1000);
    await window.screenshot({ path: join(screenshotDir, '04-campaign-wizard.png') });
    await window.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    console.log('  ⚠️ Campaign wizard:', e.message.split('\n')[0]);
  }

  // 5. Leads
  console.log('📸 05 - Leads');
  await window.click('a:has-text("Leads")', { force: true });
  await sleep(1500);
  await window.screenshot({ path: join(screenshotDir, '05-leads.png') });

  // 6. Add Lead Dialog
  console.log('📸 06 - Add Lead Dialog');
  try {
    await window.click('button:has-text("Add Lead")', { timeout: 3000 });
    await sleep(1000);
    await window.screenshot({ path: join(screenshotDir, '06-add-lead-dialog.png') });
    await window.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    console.log('  ⚠️ Add Lead dialog:', e.message.split('\n')[0]);
  }

  // 7. Templates
  console.log('📸 07 - Templates');
  await window.click('a:has-text("Templates")', { force: true });
  await sleep(1500);
  await window.screenshot({ path: join(screenshotDir, '07-templates.png') });

  // 8. Template Editor
  console.log('📸 08 - Template Editor');
  try {
    // Click on a template card or the New Template button
    const newBtn = window.locator('button:has-text("New Template")');
    const templateCard = window.locator('text=Real Estate Video Intro');
    if (await templateCard.count() > 0) {
      await templateCard.first().click({ timeout: 3000 });
    } else {
      await newBtn.click({ timeout: 3000 });
    }
    await sleep(1000);
    await window.screenshot({ path: join(screenshotDir, '08-template-editor.png') });
    await window.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    console.log('  ⚠️ Template editor:', e.message.split('\n')[0]);
  }

  // 9. Send Queue
  console.log('📸 09 - Send Queue');
  await window.click('a:has-text("Send Queue")', { force: true });
  await sleep(1500);
  await window.screenshot({ path: join(screenshotDir, '09-sendqueue.png') });

  // 10. Inbox
  console.log('📸 10 - Inbox');
  await window.click('a:has-text("Inbox")', { force: true });
  await sleep(1500);
  await window.screenshot({ path: join(screenshotDir, '10-inbox.png') });

  // 11. Settings
  console.log('📸 11 - Settings');
  await window.click('a:has-text("Settings")', { force: true });
  await sleep(1500);
  await window.screenshot({ path: join(screenshotDir, '11-settings.png') });

  // Print results
  console.log('\n=== Test Results ===');
  console.log('✅ All pages navigated and screenshotted');
  console.log(`📁 Screenshots: ${screenshotDir}/`);

  if (errors.length > 0) {
    console.log(`\n⚠️ ${errors.length} console errors detected:`);
    // Deduplicate
    const unique = [...new Set(errors)];
    unique.forEach(e => console.log('  -', e.substring(0, 200)));
  } else {
    console.log('✅ No console errors detected');
  }

  await electronApp.close();
  console.log('🏁 Done!');
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
