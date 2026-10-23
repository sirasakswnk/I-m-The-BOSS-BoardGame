import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

import { getDealSpace } from '../src/engine/config/dealBoard';
import { getDealTile } from '../src/engine/config/dealTiles';

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
  // An invite opens the join gate first; the visitor is not a member until
  // they enter a name and press the join button.
  await expect(page.getByTestId('join-action-card')).toBeVisible();
  await expect(page.getByTestId('join-nickname-input')).toBeInViewport();
  await expect(page.getByTestId('join-room-invite')).toBeInViewport({ ratio: 1 });
  await page.getByTestId('join-nickname-input').fill(nickname);
  await page.getByTestId('join-room-invite').click();
  await expect(page.getByTestId('lobby')).toBeVisible();
}

async function startThreePlayerGame(browser: Browser): Promise<{
  code: string;
  pages: Page[];
  close: () => Promise<void>;
}> {
  const contexts = [
    await browser.newContext(),
    await browser.newContext(),
    await browser.newContext(),
  ];
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
    await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น', {
      timeout: 20_000,
    });
  }

  return {
    code,
    pages,
    close: async () => {
      await Promise.allSettled(contexts.map((context) => context.close()));
    },
  };
}

async function findBossPage(pages: Page[]): Promise<Page> {
  for (const page of pages) {
    for (const testId of ['roll-dice', 'open-deal', 'draw-cards']) {
      if (await page.getByTestId(testId).isVisible()) return page;
    }
  }
  throw new Error('No boss page found');
}

async function openDeal(page: Page): Promise<void> {
  const roll = page.getByTestId('roll-dice');
  if (await roll.isVisible()) {
    await roll.click();
    await expect(page.getByTestId('draw-cards')).toBeVisible({ timeout: 20_000 });
  }

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

async function submitTableOffer(page: Page, colors: string[]): Promise<void> {
  await expect(page.getByTestId('offer-open')).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId('offer-open').click();
  await expect(page.getByTestId('offer-modal')).toBeVisible();
  for (const color of colors) {
    const picker = page.getByTestId(`offer-investor-${color}`);
    await expect(picker).toBeVisible();
    await picker.click();
  }
  await expect(page.getByTestId('offer-amount')).toHaveValue('1');
  await page.getByTestId('offer-submit').click();
  await expect(page.getByTestId('offer-modal')).toHaveCount(0);
  await page.waitForTimeout(250);
  const toast = page.locator('.toast-error');
  if ((await toast.count()) > 0) {
    throw new Error(`Offer rejected: ${await toast.first().innerText()}`);
  }
  await expect(page.getByTestId('offer-open')).toBeEnabled({ timeout: 20_000 });
}

/** Re-submits the current offer unchanged, which must revoke boss acceptance. */
async function resubmitOffer(page: Page): Promise<void> {
  await expect(page.getByTestId('offer-open')).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId('offer-open').click();
  await expect(page.getByTestId('offer-modal')).toBeVisible();
  await expect(page.getByTestId('offer-accepted-note')).toBeVisible();
  await page.getByTestId('offer-submit').click();
  await expect(page.getByTestId('offer-modal')).toHaveCount(0);
}

async function myUid(page: Page): Promise<string> {
  const seat = page.locator('.table-mine-seat[data-testid^="game-player-"]');
  // The compact/mobile layout keeps the seat node in the DOM but hidden.
  await expect(seat).toHaveCount(1);
  const testId = await seat.getAttribute('data-testid');
  return testId?.replace('game-player-', '') ?? '';
}

async function openOfferReview(page: Page): Promise<Locator> {
  const modal = page.getByTestId('offer-review-modal');
  if ((await modal.count()) === 0) {
    const open = page.getByTestId('offer-review-open');
    await expect(open).toBeVisible({ timeout: 20_000 });
    await open.click();
  }
  await expect(modal).toBeVisible({ timeout: 20_000 });
  return modal;
}

async function closeOfferReview(page: Page): Promise<void> {
  const modal = page.getByTestId('offer-review-modal');
  if ((await modal.count()) === 0) return;
  await modal.getByRole('button', { name: 'ปิด' }).click();
  await expect(modal).toHaveCount(0);
}

async function acceptOffer(page: Page, targetUid: string): Promise<void> {
  const review = await openOfferReview(page);
  const accept = review.getByTestId(`accept-offer-${targetUid}`);
  await expect(accept).toBeVisible({ timeout: 20_000 });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(review.getByTestId(`unaccept-offer-${targetUid}`)).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Hands are random, so tests select the first card the UI says is legal. A
 * recruitment play needs three cards; the modal grid exposes enough state to
 * click the whole triptych before choosing a target.
 */
async function playAnyAction(pages: Page[], preferNonStop = false): Promise<Page | null> {
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
      order.sort((left, right) => Number(left.kind === 'stop') - Number(right.kind === 'stop'));
    }
    for (const { kind, index } of order) {
      const card = cards.nth(index);
      await card.click();

      if (kind === 'recruitment') {
        const parts = modal.locator('[data-action-kind="recruitment"]:not([disabled])');
        const partCount = await parts.count();
        for (let part = 0; part < partCount; part += 1) {
          const choice = parts.nth(part);
          if ((await choice.getAttribute('aria-pressed')) !== 'true') {
            await choice.click();
          }
        }
      }

      const targets = modal.locator('[data-testid^="action-target-"]:not([disabled])');
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

        throw new Error(`Action ${kind ?? 'unknown'} was not accepted: game log did not change`);
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

test('empty turn: the first boss must roll, then opens and fails a deal', async ({ browser }) => {
  const game = await startThreePlayerGame(browser);
  try {
    const host = game.pages[0];

    // Rules are reachable from the table without leaving the game.
    await host.getByTestId('how-to-play-trigger').click();
    await expect(host.getByTestId('how-to-play')).toBeVisible();
    await expect(host.getByTestId('how-to-play')).toContainText('วิธีเล่นโต๊ะเจรจาดีล');
    await expect(host.getByTestId('how-to-play')).toContainText('ระบบสุ่มผู้เล่นคนแรก');
    await host.getByRole('button', { name: 'เข้าใจแล้ว กลับไปโต๊ะ' }).click();
    await expect(host.getByTestId('how-to-play')).toHaveCount(0);

    // Sound is opt-in and the toggle exposes its state.
    const sound = host.getByTestId('sound-toggle');
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');

    const boss = await findBossPage(game.pages);
    // Turn 1 starts on space 1 and the boss cannot open a deal yet.
    await expect(boss.getByTestId('game-room')).toContainText('เทิร์น 1');
    await expect(boss.getByTestId('open-deal')).toHaveCount(0);
    await expect(boss.getByTestId('roll-dice')).toBeVisible();
    await expect(boss.getByTestId('deal-panel')).toContainText('ทอยเต๋าก่อน');

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
  const game = await startThreePlayerGame(browser);
  try {
    const boss = await findBossPage(game.pages);
    await openDeal(boss);

    const title = await boss.getByTestId('deal-panel').locator('h2').innerText();
    const space = Number(/ดีลช่อง\s+(\d+)/.exec(title)?.[1]);
    expect(Number.isInteger(space) && space > 0).toBe(true);
    const requirements = getDealSpace(space);
    const value = getDealTile(1).valuePerDividend;

    const bossColors = await myInvestorColors(boss);
    const missingColors: string[] = [];
    for (const group of requirements.groups) {
      const bossCount = group.colors.filter((color) => bossColors.includes(color)).length;
      const needed = Math.max(0, group.pick - bossCount);
      missingColors.push(
        ...group.colors.filter((color) => !bossColors.includes(color)).slice(0, needed),
      );
    }

    const offeredByPage = new Map<Page, { page: Page; uid: string; colors: string[] }>();
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
      let offer = offeredByPage.get(owner!);
      if (!offer) {
        offer = { page: owner!, uid: await myUid(owner!), colors: [] };
        offeredByPage.set(owner!, offer);
      }
      offer.colors.push(color);
    }

    for (const entry of offeredByPage.values()) {
      await submitTableOffer(entry.page, entry.colors);
    }
    const acceptedOffers = offeredByPage.size;

    await expect(boss.getByTestId('deal-capacity')).toHaveText(
      `รับแล้ว 0/${requirements.dividends} ส่วน`,
    );

    // Every offer is reviewed in one boss panel, opened from the deal CTA.
    const review = await openOfferReview(boss);
    await expect(review.getByTestId('offer-review-capacity')).toHaveText(
      `0/${requirements.dividends}`,
    );
    for (const entry of offeredByPage.values()) {
      const row = review.getByTestId(`offer-review-row-${entry.uid}`);
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('data-accepted', 'false');
    }

    // On a phone the panel is the same full-width bottom sheet as other modals.
    const viewport = boss.viewportSize();
    if (viewport && viewport.width <= 640) {
      await expect(review).toBeInViewport();
      await expect(review).toHaveCSS('border-top-left-radius', '18px');
      await expect(review).toHaveCSS('border-bottom-left-radius', '0px');
      const firstOffer = [...offeredByPage.values()][0]!;
      const actionBox = await review
        .getByTestId(`accept-offer-${firstOffer.uid}`)
        .boundingBox();
      expect(actionBox).not.toBeNull();
      expect(actionBox!.height).toBeGreaterThanOrEqual(44);
      const widths = await boss.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    }

    for (const entry of offeredByPage.values()) {
      await acceptOffer(boss, entry.uid);
    }
    await expect(boss.getByTestId('deal-capacity')).toHaveText(
      `รับแล้ว ${acceptedOffers}/${requirements.dividends} ส่วน`,
    );
    await expect(review.getByTestId('offer-review-capacity')).toHaveText(
      `${acceptedOffers}/${requirements.dividends}`,
    );

    if (acceptedOffers > 0) {
      const first = [...offeredByPage.values()][0]!;

      // A seat summary opens the same panel focused on that player's offer.
      await closeOfferReview(boss);
      await boss.getByTestId(`offer-seat-${first.uid}`).click();
      await expect(review).toBeVisible({ timeout: 20_000 });
      await expect(review.getByTestId(`offer-review-row-${first.uid}`)).toHaveClass(
        /is-focused/,
      );

      // Editing an accepted offer revokes the whole acceptance automatically.
      await resubmitOffer(first.page);
      await expect(review.getByTestId(`accept-offer-${first.uid}`)).toBeVisible({
        timeout: 20_000,
      });
      await expect(boss.getByTestId('deal-capacity')).toHaveText(
        `รับแล้ว ${acceptedOffers - 1}/${requirements.dividends} ส่วน`,
      );
      await acceptOffer(boss, first.uid);

      // The boss can also revoke an acceptance explicitly, one offer at a time.
      await review.getByTestId(`unaccept-offer-${first.uid}`).click();
      await expect(review.getByTestId(`accept-offer-${first.uid}`)).toBeVisible({
        timeout: 20_000,
      });
      await expect(boss.getByTestId('deal-capacity')).toHaveText(
        `รับแล้ว ${acceptedOffers - 1}/${requirements.dividends} ส่วน`,
      );
      await acceptOffer(boss, first.uid);
    }

    await closeOfferReview(boss);
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
    await expect(boss.getByTestId('game-log')).toContainText(`ปิดดีลช่อง ${space}`, {
      timeout: 30_000,
    });

    const bossShare = (requirements.dividends - acceptedOffers) * value;
    await expect(boss.getByTestId('my-money')).toHaveText(`${bossShare} ล้าน`, {
      timeout: 20_000,
    });
    await expect(boss.getByTestId('money-delta')).toBeVisible();
    for (const entry of offeredByPage.values()) {
      // One accepted offer pays once even when it contains several families.
      await expect(entry.page.getByTestId('my-money')).toHaveText(`${value} ล้าน`, {
        timeout: 20_000,
      });
      await expect(entry.page.getByTestId('money-delta')).toBeVisible();
    }

    // The next boss cannot chain straight into the following space: they must
    // roll first, then the open-deal action becomes available.
    const nextBoss = await findBossPage(game.pages);
    await expect(nextBoss.getByTestId('open-deal')).toHaveCount(0);
    await expect(nextBoss.getByTestId('roll-dice')).toBeVisible();
    await nextBoss.getByTestId('roll-dice').click();
    await expect(nextBoss.getByTestId('game-room')).toContainText('หลังทอยเต๋า', {
      timeout: 20_000,
    });
    await expect(nextBoss.getByTestId('open-deal')).toBeVisible({ timeout: 20_000 });
  } finally {
    await game.close();
  }
});

test('action cards stack, reset the window and close when all others pass', async ({ browser }) => {
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
      await firstActor.getByTestId('interrupt-countdown').getAttribute('data-remaining-ms'),
    );
    await firstActor.waitForTimeout(1_100);
    const remainingAfter = Number(
      await firstActor.getByTestId('interrupt-countdown').getAttribute('data-remaining-ms'),
    );
    expect(remainingAfter).toBeLessThan(remainingBefore - 500);

    const deadlineBefore = Number(
      await firstActor.getByTestId('interrupt-countdown').getAttribute('data-deadline'),
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
          Number(await trigger.getByTestId('interrupt-countdown').getAttribute('data-deadline')),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(deadlineBefore);
    const deadlineAfter = Number(
      await trigger.getByTestId('interrupt-countdown').getAttribute('data-deadline'),
    );
    expect(deadlineAfter).toBeGreaterThan(deadlineBefore);

    const otherPages = game.pages.filter((page) => page !== trigger);
    expect(otherPages).toHaveLength(2);

    const session = await throttleNetwork(otherPages[0], 450);
    const delayedPass = otherPages[0].getByTestId('interrupt-pass');
    await expect(delayedPass).toBeEnabled();
    await delayedPass.click();
    await expect(otherPages[0].getByTestId('interrupt-pass-count')).toContainText('1/2', {
      timeout: 5_000,
    });
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

    // Every player sees the shared roll animation settle on the same face.
    const faces = new Set<string>();
    for (const page of game.pages) {
      const roll = page.getByTestId('dice-roll');
      await expect(roll).toHaveAttribute('data-face', /^[1-6]$/, { timeout: 10_000 });
      faces.add((await roll.getAttribute('data-face')) ?? '');
    }
    expect(faces.size).toBe(1);
    await expect(boss.getByTestId('dice-face')).toHaveAttribute('data-face', [...faces][0], {
      timeout: 10_000,
    });
    await expect(boss.getByTestId('dice-roll')).toHaveCount(0, { timeout: 10_000 });

    // A refresh does not replay a roll that already happened.
    const watcher = game.pages.find((page) => page !== boss)!;
    await watcher.reload();
    await expect(watcher.getByTestId('game-room')).toBeVisible({ timeout: 20_000 });
    await expect(watcher.getByTestId('deal-panel')).toBeVisible();
    await watcher.waitForTimeout(500);
    await expect(watcher.getByTestId('dice-roll')).toHaveCount(0);

    const hand = boss.getByTestId('my-hand').locator('[data-card-id]');
    await expect(hand).toHaveCount(5);
    await boss.getByTestId('draw-cards').click();
    await expect(hand).toHaveCount(8, { timeout: 20_000 });
    await expect(boss.getByTestId('game-log')).toContainText('จั่วการ์ด 3 ใบ');
    await expect(boss.getByTestId('draw-cards')).toHaveCount(0);

    // After the draw animation, the drawer's three new cards carry a ribbon.
    for (const page of game.pages) {
      await expect(page.getByTestId('draw-anim')).toHaveCount(0, { timeout: 10_000 });
    }
    const ribbons = boss.locator('[data-testid="my-hand"] .table-hand-card.is-new');
    await expect(ribbons).toHaveCount(3);
    await ribbons.first().dispatchEvent('click');
    await expect(ribbons).toHaveCount(2);
    const bossSeat = await boss.locator('.table-mine-seat').getAttribute('data-testid');
    await expect(watcher.getByTestId(bossSeat!).getByTestId('seat-hand-count')).toHaveText('+2 ×8');
  } finally {
    await game.close();
  }
});

test('closing the host tab migrates the host and keeps the table state', async ({ browser }) => {
  test.setTimeout(90_000);
  const game = await startThreePlayerGame(browser);
  const [host, guest] = game.pages;

  try {
    const handBefore = await guest
      .getByTestId('my-hand')
      .locator('[data-card-id]')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-card-id')));
    const moneyBefore = await guest.getByTestId('my-money').innerText();

    await host.context().close();

    await expect(guest.getByTestId('host-migration-notice')).toBeVisible({
      timeout: 20_000,
    });
    await expect(guest.getByTestId('host-migration-notice')).toHaveCount(0, {
      timeout: 25_000,
    });
    // The compact layout hides the key icon, but the host mark is still in the DOM.
    await expect(guest.locator('.table-mine-seat .table-host-mark')).toHaveCount(1, {
      timeout: 20_000,
    });

    // The host loop and authoritative state survived the change of owner.
    await expect(guest.getByTestId('game-room')).toContainText('ต้นเทิร์น');
    await expect(guest.getByTestId('game-room')).toContainText('Host');
    await expect(guest.getByTestId('my-money')).toHaveText(moneyBefore);
    const handAfter = await guest
      .getByTestId('my-hand')
      .locator('[data-card-id]')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-card-id')));
    expect(handAfter).toEqual(handBefore);
  } finally {
    await game.close();
  }
});

test('a new browser can reclaim a disconnected seat after host approval', async ({ browser }) => {
  test.setTimeout(90_000);
  const game = await startThreePlayerGame(browser);
  const [host, , third] = game.pages;
  let replacementContext: Awaited<ReturnType<Browser['newContext']>> | null = null;

  try {
    await third.context().close();

    replacementContext = await browser.newContext();
    const replacement = await replacementContext.newPage();
    await replacement.goto(`/${game.code}`);
    await expect(replacement.getByTestId('reclaim-view')).toBeVisible({
      timeout: 20_000,
    });

    await replacement.getByTestId('reclaim-nickname-input').fill('Third Again');
    await expect(replacement.getByTestId('reclaim-seat-2')).toBeVisible({
      timeout: 20_000,
    });
    await replacement.getByTestId('reclaim-seat-2').click();
    await expect(replacement.getByTestId('cancel-reclaim')).toBeVisible();

    const approve = host.getByTestId(/^approve-reclaim-/);
    await expect(approve).toBeVisible({ timeout: 20_000 });
    await approve.click();

    await expect(replacement.getByTestId('game-room')).toBeVisible({
      timeout: 20_000,
    });
    await expect(replacement.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(5);
    await expect(host.getByTestId('game-room')).toContainText('Third Again', {
      timeout: 20_000,
    });
  } finally {
    await replacementContext?.close();
    await game.close();
  }
});

test('drawing over the hand limit forces a discard before the next turn', async ({ browser }) => {
  test.setTimeout(120_000);
  const game = await startThreePlayerGame(browser);
  try {
    // The first boss draws on turns 1, 4 and 7; the third draw takes them to 14.
    let discardingBoss: Page | null = null;
    for (let turn = 1; turn <= 7; turn += 1) {
      const boss = await findBossPage(game.pages);
      await boss.getByTestId('roll-dice').click();
      await expect(boss.getByTestId('draw-cards')).toBeVisible({ timeout: 20_000 });
      await boss.getByTestId('draw-cards').click();

      if (turn === 7) {
        discardingBoss = boss;
        break;
      }
      await expect(boss.getByTestId('draw-cards')).toHaveCount(0, {
        timeout: 20_000,
      });
    }

    expect(discardingBoss).not.toBeNull();
    const boss = discardingBoss!;
    // The draw ends on an over-the-limit warning before the forced discard.
    await expect(boss.getByTestId('draw-overflow')).toBeVisible({ timeout: 20_000 });
    await expect(boss.getByTestId('draw-overflow')).toContainText('ต้องทิ้ง 2 ใบ');
    const modal = boss.getByTestId('discard-modal');
    await expect(modal).toBeVisible({ timeout: 20_000 });
    await expect(boss.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(14);
    await expect(boss.getByTestId('discard-count')).toContainText('0/2');

    await boss.keyboard.press('Escape');
    await expect(modal).toBeVisible();

    const cards = modal.locator('[data-testid^="discard-card-"]');
    await cards.nth(0).click();
    await cards.nth(1).click();
    await expect(boss.getByTestId('discard-count')).toContainText('2/2');
    await boss.getByTestId('discard-submit').click();

    await expect(modal).toHaveCount(0, { timeout: 20_000 });
    await expect(boss.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(12);
    await expect(boss.getByTestId('game-log')).toContainText('ทิ้งการ์ด 2 ใบ');
    await expect(boss.getByTestId('game-room')).toContainText('ต้นเทิร์น', {
      timeout: 20_000,
    });
  } finally {
    await game.close();
  }
});
