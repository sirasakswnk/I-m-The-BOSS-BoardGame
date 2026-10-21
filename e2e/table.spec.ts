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

/**
 * Hands are random, so tests select the first card the UI says is legal. A
 * recruitment play needs three cards; the modal grid exposes enough state to
 * click the whole triptych before choosing a target.
 */
async function playAnyAction(
  pages: Page[],
  preferNonStop = false,
): Promise<Page | null> {
  for (const page of pages) {
    const open = page.getByTestId('play-card-open');
    if ((await open.count()) === 0) continue;
    if (!(await open.isVisible().catch(() => false))) continue;
    if (await open.isDisabled().catch(() => true)) continue;

    await open.click();
    const modal = page.getByTestId('action-card-modal');
    try {
      await modal.waitFor({ state: 'visible', timeout: 2_000 });
    } catch {
      continue;
    }

    const cards = modal.locator('[data-action-kind]:not([disabled])');
    const kinds = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-action-kind')),
    );
    const order = kinds.map((kind, index) => ({ kind, index }));
    if (preferNonStop) {
      order.sort(
        (left, right) =>
          Number(left.kind === 'stop') - Number(right.kind === 'stop'),
      );
    }
    for (const { kind, index } of order) {
      const card = cards.nth(index);
      await card.click();

      if (kind === 'recruitment') {
        const parts = modal.locator(
          '[data-action-kind="recruitment"]:not([disabled])',
        );
        const partCount = await parts.count();
        for (let part = 0; part < partCount; part += 1) {
          const choice = parts.nth(part);
          if ((await choice.getAttribute('aria-pressed')) !== 'true') {
            await choice.click();
          }
        }
      }

      const targets = modal.locator(
        '[data-testid^="action-target-"]:not([disabled])',
      );
      if ((await targets.count()) > 0) {
        await targets.first().click();
      }

      const submit = modal.getByTestId('action-submit');
      if (await submit.isEnabled()) {
        const logBefore = await page
          .getByTestId('game-log')
          .innerText()
          .catch(() => '');
        await submit.click();
        await expect(modal).toHaveCount(0, { timeout: 5_000 });

        for (let wait = 0; wait < 50; wait += 1) {
          const toast = page.locator('.toast-error');
          if ((await toast.count()) > 0) {
            throw new Error(
              `Action ${kind ?? 'unknown'} was rejected: ${await toast.first().innerText()}`,
            );
          }
          const logNow = await page
            .getByTestId('game-log')
            .innerText()
            .catch(() => null);
          if (logNow !== null && logNow !== logBefore) {
            return page;
          }
          await page.waitForTimeout(100);
        }

        throw new Error(
          `Action ${kind ?? 'unknown'} was not accepted: game log did not change`,
        );
      }
    }

    await modal
      .locator('.app-modal-close')
      .click()
      .catch(() => undefined);
    await expect(modal)
      .toHaveCount(0, { timeout: 3_000 })
      .catch(() => undefined);
  }

  return null;
}

async function throttleNetwork(page: Page, latency: number) {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  return session;
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
    await expect(boss.getByTestId('interrupt-cancel-lock')).toBeVisible({
      timeout: 20_000,
    });
    await boss.getByTestId('interrupt-cancel-lock').click();
    await expect(lock).toBeEnabled({ timeout: 20_000 });
    await expect(boss.getByTestId('interrupt-bar')).toHaveCount(0, {
      timeout: 20_000,
    });
    await lock.click();
    await expect(boss.getByTestId('interrupt-bar')).toBeVisible({
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

test('action cards stack, reset the window and close when all others pass', async ({
  browser,
}) => {
  const game = await startThreePlayerGame(browser);
  try {
    const boss = await findBossPage(game.pages);
    await openDeal(boss);

    const firstPage = await playAnyAction(game.pages);
    expect(firstPage, 'No player had a playable action card').not.toBeNull();
    const firstActor = firstPage!;

    await expect(firstActor.getByTestId('interrupt-bar')).toBeVisible({
      timeout: 20_000,
    });
    await expect(firstActor.getByTestId('pending-count')).toHaveText('1 ใบ');

    const remainingBefore = Number(
      await firstActor
        .getByTestId('interrupt-countdown')
        .getAttribute('data-remaining-ms'),
    );
    await firstActor.waitForTimeout(1_100);
    const remainingAfter = Number(
      await firstActor
        .getByTestId('interrupt-countdown')
        .getAttribute('data-remaining-ms'),
    );
    expect(remainingAfter).toBeLessThan(remainingBefore - 500);

    const deadlineBefore = Number(
      await firstActor
        .getByTestId('interrupt-countdown')
        .getAttribute('data-deadline'),
    );

    const secondPage = await playAnyAction(game.pages, true);
    expect(secondPage, 'No player could stack a second action card').not.toBeNull();
    const trigger = secondPage!;

    await expect(trigger.getByTestId('pending-queue')).toBeVisible({
      timeout: 20_000,
    });
    await expect
      .poll(
        async () =>
          Number(
            await trigger
              .getByTestId('interrupt-countdown')
              .getAttribute('data-deadline'),
          ),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(deadlineBefore);
    const deadlineAfter = Number(
      await trigger
        .getByTestId('interrupt-countdown')
        .getAttribute('data-deadline'),
    );
    expect(deadlineAfter).toBeGreaterThan(deadlineBefore);

    const otherPages = game.pages.filter((page) => page !== trigger);
    expect(otherPages).toHaveLength(2);

    const session = await throttleNetwork(otherPages[0], 450);
    const delayedPass = otherPages[0].getByTestId('interrupt-pass');
    await expect(delayedPass).toBeEnabled();
    await delayedPass.click();
    await expect(
      otherPages[0].getByTestId('interrupt-pass-count'),
    ).toContainText('1/2', { timeout: 5_000 });
    await expect(delayedPass).toBeDisabled();

    const lastPass = otherPages[1].getByTestId('interrupt-pass');
    await expect(lastPass).toBeEnabled();
    await lastPass.click();

    await expect(trigger.getByTestId('interrupt-bar')).toHaveCount(0, {
      timeout: 2_000,
    });
    await expect(trigger.getByTestId('pending-queue')).toHaveCount(0, {
      timeout: 5_000,
    });

    await session
      .send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      })
      .catch(() => undefined);
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
