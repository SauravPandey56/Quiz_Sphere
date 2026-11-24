import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

import User from '../src/models/User.js';
import { updateProfile } from '../src/controllers/userController.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const sampleWebpBase64 = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

test('ISS-06: updateProfile updates profile fields and valid PNG/WEBP/JPG data URL without exposing password', async () => {
  const origFindById = User.findById;
  const userId = new mongoose.Types.ObjectId();

  const fakeUser = {
    _id: userId,
    name: 'Old Name',
    email: 'student@geu.ac.in',
    role: 'candidate',
    profileImage: '',
    contactNumber: '',
    address: '',
    fatherName: '',
    password: 'hashed-password',
    async save() {
      return this;
    }
  };

  User.findById = async () => fakeUser;

  try {
    const req = {
      user: { _id: userId },
      body: {
        name: 'Updated Student',
        profileImage: samplePngBase64,
        contactNumber: '9876543210',
        address: 'Dehradun'
      }
    };
    const res = mockRes();

    await updateProfile(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.name, 'Updated Student');
    assert.equal(res.body.profileImage, samplePngBase64);
    assert.equal(res.body.contactNumber, '9876543210');
    assert.equal(res.body.address, 'Dehradun');
    assert.equal(res.body.password, undefined);

    // Also verify WEBP format is accepted
    const reqWebp = {
      user: { _id: userId },
      body: { profileImage: sampleWebpBase64 }
    };
    const resWebp = mockRes();
    await updateProfile(reqWebp, resWebp);
    assert.equal(resWebp.statusCode, 200);
    assert.equal(resWebp.body.profileImage, sampleWebpBase64);
  } finally {
    User.findById = origFindById;
  }
});

test('ISS-06: updateProfile rejects unsupported image formats and preserves existing avatar', async () => {
  const origFindById = User.findById;
  const userId = new mongoose.Types.ObjectId();

  const fakeUser = {
    _id: userId,
    name: 'Student',
    email: 'student@geu.ac.in',
    role: 'candidate',
    profileImage: samplePngBase64,
    async save() {
      throw new Error('save() should not be called on invalid image');
    }
  };

  User.findById = async () => fakeUser;

  try {
    for (const badImage of [
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
      'javascript:alert(1)'
    ]) {
      const req = { user: { _id: userId }, body: { profileImage: badImage } };
      const res = mockRes();
      await updateProfile(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /unsupported image format/i);
      assert.equal(fakeUser.profileImage, samplePngBase64);
    }
  } finally {
    User.findById = origFindById;
  }
});

test('ISS-06: updateProfile rejects base64 images exceeding 2MB and preserves existing avatar', async () => {
  const origFindById = User.findById;
  const userId = new mongoose.Types.ObjectId();

  const fakeUser = {
    _id: userId,
    name: 'Student',
    email: 'student@geu.ac.in',
    role: 'candidate',
    profileImage: samplePngBase64,
    async save() {
      throw new Error('save() should not be called on oversized image');
    }
  };

  User.findById = async () => fakeUser;

  // >2MB binary equivalent in base64 (~2.8M chars of 'A')
  const oversizedBase64 = `data:image/jpeg;base64,${'A'.repeat(2800000)}`;

  try {
    const req = { user: { _id: userId }, body: { profileImage: oversizedBase64 } };
    const res = mockRes();
    await updateProfile(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /less than 2MB/i);
    assert.equal(fakeUser.profileImage, samplePngBase64);
  } finally {
    User.findById = origFindById;
  }
});

test('ISS-06: server.js allows 4mb JSON payload specifically on /api/users/profile', () => {
  const serverPath = path.resolve(process.cwd(), 'server.js');
  const serverSource = fs.readFileSync(serverPath, 'utf8');
  assert.match(serverSource, /app\.use\(['"]\/api\/users\/profile['"],\s*express\.json\(\{\s*limit:\s*['"]4mb['"]\s*\}\)\)/);
});
