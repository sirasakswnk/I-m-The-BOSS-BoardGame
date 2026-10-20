import { expect, test, type Browser, type Page } from '@playwright/test';

async function openHome(page: Page, nickname: string) {
  await page.goto('/');
  await page.getByTestId('nickname-input').fill(nickname);
}

async function createRoom(page: Page, nickname: string): Promise<string> {
  await openHome(page, nickname);
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/[1-9]\d{4}$/);
  const code = new URL(page.url()).pathname.slice(1);
  await expect(page.getByTestId('room-code')).toHaveText(code);
  return code;
}

async function joinFromInvite(page: Page, code: string, nickname: string) {
  await page.goto(`/${code}`);
  await page.getByTestId('join-nickname-input').fill(nickname);
  await page.getByTestId('join-room-invite').click();
  await expect(page.getByTestId('lobby')).toBeVisible();
}

function playerCard(page: Page, name: string) {
  return page.locator('[data-testid^="player-"]').filter({ hasText: name });
}

test('host leaving an empty lobby deletes the room', async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const code = await createRoom(page, 'Solo');
    await page.getByTestId('leave-room').click();
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('rejoin-banner')).toHaveCount(0);

    await page.goto(`/${code}`);
    await expect(page.getByTestId('room-status-title')).toHaveText('ไม่พบห้องนี้');
  } finally {
    await context.close();
  }
});

test('three anonymous tabs join, refresh, dedupe names and show offline', async ({
  browser,
}: {
  browser: Browser;
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const thirdContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const third = await thirdContext.newPage();

  try {
    const code = await createRoom(host, 'Fern');
    await expect(playerCard(host, 'Fern')).toHaveCount(1);

    await hostContext.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://localhost:5174',
    });
    await host.getByTestId('copy-invite').click();
    const copiedInvite = await host.evaluate(() => navigator.clipboard.readText());
    expect(copiedInvite).toContain(`/${code}`);

    await openHome(guest, 'Fern');
    await guest.getByTestId('room-code-input').fill(code);
    await expect(guest.getByTestId('code-hint')).toContainText('Fern 2');
    await guest.getByTestId('join-room').click();
    await expect(guest.getByTestId('lobby')).toBeVisible();
    await expect(playerCard(guest, 'Fern 2')).toHaveCount(1);

    await joinFromInvite(third, code, 'Cara');
    await expect(host.getByTestId(/^player-/)).toHaveCount(3);
    await expect(playerCard(host, 'Cara')).toHaveCount(1);

    const caraCard = playerCard(host, 'Cara');
    await expect(caraCard).toHaveAttribute('data-connected', 'true');

    await guest.reload();
    await expect(guest.getByTestId('lobby')).toBeVisible();
    await expect(playerCard(guest, 'Fern 2')).toHaveCount(1);

    await thirdContext.close();
    await expect(caraCard).toHaveAttribute('data-connected', 'false', { timeout: 20_000 });

    await host.getByRole('link', { name: 'กลับหน้าแรก' }).click();
    await expect(host.getByTestId('home-page')).toBeVisible();
    await expect(host.getByTestId('rejoin-banner')).toContainText(code);
  } finally {
    await Promise.allSettled([
      hostContext.close(),
      guestContext.close(),
      thirdContext.close(),
    ]);
  }
});
