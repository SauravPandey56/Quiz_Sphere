import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-middleware';

import User from '../src/models/User.js';
import { protect, authorize } from '../src/middleware/auth.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    jsonCallCount: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonCallCount += 1;
      this.body = data;
      return this;
    }
  };
}

test('ISS-05: protect returns 401 and does not call next when authorization header is missing', async () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Not authorized, no token');
  assert.equal(res.jsonCallCount, 1);
  assert.equal(nextCalled, false);
});

test('ISS-05: protect returns 401 once and does not fall through on empty Bearer token', async () => {
  const req = { headers: { authorization: 'Bearer ' } };
  const res = mockRes();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Not authorized, token failed');
  assert.equal(res.jsonCallCount, 1, 'Must return immediately after sending token failed response');
  assert.equal(nextCalled, false);
});

test('ISS-05: protect returns 401 and does not call next on invalid JWT', async () => {
  const req = { headers: { authorization: 'Bearer invalid.jwt.token' } };
  const res = mockRes();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Not authorized, token failed');
  assert.equal(res.jsonCallCount, 1);
  assert.equal(nextCalled, false);
});

test('ISS-05: protect returns 401 and does not call next when user is inactive or not found', async () => {
  const origFindById = User.findById;
  const userId = new mongoose.Types.ObjectId();
  const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);

  User.findById = () => ({
    select: async () => ({ _id: userId, role: 'candidate', isActive: false })
  });

  try {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Not authorized, user deactivated or not found');
    assert.equal(res.jsonCallCount, 1);
    assert.equal(nextCalled, false);
  } finally {
    User.findById = origFindById;
  }
});

test('ISS-05: protect populates req.user and calls next once for valid token and active user', async () => {
  const origFindById = User.findById;
  const userId = new mongoose.Types.ObjectId();
  const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);
  const activeUser = { _id: userId, role: 'candidate', isActive: true, name: 'Test User' };

  User.findById = () => ({
    select: async () => activeUser
  });

  try {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCount = 0;

    await protect(req, res, () => { nextCount += 1; });

    assert.equal(nextCount, 1);
    assert.equal(res.jsonCallCount, 0);
    assert.deepEqual(req.user, activeUser);
  } finally {
    User.findById = origFindById;
  }
});

test('ISS-05: authorize returns 403 and does not call next for unauthorized role', () => {
  const middleware = authorize('admin', 'examiner');
  const req = { user: { role: 'candidate' } };
  const res = mockRes();
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not authorized to access this route/i);
  assert.equal(res.jsonCallCount, 1);
  assert.equal(nextCalled, false);
});

test('ISS-05: authorize calls next once for authorized role', () => {
  const middleware = authorize('admin', 'examiner');
  const req = { user: { role: 'examiner' } };
  const res = mockRes();
  let nextCount = 0;

  middleware(req, res, () => { nextCount += 1; });

  assert.equal(nextCount, 1);
  assert.equal(res.jsonCallCount, 0);
});
