import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Set up encryption key for imports
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import Quiz from '../src/models/Quiz.js';
import ExamDeployment from '../src/models/ExamDeployment.js';
import ExamSession from '../src/models/ExamSession.js';
import Question from '../src/models/Question.js';
import { getQuizById } from '../src/controllers/quizController.js';
import { getQuestionsForQuiz } from '../src/controllers/questionController.js';
import { getAttemptById } from '../src/controllers/sessionController.js';
import { getUsers, createUserByAdmin } from '../src/controllers/userController.js';
import User from '../src/models/User.js';
import quizRoutes from '../src/routes/quizRoutes.js';
import questionRoutes from '../src/routes/questionRoutes.js';
import sessionRoutes from '../src/routes/sessionRoutes.js';

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

const adminUser = {
  _id: new mongoose.Types.ObjectId('111111111111111111111111'),
  role: 'admin',
  name: 'Admin User'
};

const ownerExaminer = {
  _id: new mongoose.Types.ObjectId('222222222222222222222222'),
  role: 'examiner',
  name: 'Owner Examiner'
};

const otherExaminer = {
  _id: new mongoose.Types.ObjectId('333333333333333333333333'),
  role: 'examiner',
  name: 'Other Examiner'
};

const courseId = new mongoose.Types.ObjectId('444444444444444444444444');

const eligibleCandidate = {
  _id: new mongoose.Types.ObjectId('555555555555555555555555'),
  role: 'candidate',
  name: 'Eligible Candidate',
  universityCampus: 'Main',
  branch: 'CSE',
  semester: 4,
  section: 'A',
  course: courseId
};

const ineligibleCandidate = {
  _id: new mongoose.Types.ObjectId('666666666666666666666666'),
  role: 'candidate',
  name: 'Ineligible Candidate',
  universityCampus: 'Other',
  branch: 'Mechanical',
  semester: 2,
  section: 'B',
  course: new mongoose.Types.ObjectId('777777777777777777777777')
};

test('quizRoutes attaches protect middleware to GET /:id', () => {
  const route = quizRoutes.stack.find((layer) => layer.route && layer.route.path === '/:id');
  assert.ok(route, 'Route /:id must exist in quizRoutes');
  const getHandlers = route.route.stack.filter((layer) => layer.method === 'get');
  assert.equal(getHandlers.length, 2, 'GET /:id must have exactly 2 handlers (protect + getQuizById)');
  assert.equal(getHandlers[0].name, 'protect', 'First GET handler on /:id must be protect middleware');
});

test('questionRoutes attaches protect middleware to GET /', () => {
  const route = questionRoutes.stack.find((layer) => layer.route && layer.route.path === '/');
  assert.ok(route, 'Route / must exist in questionRoutes');
  const getHandlers = route.route.stack.filter((layer) => layer.method === 'get');
  assert.equal(getHandlers.length, 2, 'GET / must have exactly 2 handlers (protect + getQuestionsForQuiz)');
  assert.equal(getHandlers[0].name, 'protect', 'First GET handler must be protect middleware');
});

test('getQuizById returns 404 for invalid ObjectId', async () => {
  const req = { params: { id: 'invalid-id' }, user: adminUser };
  const res = mockRes();
  await getQuizById(req, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Exam not found');
});

test('getQuizById returns 404 if exam does not exist', async () => {
  const originalFindById = ExamDeployment.findById;
  const originalFindOne = ExamDeployment.findOne;

  ExamDeployment.findById = () => ({
    populate: () => ({
      lean: async () => null
    })
  });
  ExamDeployment.findOne = () => ({
    populate: () => ({
      lean: async () => null
    })
  });

  try {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, user: adminUser };
    const res = mockRes();
    await getQuizById(req, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Exam not found');
  } finally {
    ExamDeployment.findById = originalFindById;
    ExamDeployment.findOne = originalFindOne;
  }
});

test('getQuizById allows admin access', async () => {
  const deploymentId = new mongoose.Types.ObjectId();
  const quizId = new mongoose.Types.ObjectId();

  const fakeDeployment = {
    _id: deploymentId,
    duration: 60,
    startTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    quiz: {
      _id: quizId,
      title: 'Operating Systems',
      examiner: ownerExaminer,
      course: { _id: courseId, name: 'B.Tech' },
      isActive: true,
      status: 'APPROVED'
    }
  };

  const originalFindById = ExamDeployment.findById;
  ExamDeployment.findById = () => ({
    populate: () => ({
      lean: async () => fakeDeployment
    })
  });

  try {
    const req = { params: { id: deploymentId.toString() }, user: adminUser };
    const res = mockRes();
    await getQuizById(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.title, 'Operating Systems');
  } finally {
    ExamDeployment.findById = originalFindById;
  }
});

test('getQuizById allows owning examiner but rejects non-owning examiner', async () => {
  const deploymentId = new mongoose.Types.ObjectId();
  const fakeDeployment = {
    _id: deploymentId,
    duration: 60,
    quiz: {
      _id: new mongoose.Types.ObjectId(),
      title: 'Data Structures',
      examiner: { _id: ownerExaminer._id, name: ownerExaminer.name },
      isActive: true,
      status: 'APPROVED'
    }
  };

  const originalFindById = ExamDeployment.findById;
  ExamDeployment.findById = () => ({
    populate: () => ({
      lean: async () => fakeDeployment
    })
  });

  try {
    // Owner
    const reqOwner = { params: { id: deploymentId.toString() }, user: ownerExaminer };
    const resOwner = mockRes();
    await getQuizById(reqOwner, resOwner);
    assert.equal(resOwner.statusCode, 200);

    // Non-owner
    const reqOther = { params: { id: deploymentId.toString() }, user: otherExaminer };
    const resOther = mockRes();
    await getQuizById(reqOther, resOther);
    assert.equal(resOther.statusCode, 403);
    assert.match(resOther.body.message, /Not authorized/);
  } finally {
    ExamDeployment.findById = originalFindById;
  }
});

test('getQuizById candidate access: rejects ineligible or non-live, allows live eligible', async () => {
  const deploymentId = new mongoose.Types.ObjectId();
  const baseDeployment = {
    _id: deploymentId,
    duration: 60,
    universityCampus: 'Main',
    branch: 'CSE',
    semester: 4,
    section: 'A',
    isPaused: false,
    startTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // Live 10m ago
    quiz: {
      _id: new mongoose.Types.ObjectId(),
      title: 'DBMS',
      examiner: ownerExaminer,
      course: courseId,
      isActive: true,
      status: 'APPROVED'
    }
  };

  const originalFindById = ExamDeployment.findById;

  try {
    // 1. Ineligible candidate receives 403
    ExamDeployment.findById = () => ({
      populate: () => ({
        lean: async () => baseDeployment
      })
    });
    const resIneligible = mockRes();
    await getQuizById({ params: { id: deploymentId.toString() }, user: ineligibleCandidate }, resIneligible);
    assert.equal(resIneligible.statusCode, 403);
    assert.equal(resIneligible.body.message, 'You are not eligible for this exam');

    // 2. Exam is paused: candidate receives 403
    ExamDeployment.findById = () => ({
      populate: () => ({
        lean: async () => ({ ...baseDeployment, isPaused: true })
      })
    });
    const resPaused = mockRes();
    await getQuizById({ params: { id: deploymentId.toString() }, user: eligibleCandidate }, resPaused);
    assert.equal(resPaused.statusCode, 403);
    assert.equal(resPaused.body.message, 'Exam is not currently accessible');

    // 3. Exam is upcoming (not live): candidate receives 403
    ExamDeployment.findById = () => ({
      populate: () => ({
        lean: async () => ({
          ...baseDeployment,
          startTime: new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour from now
        })
      })
    });
    const resUpcoming = mockRes();
    await getQuizById({ params: { id: deploymentId.toString() }, user: eligibleCandidate }, resUpcoming);
    assert.equal(resUpcoming.statusCode, 403);
    assert.equal(resUpcoming.body.message, 'Exam is not currently accessible');

    // 4. Exam is live, not paused, candidate eligible: 200
    ExamDeployment.findById = () => ({
      populate: () => ({
        lean: async () => baseDeployment
      })
    });
    const resSuccess = mockRes();
    await getQuizById({ params: { id: deploymentId.toString() }, user: eligibleCandidate }, resSuccess);
    assert.equal(resSuccess.statusCode, 200);
    assert.equal(resSuccess.body.title, 'DBMS');
  } finally {
    ExamDeployment.findById = originalFindById;
  }
});

test('getQuestionsForQuiz rejects invalid ObjectId with 404', async () => {
  const req = { params: { quizId: 'not-valid' }, user: adminUser };
  const res = mockRes();
  await getQuestionsForQuiz(req, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Quiz not found');
});

test('getQuestionsForQuiz allows admin and owning examiner, rejects non-owner', async () => {
  const quizId = new mongoose.Types.ObjectId();
  const fakeQuiz = {
    _id: quizId,
    title: 'Algorithms',
    examiner: ownerExaminer._id,
    isActive: true
  };
  const fakeQuestions = [
    { _id: new mongoose.Types.ObjectId(), text: 'Q1', options: ['A', 'B'], correctAnswerEncrypted: 'secret' }
  ];

  const origQuizFindById = Quiz.findById;
  const origQuestionFind = Question.find;

  Quiz.findById = () => ({
    populate: async () => fakeQuiz
  });
  Question.find = () => fakeQuestions;

  try {
    // Admin
    const resAdmin = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: adminUser }, resAdmin);
    assert.equal(resAdmin.statusCode, 200);
    assert.equal(resAdmin.body.length, 1);

    // Owning Examiner
    const resOwner = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: ownerExaminer }, resOwner);
    assert.equal(resOwner.statusCode, 200);
    assert.equal(resOwner.body.length, 1);

    // Non-owning Examiner
    const resOther = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: otherExaminer }, resOther);
    assert.equal(resOther.statusCode, 403);
    assert.match(resOther.body.message, /Not authorized/);
  } finally {
    Quiz.findById = origQuizFindById;
    Question.find = origQuestionFind;
  }
});

test('getQuestionsForQuiz candidate: requires active in_progress session, eligibility and live exam', async () => {
  const quizId = new mongoose.Types.ObjectId();
  const deploymentId = new mongoose.Types.ObjectId();

  const fakeQuiz = {
    _id: quizId,
    title: 'Network Security',
    examiner: ownerExaminer._id,
    course: courseId,
    isActive: true
  };

  const fakeDeployment = {
    _id: deploymentId,
    quiz: fakeQuiz,
    duration: 60,
    startTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
    isPaused: false,
    universityCampus: 'Main',
    branch: 'CSE',
    semester: 4,
    section: 'A'
  };

  const fakeQuestions = [
    {
      _id: new mongoose.Types.ObjectId(),
      quiz: quizId,
      text: 'What is AES?',
      options: ['Cipher', 'Protocol', 'Hash', 'Algorithm'],
      marks: 1,
      negativeMarks: 0
    }
  ];

  const origQuizFindById = Quiz.findById;
  const origDeploymentFind = ExamDeployment.find;
  const origSessionFindOne = ExamSession.findOne;
  const origQuestionFind = Question.find;

  Quiz.findById = () => ({
    populate: async () => fakeQuiz
  });
  ExamDeployment.find = () => ({
    populate: async () => [fakeDeployment]
  });

  try {
    // 1. Candidate without active session -> 403
    ExamSession.findOne = async () => null;
    const resNoSession = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: eligibleCandidate }, resNoSession);
    assert.equal(resNoSession.statusCode, 403);
    assert.equal(resNoSession.body.message, 'No active in-progress exam session found');

    // 2. Candidate with session, but ineligible -> 403
    ExamSession.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      candidate: ineligibleCandidate._id,
      examDeployment: deploymentId,
      status: 'in_progress'
    });
    const resIneligible = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: ineligibleCandidate }, resIneligible);
    assert.equal(resIneligible.statusCode, 403);
    assert.equal(resIneligible.body.message, 'You are not eligible for this exam');

    // 3. Candidate with session and eligible, but exam is paused -> 403
    ExamDeployment.find = () => ({
      populate: async () => [{ ...fakeDeployment, isPaused: true }]
    });
    ExamSession.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      candidate: eligibleCandidate._id,
      examDeployment: deploymentId,
      status: 'in_progress'
    });
    const resPaused = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: eligibleCandidate }, resPaused);
    assert.equal(resPaused.statusCode, 403);
    assert.equal(resPaused.body.message, 'Exam is not currently live');

    // 4. Candidate with session and eligible, but exam completed -> 403
    ExamDeployment.find = () => ({
      populate: async () => [{
        ...fakeDeployment,
        startTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        duration: 30 // Ended 1.5h ago
      }]
    });
    const resExpired = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: eligibleCandidate }, resExpired);
    assert.equal(resExpired.statusCode, 403);
    assert.equal(resExpired.body.message, 'Exam is not currently live');

    // 5. Candidate with active in-progress session, eligible, LIVE exam -> 200 and excludes correctAnswerEncrypted
    ExamDeployment.find = () => ({
      populate: async () => [fakeDeployment]
    });
    let selectedProjection = '';
    Question.find = () => ({
      select: (proj) => {
        selectedProjection = proj;
        return fakeQuestions;
      }
    });

    const resSuccess = mockRes();
    await getQuestionsForQuiz({ params: { quizId: quizId.toString() }, user: eligibleCandidate }, resSuccess);
    assert.equal(resSuccess.statusCode, 200);
    assert.equal(resSuccess.body.length, 1);
    assert.equal(resSuccess.body[0].text, 'What is AES?');
    assert.equal(selectedProjection, '-correctAnswerEncrypted');
    assert.equal(resSuccess.body[0].correctAnswerEncrypted, undefined);
  } finally {
    Quiz.findById = origQuizFindById;
    ExamDeployment.find = origDeploymentFind;
    ExamSession.findOne = origSessionFindOne;
    Question.find = origQuestionFind;
  }
});

test('sessionRoutes attaches protect middleware to GET /:attemptId', () => {
  const route = sessionRoutes.stack.find((layer) => layer.route && layer.route.path === '/:attemptId');
  assert.ok(route, 'Route /:attemptId must exist in sessionRoutes');
  const getHandlers = route.route.stack.filter((layer) => layer.method === 'get');
  assert.equal(getHandlers.length, 2, 'GET /:attemptId must have 2 handlers (protect + getAttemptById)');
  assert.equal(getHandlers[0].name, 'protect', 'First GET handler on /:attemptId must be protect middleware');
});

test('getAttemptById returns 404 for invalid ObjectId', async () => {
  const req = { params: { attemptId: 'invalid-attempt' }, user: adminUser };
  const res = mockRes();
  await getAttemptById(req, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Attempt not found');
});

test('getAttemptById returns 404 if attempt does not exist', async () => {
  const origFindById = ExamSession.findById;
  ExamSession.findById = () => ({
    populate: () => ({
      populate: async () => null
    })
  });

  try {
    const req = { params: { attemptId: new mongoose.Types.ObjectId().toString() }, user: adminUser };
    const res = mockRes();
    await getAttemptById(req, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Attempt not found');
  } finally {
    ExamSession.findById = origFindById;
  }
});

test('getAttemptById allows candidate to fetch their own attempt, populates quiz/deployment info without exposing answers', async () => {
  const attemptId = new mongoose.Types.ObjectId();
  const deploymentId = new mongoose.Types.ObjectId();
  const quizId = new mongoose.Types.ObjectId();

  const fakeSession = {
    _id: attemptId,
    candidate: { _id: eligibleCandidate._id, name: eligibleCandidate.name, email: 'candidate@test.com' },
    status: 'in_progress',
    startTime: new Date('2026-08-17T10:00:00.000Z'),
    responses: [
      { question: new mongoose.Types.ObjectId(), selectedOption: 'Option A' }
    ],
    examDeployment: {
      _id: deploymentId,
      duration: 60,
      startTime: new Date('2026-08-17T09:55:00.000Z'),
      isPaused: false,
      broadcastMessage: 'Good luck!',
      universityCampus: 'Main',
      branch: 'CSE',
      semester: 4,
      section: 'A',
      quiz: {
        _id: quizId,
        title: 'Distributed Systems',
        description: 'Midterm Exam',
        totalMarks: 100,
        course: courseId,
        duration: 60,
        markDistributionType: 'equal',
        isActive: true,
        status: 'APPROVED',
        examiner: ownerExaminer
      }
    },
    toObject() {
      return JSON.parse(JSON.stringify(this));
    }
  };

  const origFindById = ExamSession.findById;
  ExamSession.findById = () => ({
    populate: () => ({
      populate: async () => fakeSession
    })
  });

  try {
    // 1. Candidate accessing their own attempt -> 200 with populated quiz info
    const req = { params: { attemptId: attemptId.toString() }, user: eligibleCandidate };
    const res = mockRes();
    await getAttemptById(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body._id, attemptId.toString());
    assert.equal(res.body.quiz.title, 'Distributed Systems');
    assert.equal(res.body.quiz.duration, 60);
    assert.equal(res.body.quiz.broadcastMessage, 'Good luck!');
    assert.equal(res.body.quizId, quizId.toString());
    assert.equal(res.body.deploymentId, deploymentId.toString());
    // Responses should only have question and selectedOption, no answer evaluation leaked
    assert.equal(res.body.responses[0].selectedOption, 'Option A');
    assert.equal(res.body.responses[0].isCorrect, undefined);

    // 2. Unauthorized candidate accessing someone else's attempt -> 403
    const reqOther = { params: { attemptId: attemptId.toString() }, user: ineligibleCandidate };
    const resOther = mockRes();
    await getAttemptById(reqOther, resOther);
    assert.equal(resOther.statusCode, 403);
    assert.equal(resOther.body.message, 'Not authorized to access this attempt');

    // 3. Admin accessing the attempt -> 200
    const reqAdmin = { params: { attemptId: attemptId.toString() }, user: adminUser };
    const resAdmin = mockRes();
    await getAttemptById(reqAdmin, resAdmin);
    assert.equal(resAdmin.statusCode, 200);

    // 4. Owning examiner accessing the attempt -> 200
    const reqOwner = { params: { attemptId: attemptId.toString() }, user: ownerExaminer };
    const resOwner = mockRes();
    await getAttemptById(reqOwner, resOwner);
    assert.equal(resOwner.statusCode, 200);

    // 5. Non-owning examiner accessing the attempt -> 403
    const reqOtherExaminer = { params: { attemptId: attemptId.toString() }, user: otherExaminer };
    const resOtherExaminer = mockRes();
    await getAttemptById(reqOtherExaminer, resOtherExaminer);
    assert.equal(resOtherExaminer.statusCode, 403);
  } finally {
    ExamSession.findById = origFindById;
  }
});

test('ISS-03: createUserByAdmin never exposes password hash in response', async () => {
  const origFindOne = User.findOne;
  const origCreate = User.create;

  try {
    User.findOne = async () => null;
    User.create = async (userData) => ({
      _id: new mongoose.Types.ObjectId('777777777777777777777777'),
      name: userData.name,
      email: userData.email,
      password: userData.password, // bcrypt hash created in controller
      role: userData.role,
      toObject() {
        return {
          _id: this._id,
          name: this.name,
          email: this.email,
          password: this.password,
          role: this.role
        };
      }
    });

    const req = {
      body: {
        name: 'New Candidate',
        email: 'newcand@geu.ac.in',
        password: 'Password123!',
        role: 'candidate'
      }
    };
    const res = mockRes();

    await createUserByAdmin(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.name, 'New Candidate');
    assert.equal(res.body.email, 'newcand@geu.ac.in');
    assert.equal(res.body.password, undefined, 'Password hash must be stripped from response');
  } finally {
    User.findOne = origFindOne;
    User.create = origCreate;
  }
});

test('ISS-03: getUsers excludes password field using Mongoose projection', async () => {
  const origFind = User.find;

  try {
    let capturedSelect = null;

    User.find = (query) => {
      assert.deepEqual(query, { role: { $ne: 'admin' } });
      const queryObj = {
        select(fields) {
          capturedSelect = fields;
          return this;
        },
        populate() {
          return Promise.resolve([
            { _id: '1', name: 'Student 1', email: 's1@geu.ac.in' },
            { _id: '2', name: 'Student 2', email: 's2@geu.ac.in' }
          ]);
        }
      };
      return queryObj;
    };

    const req = { user: adminUser };
    const res = mockRes();

    await getUsers(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(capturedSelect, '-password', 'getUsers must explicitly exclude password via .select("-password")');
    assert.equal(res.body.length, 2);
    assert.equal(res.body[0].password, undefined);
  } finally {
    User.find = origFind;
  }
});
