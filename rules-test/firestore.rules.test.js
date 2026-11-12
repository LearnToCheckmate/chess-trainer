'use strict';
// rules-test/firestore.rules.test.js - EMULATOR TESTS FOR ../firestore.rules. #550 SEC-03..09 and SEC-16
// [docs/security-privacy-2026-11-12; Kunal "All 20, serious first"].
//
// NOT RUN IN THE BUILD SANDBOX, SAID PLAINLY: the Firestore emulator is a Java download from Google's servers, which the build container
// does not have and may not fetch, so these cases were written and reasoned through but never executed. Run them before publishing the
// rules (Java 11+ and network for the first npm install):
//   cd rules-test && npm install
//   npx firebase emulators:exec --only firestore --project demo-ct "node --test firestore.rules.test.js"
// Every case writes its own fixtures with security rules disabled, then acts as a named user. 'u-a' and 'u-b' are the two players;
// 'u-x' is a stranger with a Google account; null is signed out.
const {test, before, after, beforeEach} = require('node:test');
const fs = require('fs');
const path = require('path');
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const {doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, arrayUnion, arrayRemove} = require('firebase/firestore');

let env;
const as = (uid) => (uid ? env.authenticatedContext(uid, {name: uid}) : env.unauthenticatedContext()).firestore();
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()));
const A = {uid: 'u-a', name: 'A', photo: ''}, B = {uid: 'u-b', name: 'B', photo: ''};
const game = (o) => Object.assign({code: 'G1', status: 'active', moves: [], result: null, chat: [], tc: null, clk: null,
  createdAt: 1, updatedAt: 1, moveAt: 1, w: A, b: B}, o || {});

before(async () => {
  env = await initializeTestEnvironment({projectId: 'demo-ct',
    firestore: {rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8')}});
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

// ── users (SEC-03, SEC-02)
test('users: owner only; coachfree only grows', async () => {
  await seed((db) => setDoc(doc(db, 'users/u-a'), {coachfree: 2}));
  await assertSucceeds(getDoc(doc(as('u-a'), 'users/u-a')));
  await assertFails(getDoc(doc(as('u-x'), 'users/u-a')));
  await assertFails(setDoc(doc(as('u-x'), 'users/u-a'), {x: 1}, {merge: true}));
  await assertSucceeds(setDoc(doc(as('u-a'), 'users/u-a'), {coachfree: 3}, {merge: true}));
  await assertFails(setDoc(doc(as('u-a'), 'users/u-a'), {coachfree: 0}, {merge: true}));
  await assertFails(getDocs(collection(as('u-a'), 'users')));
});

// ── games (SEC-04)
test('games: a started game is readable and writable only by its two players, never listable', async () => {
  await seed((db) => setDoc(doc(db, 'games/G1'), game()));
  await assertSucceeds(getDoc(doc(as('u-a'), 'games/G1')));
  await assertFails(getDoc(doc(as('u-x'), 'games/G1')));
  await assertFails(getDoc(doc(as(null), 'games/G1')));
  await assertFails(getDocs(collection(as('u-x'), 'games')));
  await assertFails(updateDoc(doc(as('u-x'), 'games/G1'), {result: '0-1', status: 'over'}));
  await assertSucceeds(updateDoc(doc(as('u-a'), 'games/G1'), {result: '0-1', status: 'over', endBy: 'resign'}));
});
test('games: create cannot overwrite an existing code, and the creator must be seated', async () => {
  await seed((db) => setDoc(doc(db, 'games/G1'), game()));
  await assertFails(setDoc(doc(as('u-x'), 'games/G1'), game({w: {uid: 'u-x'}, b: null, status: 'waiting'})));
  await assertFails(setDoc(doc(as('u-x'), 'games/G2'), game({code: 'G2', status: 'waiting', b: null})));   // creator not seated
  await assertSucceeds(setDoc(doc(as('u-x'), 'games/G2'), game({code: 'G2', status: 'waiting', w: {uid: 'u-x', name: 'X', photo: ''}, b: null})));
});
test('games: a waiting invite is readable by code and joinable into the empty seat only, as yourself', async () => {
  const w = game({status: 'waiting'}); delete w.b;
  await seed((db) => setDoc(doc(db, 'games/G1'), w));
  await assertSucceeds(getDoc(doc(as('u-x'), 'games/G1')));
  await assertFails(updateDoc(doc(as('u-x'), 'games/G1'), {status: 'active', b: {uid: 'u-b', name: 'B'}}));        // seating someone else
  await assertFails(updateDoc(doc(as('u-x'), 'games/G1'), {status: 'active', b: {uid: 'u-x'}, result: '0-1'}));     // and a result
  await assertFails(updateDoc(doc(as('u-x'), 'games/G1'), {status: 'active', w: {uid: 'u-x'}}));                    // the taken seat
  await assertSucceeds(updateDoc(doc(as('u-x'), 'games/G1'), {status: 'active', b: {uid: 'u-x', name: 'X', photo: ''}, updatedAt: 2, moveAt: 2}));
  await assertFails(getDoc(doc(as('u-b'), 'games/G1')));   // now started: the other stranger is out
});
test('games: chat is append-only under your own uid', async () => {
  await seed((db) => setDoc(doc(db, 'games/G1'), game()));
  await assertSucceeds(updateDoc(doc(as('u-a'), 'games/G1'), {chat: arrayUnion({uid: 'u-a', name: 'A', text: 'hi', t: 1})}));
  await assertFails(updateDoc(doc(as('u-a'), 'games/G1'), {chat: arrayUnion({uid: 'u-b', name: 'B', text: 'I resign', t: 2})}));
  await assertFails(updateDoc(doc(as('u-x'), 'games/G1'), {chat: arrayUnion({uid: 'u-x', name: 'X', text: 'spam', t: 3})}));
});
test('games: seats cannot be swapped and a player may rewrite only their own seat', async () => {
  await seed((db) => setDoc(doc(db, 'games/G1'), game()));
  await assertFails(updateDoc(doc(as('u-a'), 'games/G1'), {b: {uid: 'u-x', name: 'X'}}));
  await assertFails(updateDoc(doc(as('u-a'), 'games/G1'), {b: {uid: 'u-b', name: 'Renamed'}}));
  await assertSucceeds(updateDoc(doc(as('u-a'), 'games/G1'), {w: {uid: 'u-a', name: 'Deleted player', photo: ''}}));
  await assertFails(updateDoc(doc(as('u-a'), 'games/G1'), {status: 'waiting'}));
});

// ── call signalling (SEC-05)
test('call: only the two players read or write the offer, answer and ICE candidates', async () => {
  await seed(async (db) => { await setDoc(doc(db, 'games/G1'), game()); await setDoc(doc(db, 'games/G1/call/signal'), {rtc: {from: 'u-a', offer: {sdp: 'v=0'}}}); });
  await assertSucceeds(getDoc(doc(as('u-b'), 'games/G1/call/signal')));
  await assertFails(getDoc(doc(as('u-x'), 'games/G1/call/signal')));
  await assertFails(setDoc(doc(as('u-x'), 'games/G1/call/signal'), {rtc: {from: 'u-x', offer: {sdp: 'v=0'}}}));
  await assertFails(setDoc(doc(as('u-a'), 'games/G1/call/signal'), {rtc: {from: 'u-x', offer: {sdp: 'v=0'}}}));
  await assertSucceeds(setDoc(doc(as('u-b'), 'games/G1/call/signal'), {rtcC_b: ['{}']}, {mergeFields: ['rtcC_b']}));
});

// ── mm (SEC-06)
test('mm: own entry only; waiting entries listable; another entry may be marked matched only with a game seating both', async () => {
  await seed(async (db) => { await setDoc(doc(db, 'mm/u-a'), {uid: 'u-a', name: 'A', photo: '', tc: null, status: 'waiting', t: 1});
    await setDoc(doc(db, 'games/G1'), game()); await setDoc(doc(db, 'games/G9'), game({code: 'G9', b: {uid: 'u-x'}})); });
  await assertSucceeds(getDocs(query(collection(as('u-b'), 'mm'), where('status', '==', 'waiting'))));
  await assertFails(setDoc(doc(as('u-b'), 'mm/u-a'), {uid: 'u-a', name: 'A', photo: '', tc: null, status: 'waiting', t: 2}));
  await assertFails(updateDoc(doc(as('u-b'), 'mm/u-a'), {status: 'matched', gameId: 'G9', matchedAt: 1}));   // G9 seats u-x, not u-b
  await assertFails(updateDoc(doc(as('u-b'), 'mm/u-a'), {status: 'matched', gameId: 'NOPE', matchedAt: 1}));
  await assertSucceeds(updateDoc(doc(as('u-b'), 'mm/u-a'), {status: 'matched', gameId: 'G1', matchedAt: 1}));
  await assertFails(deleteDoc(doc(as('u-b'), 'mm/u-a')));
});

// ── tournaments (SEC-07)
test('tournaments: host creates and runs; others only add or remove their own entry', async () => {
  await seed((db) => setDoc(doc(db, 'tournaments/T1'), {name: 'T', host: 'u-a', status: 'upcoming', players: [A], createdAt: 1}));
  await assertFails(addDoc(collection(as('u-x'), 'tournaments'), {name: 'T', host: 'u-a', players: []}));
  await assertSucceeds(addDoc(collection(as('u-x'), 'tournaments'), {name: 'T', host: 'u-x', players: [{uid: 'u-x', name: 'X'}]}));
  await assertFails(updateDoc(doc(as('u-x'), 'tournaments/T1'), {status: 'live'}));
  await assertFails(updateDoc(doc(as('u-x'), 'tournaments/T1'), {players: arrayUnion({uid: 'u-b', name: 'B'})}));
  await assertSucceeds(updateDoc(doc(as('u-x'), 'tournaments/T1'), {players: arrayUnion({uid: 'u-x', name: 'X', photo: ''}), updatedAt: 2}));
  await assertFails(updateDoc(doc(as('u-x'), 'tournaments/T1'), {players: arrayRemove(A)}));
  await assertSucceeds(updateDoc(doc(as('u-x'), 'tournaments/T1'), {players: arrayRemove({uid: 'u-x', name: 'X', photo: ''}), updatedAt: 3}));
  await assertSucceeds(updateDoc(doc(as('u-a'), 'tournaments/T1'), {status: 'live', schedule: []}));
});

// ── friends (SEC-08)
test('friends: requests under your own uid; a friendship only from a pending request addressed to you', async () => {
  await assertFails(addDoc(collection(as('u-x'), 'friendReqs'), {from: 'u-a', fromName: 'A', to: 'u-b', status: 'pending', at: 1}));
  await seed((db) => setDoc(doc(db, 'friendReqs/R1'), {from: 'u-a', fromName: 'A', to: 'u-b', status: 'pending', at: 1}));
  await assertFails(getDoc(doc(as('u-x'), 'friendReqs/R1')));
  await assertFails(addDoc(collection(as('u-x'), 'friends'), {users: ['u-a', 'u-x'], names: {'u-a': 'A', 'u-x': 'X'}, at: 1, req: 'R1'}));
  await assertFails(addDoc(collection(as('u-b'), 'friends'), {users: ['u-a', 'u-b'], names: {'u-a': 'Someone else', 'u-b': 'B'}, at: 1, req: 'R1'}));
  await assertSucceeds(addDoc(collection(as('u-b'), 'friends'), {users: ['u-a', 'u-b'], names: {'u-a': 'A', 'u-b': 'B'}, at: 1, req: 'R1'}));
  await assertSucceeds(getDocs(query(collection(as('u-a'), 'friends'), where('users', 'array-contains', 'u-a'))));
  await assertFails(getDocs(query(collection(as('u-x'), 'friends'), where('users', 'array-contains', 'u-a'))));
});

// ── nearby (SEC-16)
test('nearby: your own entry only', async () => {
  await assertFails(setDoc(doc(as('u-x'), 'nearby/u-a'), {uid: 'u-a', name: 'A', geo: 'zip:sw1', at: 1}));
  await assertSucceeds(setDoc(doc(as('u-a'), 'nearby/u-a'), {uid: 'u-a', name: 'A', geo: 'zip:sw1', at: 1}));
  await assertFails(deleteDoc(doc(as('u-x'), 'nearby/u-a')));
});

// ── customers (SEC-09)
test('customers: no client ever writes a subscription; checkout sessions are the owner\'s', async () => {
  await assertFails(setDoc(doc(as('u-a'), 'customers/u-a/subscriptions/s1'), {status: 'active'}));
  await assertFails(getDoc(doc(as('u-x'), 'customers/u-a/subscriptions/s1')));
  await assertSucceeds(addDoc(collection(as('u-a'), 'customers/u-a/checkout_sessions'), {price: 'p', mode: 'subscription'}));
  await assertFails(addDoc(collection(as('u-x'), 'customers/u-a/checkout_sessions'), {price: 'p'}));
});

// ── everything else
test('an unknown collection is denied', async () => {
  await assertFails(setDoc(doc(as('u-a'), 'anything/x'), {a: 1}));
  await assertFails(getDoc(doc(as('u-a'), 'anything/x')));
});
