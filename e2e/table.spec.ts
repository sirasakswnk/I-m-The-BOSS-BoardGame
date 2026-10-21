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

async function startThreePlayerGame(
  browser: Browser,
  startSpace = 1,
): Promise<{
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
    if (await page.getByTestId(`start-space-${startSpace}`).isVisible()) {
      picker = page;
      break;
    }
  }
  expect(picker).not.toBeNull();
  await picker!.getByTestId(`start-space-${startSpace}`).click();

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

async function myInvestorColors(page: Page): Promise<string[]> {
  return page
    .locator('.table-mine-seat .table-investor[data-family]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-family') ?? ''));
}

async function submitTableOffer(page: Page, color: string): Promise<void> {
  await expect(page.getByTestId('offer-open')).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId('offer-open').click();
  await expect(page.getByTestId('offer-modal')).toBeVisible();
  await page.getByTestId(`offer-investor-${color}`).click();
  await expect(page.getByTestId('offer-amount')).toHaveValue('1');
  await page.getByTestId('offer-submit').click();
  await expect(page.getByTestId('offer-modal')).toHaveCount(0);
  await expect(page.getByTestId('offer-open')).toBeEnabled({ timeout: 20_000 });
}

async function acceptOffer(page: Page, color: string): Promise<void> {
  const accept = page.locator(
    `[data-testid^="accept-offer-"][data-offer-color="${color}"]`,
  );
  await expect(accept).toBeVisible({ timeout: 20_000 });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(page.getByTestId(`unaccept-offer-${color}`)).toBeVisible({
    timeout: 20_000,
  });
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

test('three players close the first deal with table offers', async ({ browser }) => {
  const game = await startThreePlayerGame(browser, 3);
  try {
    const boss = await findBossPage(game.pages);
    await openDeal(boss);

    const requiredColors = ['red', 'blue', 'black'];
    const bossColors = await myInvestorColors(boss);
    const missingColors = requiredColors.filter((color) => !bossColors.includes(color));
    expect(missingColors.length).toBeGreaterThan(0);

    const offeredByPage = new Map<Page, number>();
    for (const color of missingColors) {
      const owner = (
        await Promise.all(
          game.pages
            .filter((page) => page !== boss)
            .map(async (page) => ({
              page,
              colors: await myInvestorColors(page),
            })),
        )
      ).find((entry) => entry.colors.includes(color))?.page;
      expect(owner, `No investor found for ${color}`).toBeDefined();
      await submitTableOffer(owner!, color);
      offeredByPage.set(owner!, (offeredByPage.get(owner!) ?? 0) + 1);
    }

    await expect(boss.getByTestId('deal-capacity')).toHaveText('รับแล้ว 0/4 ส่วน');
    for (const color of missingColors) {
      await acceptOffer(boss, color);
    }
    await expect(boss.getByTestId('deal-capacity')).toHaveText(
      `รับแล้ว ${missingColors.length}/4 ส่วน`,
    );
    const firstColor = missingColors[0];
    await boss.getByTestId(`unaccept-offer-${firstColor}`).click();
    await expect(
      boss.locator(
        `[data-testid^="accept-offer-"][data-offer-color="${firstColor}"]`,
      ),
    ).toBeVisible({ timeout: 20_000 });
    await expect(boss.getByTestId('deal-capacity')).toHaveText(
      `รับแล้ว ${missingColors.length - 1}/4 ส่วน`,
    );
    await acceptOffer(boss, firstColor);
    await expect(boss.getByTestId('deal-capacity')).toHaveText(
      `รับแล้ว ${missingColors.length}/4 ส่วน`,
    );

    const lock = boss.getByTestId('lock-deal');
    await expect(lock).toBeEnabled();
    await lock.click();
    await expect(boss.getByTestId('deal-panel')).toContainText('ช่วงป่วนดีล', {
      timeout: 20_000,
    });
    await expect(boss.getByTestId('game-log')).toContainText('ปิดดีลช่อง 3', {
      timeout: 30_000,
    });

    const bossShare = (4 - missingColors.length) * 2;
    await expect(boss.getByTestId('my-money')).toHaveText(`${bossShare} ล้าน`, {
      timeout: 20_000,
    });
    await expect(boss.getByTestId('money-delta')).toBeVisible();
    for (const [page, count] of offeredByPage) {
      await expect(page.getByTestId('my-money')).toHaveText(`${count * 2} ล้าน`, {
        timeout: 20_000,
      });
      await expect(page.getByTestId('money-delta')).toBeVisible();
    }
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
