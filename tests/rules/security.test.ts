import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  get,
  ref,
  remove,
  set,
  update,
  type Database,
} from 'firebase/database';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-im-the-boss-deal';
const ROOM = '12345';
const NOW = Date.now();

let testEnv: RulesTestEnvironment;

interface SeedPlayer {
  name: string;
  seat: number;
  connected: boolean;
  lastSeen: number;
  joinedAt: number;
}

function player(seat: number, name = `Player ${seat + 1}`): SeedPlayer {
  return {
    name,
    seat,
    connected: true,
    lastSeen: NOW,
    joinedAt: NOW + seat,
  };
}

function lobbyRoom(
  playerCount = 3,
  meta: Record<string, unknown> = {},
): Record<string, unknown> {
  const players: Record<string, SeedPlayer> = {};
  const uids = ['host', 'p1', 'p2', 'p3', 'p4', 'p5'];
  for (let index = 0; index < playerCount; index += 1) {
    players[uids[index]] = player(index);
  }

  return {
    meta: {
      hostUid: 'host',
      hostConnected: true,
      status: 'lobby',
      createdAt: NOW,
      schemaVersion: 1,
      ...meta,
    },
    players,
  };
}

function roomWithGameplay(): Record<string, unknown> {
  const room = lobbyRoom(3, { status: 'playing' });
  return {
    ...room,
    public: { phase: 'turnStart', turnNumber: 1 },
    private: {
      p1: { hand: [{ id: 'c1', kind: 'recruitment' }], money: 0 },
      p2: { hand: [{ id: 'c2', kind: 'stop' }], money: 0 },
    },
    hostState: { phase: 'turnStart', turnNumber: 1 },
  };
}

async function seedRoom(data: Record<string, unknown>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.database().ref(`rooms/${ROOM}`).set(data);
  });
}

function dbFor(uid: string): Database {
  return testEnv.authenticatedContext(uid).database();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      rules: readFileSync('database.rules.json', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearDatabase();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('room metadata and lobby access', () => {
  it('requires authentication to create a room', async () => {
    const anonymous = testEnv.unauthenticatedContext().database();
    await assertFails(
      set(ref(anonymous, 'rooms/11111/meta'), {
        hostUid: 'host',
        hostConnected: true,
        status: 'lobby',
        createdAt: NOW,
        schemaVersion: 1,
      }),
    );

    await assertSucceeds(
      set(ref(dbFor('host'), 'rooms/11111/meta'), {
        hostUid: 'host',
        hostConnected: true,
        status: 'lobby',
        createdAt: NOW,
        schemaVersion: 1,
      }),
    );
  });

  // RTDB rules have no numChildren()/size() primitive, so the six-player cap
  // and seat uniqueness are enforced by the room service. Rules still validate
  // that every self-created seat is inside the engine's 0..5 range.
  it('lets a lobby player create their own valid seat', async () => {
    await seedRoom(lobbyRoom(1));

    await assertSucceeds(
      set(ref(dbFor('p1'), `rooms/${ROOM}/players/p1`), player(1)),
    );
    await assertFails(
      set(ref(dbFor('p6'), `rooms/${ROOM}/players/p6`), player(6)),
    );
  });

  it('rejects lobby self-delete after the game starts but allows host moderation', async () => {
    await seedRoom(lobbyRoom(3, { status: 'playing' }));

    await assertFails(remove(ref(dbFor('p1'), `rooms/${ROOM}/players/p1`)));
    await assertSucceeds(remove(ref(dbFor('host'), `rooms/${ROOM}/players/p1`)));
  });
});

describe('presence and host ownership', () => {
  it('lets a player update presence but not name or seat after the game starts', async () => {
    await seedRoom(roomWithGameplay());

    await assertSucceeds(
      update(ref(dbFor('p1'), `rooms/${ROOM}/players/p1`), {
        connected: false,
        lastSeen: NOW + 1,
      }),
    );
    await assertFails(
      update(ref(dbFor('p1'), `rooms/${ROOM}/players/p1`), { name: 'Renamed' }),
    );
    await assertFails(
      update(ref(dbFor('p1'), `rooms/${ROOM}/players/p1`), { seat: 4 }),
    );
    await assertSucceeds(
      update(ref(dbFor('host'), `rooms/${ROOM}/players/p1`), { name: 'Host edit' }),
    );
  });

  it('only lets the host transfer hostUid, or claim it after a disconnect', async () => {
    await seedRoom(lobbyRoom(3));

    await assertFails(
      set(ref(dbFor('p1'), `rooms/${ROOM}/meta/hostUid`), 'p1'),
    );
    await assertFails(
      set(ref(dbFor('host'), `rooms/${ROOM}/meta/hostUid`), 'outsider'),
    );
    await assertSucceeds(
      set(ref(dbFor('host'), `rooms/${ROOM}/meta/hostUid`), 'p1'),
    );

    await seedRoom(lobbyRoom(3, { hostConnected: false }));
    await assertSucceeds(
      set(ref(dbFor('p1'), `rooms/${ROOM}/meta/hostUid`), 'p1'),
    );
  });

  it('completes host migration only while the old host is marked offline', async () => {
    await seedRoom(lobbyRoom(3, { hostConnected: false }));

    await assertSucceeds(
      set(ref(dbFor('p1'), `rooms/${ROOM}/meta/hostUid`), 'p1'),
    );
    await assertSucceeds(
      set(ref(dbFor('p1'), `rooms/${ROOM}/meta/hostConnected`), true),
    );

    await seedRoom(lobbyRoom(3, { hostUid: 'p1', hostConnected: false }));
    await assertFails(
      set(ref(dbFor('host'), `rooms/${ROOM}/meta/hostConnected`), true),
    );
    await assertSucceeds(
      set(ref(dbFor('p1'), `rooms/${ROOM}/meta/hostConnected`), true),
    );
    await assertFails(
      set(ref(dbFor('outsider'), `rooms/${ROOM}/meta/hostUid`), 'outsider'),
    );
  });

  it('only lets the host change game status', async () => {
    await seedRoom(lobbyRoom(3));

    await assertFails(
      set(ref(dbFor('p1'), `rooms/${ROOM}/meta/status`), 'playing'),
    );
    await assertSucceeds(
      set(ref(dbFor('host'), `rooms/${ROOM}/meta/status`), 'playing'),
    );
  });
});

describe('game projections', () => {
  it('lets members read public state but not outsiders', async () => {
    await seedRoom(roomWithGameplay());
    const publicPath = `rooms/${ROOM}/public`;

    await assertSucceeds(get(ref(dbFor('p1'), publicPath)));
    await assertFails(get(ref(dbFor('outsider'), publicPath)));
  });

  it('keeps private hands and money readable only by their owner or the host', async () => {
    await seedRoom(roomWithGameplay());

    await assertSucceeds(get(ref(dbFor('p1'), `rooms/${ROOM}/private/p1`)));
    await assertFails(get(ref(dbFor('p1'), `rooms/${ROOM}/private/p2`)));
    await assertSucceeds(get(ref(dbFor('host'), `rooms/${ROOM}/private/p2`)));
    await assertFails(
      set(ref(dbFor('p1'), `rooms/${ROOM}/private/p1`), {
        hand: [{ id: 'fake', kind: 'imTheBoss' }],
        money: 99,
      }),
    );
    await assertSucceeds(
      set(ref(dbFor('host'), `rooms/${ROOM}/private/p1`), {
        hand: [{ id: 'c9', kind: 'stop' }],
        money: 0,
      }),
    );
  });

  it('keeps hostState private to the host', async () => {
    await seedRoom(roomWithGameplay());
    const hostStatePath = `rooms/${ROOM}/hostState`;

    await assertFails(get(ref(dbFor('p1'), hostStatePath)));
    await assertSucceeds(get(ref(dbFor('host'), hostStatePath)));
    await assertFails(
      set(ref(dbFor('p1'), hostStatePath), { phase: 'gameOver' }),
    );
    await assertSucceeds(
      set(ref(dbFor('host'), hostStatePath), { phase: 'turnStart' }),
    );
  });
});

describe('seat reclaim requests', () => {
  function playingWithOfflinePlayer(): Record<string, unknown> {
    const room = lobbyRoom(3, { status: 'playing' });
    const players = room.players as Record<string, SeedPlayer>;
    players.p1.connected = false;
    return room;
  }

  it('lets a new uid request an offline seat but not a connected one', async () => {
    await seedRoom(playingWithOfflinePlayer());
    const request = {
      oldUid: 'p1',
      name: 'New device',
      requestedAt: NOW,
    };

    await assertSucceeds(
      set(ref(dbFor('new-device'), `rooms/${ROOM}/reclaims/new-device`), request),
    );
    await assertSucceeds(
      get(ref(dbFor('new-device'), `rooms/${ROOM}/reclaims/new-device`)),
    );
    await assertSucceeds(
      get(ref(dbFor('host'), `rooms/${ROOM}/reclaims`)),
    );
    await assertFails(
      get(ref(dbFor('p2'), `rooms/${ROOM}/reclaims`)),
    );

    await seedRoom(playingWithOfflinePlayer());
    await assertFails(
      set(ref(dbFor('new-device'), `rooms/${ROOM}/reclaims/new-device`), {
        ...request,
        oldUid: 'host',
      }),
    );
  });

  it('does not let members request a second seat or outsiders write player data', async () => {
    await seedRoom(playingWithOfflinePlayer());

    await assertFails(
      set(ref(dbFor('p2'), `rooms/${ROOM}/reclaims/p2`), {
        oldUid: 'p1',
        name: 'Impostor',
        requestedAt: NOW,
      }),
    );
    await assertFails(
      set(ref(dbFor('new-device'), `rooms/${ROOM}/players/new-device`), player(4)),
    );
  });

  it('lets the host clear a request and migrate the seat data', async () => {
    await seedRoom(playingWithOfflinePlayer());
    await assertSucceeds(
      set(ref(dbFor('new-device'), `rooms/${ROOM}/reclaims/new-device`), {
        oldUid: 'p1',
        name: 'New device',
        requestedAt: NOW,
      }),
    );

    await assertSucceeds(
      set(ref(dbFor('host'), `rooms/${ROOM}/players/new-device`), {
        ...player(1, 'New device'),
        joinedAt: NOW,
      }),
    );
    await assertSucceeds(
      set(ref(dbFor('host'), `rooms/${ROOM}/players/p1`), null),
    );
    await assertSucceeds(
      remove(ref(dbFor('host'), `rooms/${ROOM}/reclaims/new-device`)),
    );
  });
});

describe('actions', () => {
  it('accepts self-authored actions and lets only the host read or delete them', async () => {
    await seedRoom(lobbyRoom(3));
    const actionRef = ref(dbFor('p1'), `rooms/${ROOM}/actions/a1`);

    await assertSucceeds(
      set(actionRef, {
        uid: 'p1',
        type: 'ROLL_DICE',
        payload: {},
        ts: NOW,
      }),
    );
    await assertFails(
      set(ref(dbFor('p1'), `rooms/${ROOM}/actions/a2`), {
        uid: 'p2',
        type: 'ROLL_DICE',
        payload: {},
        ts: NOW,
      }),
    );
    await assertFails(get(ref(dbFor('p2'), `rooms/${ROOM}/actions`)));
    await assertSucceeds(get(ref(dbFor('host'), `rooms/${ROOM}/actions`)));
    await assertFails(remove(ref(dbFor('p2'), `rooms/${ROOM}/actions/a1`)));
    await assertSucceeds(remove(ref(dbFor('host'), `rooms/${ROOM}/actions/a1`)));
  });
});

describe('room deletion', () => {
  it('lets the host delete a fresh room and rejects a non-host', async () => {
    await seedRoom(lobbyRoom(3));

    await assertFails(remove(ref(dbFor('p1'), `rooms/${ROOM}`)));
    await assertSucceeds(remove(ref(dbFor('host'), `rooms/${ROOM}`)));
  });

  it('lets anyone remove a room older than 24 hours', async () => {
    await seedRoom(lobbyRoom(3, { createdAt: NOW - 2 * 24 * 60 * 60 * 1000 }));

    await assertSucceeds(remove(ref(dbFor('p1'), `rooms/${ROOM}`)));
  });
});
