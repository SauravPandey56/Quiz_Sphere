import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import ExamSession from '../src/models/ExamSession.js';
import ExamDeployment from '../src/models/ExamDeployment.js';
import Question from '../src/models/Question.js';
import sessionRoutes from '../src/routes/sessionRoutes.js';
import { saveAttemptProgress, getAttemptById } from '../src/controllers/sessionController.js';

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

// --- Shared test fixtures ---
const candidateUser = {
  _id: new mongoose.Types.ObjectId('555555555555555555555555'),
  role: 'candidate',
  name: 'Authorized Candidate'
};

const otherCandidateUser = {
  _id: new mongoose.Types.ObjectId('666666666666666666666666'),
  role: 'candidate',
  name: 'Unauthorized Candidate'
};

const quizId       = new mongoose.Types.ObjectId('111111111111111111111111');
const deploymentId = new mongoose.Types.ObjectId('222222222222222222222222');
const attemptId    = new mongoose.Types.ObjectId('333333333333333333333333');
const question1Id  = new mongoose.Types.ObjectId('444444444444444444444444');
const question2Id  = new mongoose.Types.ObjectId('777777777777777777777777');
const outsideQuestionId = new mongoose.Types.ObjectId('888888888888888888888888');

// Helper: mock an in-progress session that began just now (not expired)
function makeFreshSession(overrides = {}) {
  return Object.assign({
    _id: attemptId,
    candidate: candidateUser._id,
    status: 'in_progress',
    startTime: new Date(),           // started now → 60-min window is open
    examDeployment: deploymentId,
    autoSaveSeq: 0,
    responses: [],
    async save() { return this; }
  }, overrides);
}

// Helper: mock a standard deployment returning from findById().populate()
function mockDeployment() {
  return {
    _id: deploymentId,
    duration: 60,
    quiz: { _id: quizId, isActive: true }
  };
}

function mockFindDeployment() {
  return { populate: async () => mockDeployment() };
}

// Helper: mock Question.find for the quiz's question bank
function mockQuestions(ids) {
  return { select: async () => ids.map(id => ({ _id: id })) };
}

// Helper: a successful updateOne result (1 document matched and modified)
function updateOneSuccess() {
  return async () => ({ matchedCount: 1, modifiedCount: 1 });
}

// Helper: a stale updateOne result (0 matched — version condition failed)
function updateOneStale() {
  return async () => ({ matchedCount: 0, modifiedCount: 0 });
}

// ─── Route middleware ─────────────────────────────────────────────────────────

test('sessionRoutes attaches protect and authorize("candidate") middleware to PATCH /:attemptId/save', () => {
  const route = sessionRoutes.stack.find((layer) => layer.route && layer.route.path === '/:attemptId/save');
  assert.ok(route, 'Route /:attemptId/save must exist in sessionRoutes');
  const patchHandlers = route.route.stack.filter((layer) => layer.method === 'patch');
  assert.equal(patchHandlers.length, 3, 'PATCH /:attemptId/save must have 3 handlers (protect + authorize + saveAttemptProgress)');
  assert.equal(patchHandlers[0].name, 'protect', 'First handler must be protect');
});

// ─── Missing / invalid clientSeq ────────────────────────────────────────────

test('saveAttemptProgress rejects request missing clientSeq (400)', async () => {
  const origFindById = ExamSession.findById;
  ExamSession.findById = async () => makeFreshSession();

  const origDeployFindById = ExamDeployment.findById;
  ExamDeployment.findById = () => mockFindDeployment();

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: { responses: [] }   // clientSeq intentionally absent
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /clientSeq/i);
  } finally {
    ExamSession.findById = origFindById;
    ExamDeployment.findById = origDeployFindById;
  }
});

test('saveAttemptProgress rejects non-integer or zero clientSeq (400)', async () => {
  const origFindById = ExamSession.findById;
  ExamSession.findById = async () => makeFreshSession();

  const origDeployFindById = ExamDeployment.findById;
  ExamDeployment.findById = () => mockFindDeployment();

  try {
    for (const badSeq of [0, -1, 1.5, 'abc', null]) {
      const req = {
        params: { attemptId: attemptId.toString() },
        user: candidateUser,
        body: { responses: [], clientSeq: badSeq }
      };
      const res = mockRes();
      await saveAttemptProgress(req, res);
      assert.equal(res.statusCode, 400, `Expected 400 for clientSeq=${badSeq}`);
      assert.match(res.body.message, /clientSeq/i);
    }
  } finally {
    ExamSession.findById = origFindById;
    ExamDeployment.findById = origDeployFindById;
  }
});

// ─── Authorization & attempt status ─────────────────────────────────────────

test('saveAttemptProgress allows authorized candidate to save answers (atomic write)', async () => {
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;
  const origUpdateOne      = ExamSession.updateOne;

  let capturedFilter = null;
  let capturedUpdate = null;

  ExamSession.findById = async () => makeFreshSession({ autoSaveSeq: 0 });
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find = () => mockQuestions([question1Id, question2Id]);
  ExamSession.updateOne = async (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return { matchedCount: 1, modifiedCount: 1 };
  };

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: {
        responses: [
          { questionId: question1Id.toString(), selectedOption: 'Option A' },
          { questionId: question2Id.toString(), selectedOption: 'Option C' }
        ],
        clientSeq: 1
      }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.savedCount, 2);
    assert.equal(res.body.savedVersion, 1);

    // Verify the atomic filter used the correct version condition
    assert.equal(capturedFilter.status, 'in_progress');
    assert.deepEqual(capturedFilter.autoSaveSeq, { $lt: 1 });
    // Verify $max is applied to prevent rollback
    assert.deepEqual(capturedUpdate.$max, { autoSaveSeq: 1 });
    // Verify responses are set, not merged
    assert.equal(capturedUpdate.$set.responses.length, 2);
    assert.equal(capturedUpdate.$set.responses[0].selectedOption, 'Option A');
    assert.equal(capturedUpdate.$set.responses[1].selectedOption, 'Option C');
  } finally {
    ExamSession.findById  = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find         = origQuestionFind;
    ExamSession.updateOne = origUpdateOne;
  }
});

test('saveAttemptProgress rejects another candidate attempting to save someone elses attempt (403)', async () => {
  const origFindById = ExamSession.findById;
  ExamSession.findById = async () => makeFreshSession();

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: otherCandidateUser,
      body: { responses: [], clientSeq: 1 }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /not authorized/i);
  } finally {
    ExamSession.findById = origFindById;
  }
});

test('saveAttemptProgress rejects submitted or completed attempts (400)', async () => {
  const origFindById = ExamSession.findById;
  ExamSession.findById = async () => makeFreshSession({ status: 'submitted' });

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: { responses: [], clientSeq: 1 }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /not in progress|already been submitted/i);
  } finally {
    ExamSession.findById = origFindById;
  }
});

// ─── Expiry ───────────────────────────────────────────────────────────────────

test('saveAttemptProgress rejects expired attempts (400)', async () => {
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;

  // Session started 2 hours ago with 60-min duration → expired
  ExamSession.findById = async () => makeFreshSession({
    startTime: new Date(Date.now() - 120 * 60 * 1000)
  });
  ExamDeployment.findById = () => mockFindDeployment();

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: { responses: [], clientSeq: 1 }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /expired/i);
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
  }
});

// ─── Input validation ────────────────────────────────────────────────────────

test('saveAttemptProgress rejects invalid question/answer data (400)', async () => {
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;

  ExamSession.findById    = async () => makeFreshSession();
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find           = () => mockQuestions([question1Id]);

  try {
    // 1. Non-array responses
    const res1 = mockRes();
    await saveAttemptProgress({
      params: { attemptId: attemptId.toString() }, user: candidateUser,
      body: { responses: 'not-an-array', clientSeq: 1 }
    }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.body.message, /must be an array/i);

    // 2. Question outside this exam
    const res2 = mockRes();
    await saveAttemptProgress({
      params: { attemptId: attemptId.toString() }, user: candidateUser,
      body: { responses: [{ questionId: outsideQuestionId.toString(), selectedOption: 'A' }], clientSeq: 1 }
    }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.body.message, /invalid question ID/i);

    // 3. Duplicate question IDs
    const res3 = mockRes();
    await saveAttemptProgress({
      params: { attemptId: attemptId.toString() }, user: candidateUser,
      body: {
        responses: [
          { questionId: question1Id.toString(), selectedOption: 'A' },
          { questionId: question1Id.toString(), selectedOption: 'B' }
        ],
        clientSeq: 1
      }
    }, res3);
    assert.equal(res3.statusCode, 400);
    assert.match(res3.body.message, /unique question IDs/i);
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find           = origQuestionFind;
  }
});

// ─── Protected field immutability ────────────────────────────────────────────

test('saveAttemptProgress prevents modification of protected fields', async () => {
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;
  const origUpdateOne      = ExamSession.updateOne;

  const originalStartTime = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago, within window
  const fakeSession = makeFreshSession({ startTime: originalStartTime, score: 0, totalCorrect: 0 });

  ExamSession.findById    = async () => fakeSession;
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find           = () => mockQuestions([question1Id]);
  ExamSession.updateOne   = updateOneSuccess();

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: {
        responses: [{ questionId: question1Id.toString(), selectedOption: 'A' }],
        clientSeq: 1,
        // Attempt to tamper with protected fields
        score: 100,
        status: 'submitted',
        totalCorrect: 50,
        startTime: new Date('2020-01-01')
      }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);

    assert.equal(res.statusCode, 200);
    // The in-memory session object must not have been mutated
    assert.equal(fakeSession.score, 0, 'score must not be modified');
    assert.equal(fakeSession.status, 'in_progress', 'status must not be modified');
    assert.equal(fakeSession.totalCorrect, 0, 'totalCorrect must not be modified');
    assert.equal(fakeSession.startTime.getTime(), originalStartTime.getTime(), 'startTime must not be modified');
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find           = origQuestionFind;
    ExamSession.updateOne   = origUpdateOne;
  }
});

// ─── Answer exposure ─────────────────────────────────────────────────────────

test('saveAttemptProgress never exposes correct answers or evaluation data in response', async () => {
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;
  const origUpdateOne      = ExamSession.updateOne;

  ExamSession.findById    = async () => makeFreshSession();
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find           = () => mockQuestions([question1Id]);
  ExamSession.updateOne   = updateOneSuccess();

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: { responses: [{ questionId: question1Id.toString(), selectedOption: 'Option A' }], clientSeq: 1 }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.responses[0].isCorrect, undefined, 'isCorrect must not be exposed');
    assert.equal(res.body.responses[0].marksAwarded, undefined, 'marksAwarded must not be exposed');
    assert.equal(res.body.correctAnswer, undefined, 'correctAnswer must not be exposed');
    assert.equal(res.body.correctAnswerEncrypted, undefined, 'correctAnswerEncrypted must not be exposed');
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find           = origQuestionFind;
    ExamSession.updateOne   = origUpdateOne;
  }
});

// ─── Concurrency / stale-write rejection ─────────────────────────────────────

test('saveAttemptProgress rejects stale autosave when a newer snapshot is already stored (409)', async () => {
  // Scenario: candidate is on seq 5 (autoSaveSeq=5 in DB).
  // A delayed network packet arrives carrying the old seq=3.
  // updateOne finds no matching document (5 < 3 is false) → returns matchedCount=0.
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;
  const origUpdateOne      = ExamSession.updateOne;

  ExamSession.findById    = async () => makeFreshSession({ autoSaveSeq: 5 });
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find           = () => mockQuestions([question1Id]);
  // Stale: DB already has seq=5; incoming clientSeq=3 → condition $lt:3 fails
  ExamSession.updateOne   = updateOneStale();

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: { responses: [{ questionId: question1Id.toString(), selectedOption: 'Old Answer' }], clientSeq: 3 }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /stale autosave|newer snapshot/i);
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find           = origQuestionFind;
    ExamSession.updateOne   = origUpdateOne;
  }
});

test('saveAttemptProgress accepts the first save after a stale rejection without losing answers', async () => {
  // Scenario: stale seq=3 is rejected (above). The frontend's next normal save
  // fires with seq=6 (the current saveSeqRef). autoSaveSeq is 5 in DB.
  // Condition $lt:6 → 5<6 = true → accepted.
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;
  const origUpdateOne      = ExamSession.updateOne;

  let capturedFilter = null;
  ExamSession.findById    = async () => makeFreshSession({ autoSaveSeq: 5 });
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find           = () => mockQuestions([question1Id, question2Id]);
  ExamSession.updateOne   = async (filter, update) => { capturedFilter = filter; return { matchedCount: 1, modifiedCount: 1 }; };

  try {
    const req = {
      params: { attemptId: attemptId.toString() },
      user: candidateUser,
      body: {
        responses: [
          { questionId: question1Id.toString(), selectedOption: 'Latest Answer Q1' },
          { questionId: question2Id.toString(), selectedOption: 'Latest Answer Q2' }
        ],
        clientSeq: 6
      }
    };
    const res = mockRes();
    await saveAttemptProgress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.savedVersion, 6);
    // Verify that the version filter correctly targets autoSaveSeq < 6
    assert.deepEqual(capturedFilter.autoSaveSeq, { $lt: 6 });
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find           = origQuestionFind;
    ExamSession.updateOne   = origUpdateOne;
  }
});

test('saveAttemptProgress: out-of-order saves — higher seq wins, lower is rejected', async () => {
  // Scenario: seq=4 arrives and succeeds (updateOne returns matchedCount=1).
  // Then seq=2 arrives late; updateOne returns matchedCount=0 → 409.
  const origFindById       = ExamSession.findById;
  const origDeployFindById = ExamDeployment.findById;
  const origQuestionFind   = Question.find;
  const origUpdateOne      = ExamSession.updateOne;

  ExamSession.findById    = async () => makeFreshSession({ autoSaveSeq: 0 });
  ExamDeployment.findById = () => mockFindDeployment();
  Question.find           = () => mockQuestions([question1Id]);

  let callCount = 0;
  ExamSession.updateOne = async () => {
    callCount += 1;
    // First call (seq=4) succeeds; second call (seq=2, stale) would fail
    return callCount === 1 ? { matchedCount: 1, modifiedCount: 1 } : { matchedCount: 0, modifiedCount: 0 };
  };

  try {
    // Higher seq arrives "first" (simulates it winning the race)
    const reqHigher = {
      params: { attemptId: attemptId.toString() }, user: candidateUser,
      body: { responses: [{ questionId: question1Id.toString(), selectedOption: 'Answer at seq=4' }], clientSeq: 4 }
    };
    const resHigher = mockRes();
    await saveAttemptProgress(reqHigher, resHigher);
    assert.equal(resHigher.statusCode, 200, 'Higher seq should succeed');

    // Lower seq arrives late (stale)
    const reqLower = {
      params: { attemptId: attemptId.toString() }, user: candidateUser,
      body: { responses: [{ questionId: question1Id.toString(), selectedOption: 'Old answer at seq=2' }], clientSeq: 2 }
    };
    const resLower = mockRes();
    await saveAttemptProgress(reqLower, resLower);
    assert.equal(resLower.statusCode, 409, 'Lower (stale) seq should be rejected');
  } finally {
    ExamSession.findById    = origFindById;
    ExamDeployment.findById = origDeployFindById;
    Question.find           = origQuestionFind;
    ExamSession.updateOne   = origUpdateOne;
  }
});

test('ExamSession schema includes autoSaveSeq field with default 0', () => {
  const paths = ExamSession.schema.paths;
  assert.ok(paths.autoSaveSeq, 'autoSaveSeq path must exist in ExamSession schema');
  assert.equal(paths.autoSaveSeq.defaultValue, 0, 'autoSaveSeq default must be 0');
});

test('getAttemptById returns autoSaveSeq for candidate attempt so post-refresh saves sync sequence', async () => {
  const origFindById = ExamSession.findById;

  const fakeAttempt = {
    _id: attemptId,
    candidate: { _id: candidateUser._id, name: candidateUser.name, email: 'c@test.com' },
    status: 'in_progress',
    startTime: new Date(),
    autoSaveSeq: 7,
    responses: [{ question: question1Id, selectedOption: 'Option A', isCorrect: true, marksAwarded: 5 }],
    examDeployment: {
      _id: deploymentId,
      duration: 60,
      quiz: { _id: quizId, title: 'Sync Test Quiz', duration: 60 }
    },
    toObject() {
      return {
        _id: this._id,
        candidate: this.candidate,
        status: this.status,
        startTime: this.startTime,
        autoSaveSeq: this.autoSaveSeq,
        responses: this.responses.map(r => ({ ...r })),
        examDeployment: { ...this.examDeployment, quiz: { ...this.examDeployment.quiz } }
      };
    }
  };

  ExamSession.findById = () => ({
    populate: () => ({
      populate: async () => fakeAttempt
    })
  });

  try {
    const req = { params: { attemptId: attemptId.toString() }, user: candidateUser };
    const res = mockRes();
    await getAttemptById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.autoSaveSeq, 7, 'getAttemptById must return persisted autoSaveSeq');
    assert.equal(res.body.responses[0].isCorrect, undefined, 'evaluation internals remain stripped');
    assert.equal(res.body.responses[0].marksAwarded, undefined, 'marksAwarded remains stripped');
  } finally {
    ExamSession.findById = origFindById;
  }
});
