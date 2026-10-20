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

async function startThreePlayerGame(browser: Browser): Promise<{
  pages: Page[];
  close: () => Promise<void>;
}> {
  const contexts = [await browser.newContext(), await browser.newContext(), await browser.newContext()];
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [host, guest, third] = pages;

  const code = await createRoom(host, 'Host');
  await joinFromInvite(guest, code, 'Guest');
  await joinFromInvite(third, code, 'Third');
  await expect(host.getByTestId(/^player-/)).toHaveCount(3);
  await host.getByTestId('start-game').click();

  for (const page of pages) {
    await expect(page.getByTestId('game-room')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(5);
  }

  let picker: Page | null = null;
  for (const page of pages) {
    if (await page.getByTestId('start-space-1').isVisible()) {
      picker = page;
      break;
    }
  }
  expect(picker).not.toBeNull();
  await picker!.getByTestId('start-space-1').click();

  for (const page of pages) {
    await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น', {
      timeout: 20_000,
    });
  }

  return {
    pages,
    close: async () => {
      await Promise.allSettled(contexts.map((context) => context.close()));
    },
  };
}

async function findBossPage(pages: Page[]): Promise<Page> {
  for (const page of pages) {
    if (await page.getByTestId('open-deal').isVisible()) return page;
  }
  throw new Error('No boss page found');
}

async function openDeal(page: Page): Promise<void> {
  const openButton = page.getByTestId('open-deal');
  await expect(openButton).toBeVisible();

  while (await openButton.isDisabled()) {
    const chip = page
      .locator('.table-exclusions button.table-family-chip[aria-pressed="false"]')
      .first();
    if ((await chip.count()) === 0) break;
    await chip.click();
  }

  await expect(openButton).toBeEnabled();
  await openButton.click();
  await expect(page.getByTestId('deal-panel')).toContainText('ล้มดีล', {
    timeout: 20_000,
  });
  await expect(page.getByTestId('lock-deal')).toBeDisabled();
}

test('empty turn: boss opens a deal, fails it and the turn ends', async ({ browser }) => {
  const game = await startThreePlayerGame(browser);
  try {
    const boss = await findBossPage(game.pages);
    await openDeal(boss);
    await boss.getByTestId('fail-deal').click();
    await expect(boss.getByTestId('game-log')).toContainText('ล้มดีลช่อง', {
      timeout: 20_000,
    });
  } finally {
    await game.close();
  }
});

test('dice turn: boss rolls, draws three cards and finishes the turn', async ({ browser }) => {
  const game = await startThreePlayerGame(browser);
  try {
    const boss = await findBossPage(game.pages);
    await boss.getByTestId('roll-dice').click();
    await expect(boss.getByTestId('draw-cards')).toBeVisible({ timeout: 20_000 });
    await expect(boss.getByTestId('dice-face')).not.toHaveAttribute('data-face', '');

    const hand = boss.getByTestId('my-hand').locator('[data-card-id]');
    await expect(hand).toHaveCount(5);
    await boss.getByTestId('draw-cards').click();
    await expect(hand).toHaveCount(8, { timeout: 20_000 });
    await expect(boss.getByTestId('game-log')).toContainText('จั่วการ์ด 3 ใบ');
    await expect(boss.getByTestId('draw-cards')).toHaveCount(0);
  } finally {
    await game.close();
  }
});
