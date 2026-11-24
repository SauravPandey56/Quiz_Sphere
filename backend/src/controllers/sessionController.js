import mongoose from 'mongoose';
import ExamDeployment from '../models/ExamDeployment.js';
import ExamSession from '../models/ExamSession.js';
import Question from '../models/Question.js';
import { decrypt } from '../utils/encryption.js';
import { getDeploymentWindowState, isCandidateEligible } from '../utils/examEligibility.js';

const getDeploymentWithQuiz = (deploymentId) => ExamDeployment.findById(deploymentId).populate({
  path: 'quiz',
  populate: { path: 'course', select: 'name' }
});

export const startAttempt = async (req, res) => {
  try {
    const deploymentId = req.body.deploymentId || req.body.quizId;
    if (!deploymentId) return res.status(400).json({ message: 'deploymentId is required' });

    const deployment = await getDeploymentWithQuiz(deploymentId);
    if (!deployment || !deployment.quiz?.isActive) {
      return res.status(404).json({ message: 'Exam not found or inactive' });
    }

    if (!isCandidateEligible(deployment, req.user)) {
      return res.status(403).json({ message: 'You are not eligible for this exam' });
    }

    const windowState = getDeploymentWindowState(deployment);
    if (windowState !== 'LIVE') {
      return res.status(400).json({ message: `Exam is currently ${windowState.toLowerCase()}` });
    }

    const attemptCount = await ExamSession.countDocuments({
      candidate: req.user._id,
      examDeployment: deployment._id
    });
    const maxAttempts = deployment.maxAttempts || (deployment.allowRetake ? 2 : 1);
    if (attemptCount >= maxAttempts) {
      return res.status(400).json({ message: 'Maximum attempts reached for this exam' });
    }

    const activeSession = await ExamSession.findOne({
      candidate: req.user._id,
      examDeployment: deployment._id,
      status: 'in_progress'
    });
    if (activeSession) return res.status(409).json(activeSession);

    const session = await ExamSession.create({
      candidate: req.user._id,
      examDeployment: deployment._id,
      status: 'in_progress'
    });

    res.status(201).json({
      ...session.toObject(),
      deploymentId: deployment._id,
      quizId: deployment.quiz._id
    });
  } catch (error) {
    console.error('Start attempt error:', error);
    res.status(500).json({ message: 'Unable to start exam' });
  }
};

export const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body;
    if (!Array.isArray(responses)) return res.status(400).json({ message: 'responses must be an array' });

    const session = await ExamSession.findById(attemptId);
    if (!session || ['submitted', 'auto_submitted'].includes(session.status)) {
      return res.status(400).json({ message: 'Attempt not found or already completed' });
    }
    if (session.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const deployment = await getDeploymentWithQuiz(session.examDeployment);
    if (!deployment?.quiz) return res.status(404).json({ message: 'Exam not found' });

    const questions = await Question.find({ quiz: deployment.quiz._id });
    const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));
    const submittedQuestionIds = new Set();
    const now = Date.now();
    const sessionDeadline = new Date(session.startTime).getTime() + (deployment.duration * 60 * 1000);
    const deploymentDeadline = deployment.endTime ? new Date(deployment.endTime).getTime() : null;
    const isLate = now > sessionDeadline || (deploymentDeadline && now > deploymentDeadline);

    let score = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalNegativeMarks = 0;
    const processedResponses = [];

    for (const response of responses) {
      if (!response?.questionId || submittedQuestionIds.has(String(response.questionId))) {
        return res.status(400).json({ message: 'Responses must contain unique question IDs' });
      }
      submittedQuestionIds.add(String(response.questionId));

      const question = questionMap.get(String(response.questionId));
      if (!question) return res.status(400).json({ message: 'Response contains a question outside this exam' });

      const selectedOption = response.selectedOption === null || response.selectedOption === undefined
        ? ''
        : String(response.selectedOption);
      const correctAnswer = decrypt(question.correctAnswerEncrypted);
      const isAttempted = selectedOption !== '';
      const isCorrect = isAttempted && selectedOption === correctAnswer;
      let marksAwarded = 0;

      if (isCorrect) {
        marksAwarded = deployment.quiz.markDistributionType === 'equal'
          ? (deployment.quiz.totalMarks / Math.max(questions.length, 1))
          : question.marks;
        score += marksAwarded;
        totalCorrect += 1;
      } else if (isAttempted) {
        marksAwarded = -question.negativeMarks;
        score += marksAwarded;
        totalNegativeMarks += question.negativeMarks;
        totalIncorrect += 1;
      }

      processedResponses.push({
        question: question._id,
        selectedOption,
        isCorrect,
        marksAwarded
      });
    }

    session.responses = processedResponses;
    session.score = score;
    session.totalCorrect = totalCorrect;
    session.totalIncorrect = totalIncorrect;
    session.totalNegativeMarks = totalNegativeMarks;
    session.status = isLate ? 'auto_submitted' : 'submitted';
    session.endTime = new Date();
    await session.save();

    res.json(session);
  } catch (error) {
    console.error('Submit attempt error:', error);
    res.status(500).json({ message: 'Unable to evaluate exam submission' });
  }
};

export const getAttempts = async (req, res) => {
  try {
    const query = req.user.role === 'candidate' ? { candidate: req.user._id } : {};
    const sessions = await ExamSession.find(query)
      .populate({
        path: 'examDeployment',
        populate: { path: 'quiz', select: 'title totalMarks course duration' }
      })
      .populate('candidate', 'name email');

    const mappedSessions = sessions.map((session) => {
      const raw = session.toObject();
      const deployment = raw.examDeployment;
      const quiz = deployment?.quiz;
      if (deployment && quiz) {
        raw.deploymentId = deployment._id;
        raw.quizId = quiz._id;
        raw.quiz = {
          ...quiz,
          startTime: deployment.startTime,
          duration: deployment.duration,
          deploymentId: deployment._id,
          quizId: quiz._id,
          isPaused: deployment.isPaused
        };
        delete raw.examDeployment;
      }
      raw.sessionStatus = raw.status;
      if (raw.status === 'submitted' || raw.status === 'auto_submitted') raw.status = 'completed';
      if (raw.status === 'in_progress') raw.status = 'in-progress';
      return raw;
    });

    res.json(mappedSessions);
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ message: 'Unable to load attempts' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const sessions = await ExamSession.find({ status: { $in: ['submitted', 'auto_submitted'] } })
      .populate({ path: 'examDeployment', populate: { path: 'quiz', select: 'title course' } })
      .populate('candidate', 'name universityCampus branch semester section')
      .sort({ score: -1, endTime: 1 })
      .limit(100);

    const mappedLeaderboard = sessions
      .filter((session) => session.candidate && session.examDeployment?.quiz)
      .map((session) => ({
        _id: session._id,
        score: session.score,
        quizTitle: session.examDeployment.quiz.title,
        candidateName: session.candidate.name,
        campus: session.candidate.universityCampus || 'Standard',
        branch: session.candidate.branch || 'General',
        semester: session.candidate.semester || 'N/A'
      }));

    res.json(mappedLeaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Unable to load leaderboard' });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const session = await ExamSession.findById(attemptId)
      .populate({
        path: 'examDeployment',
        populate: {
          path: 'quiz',
          select: 'title description totalMarks course duration markDistributionType isActive status examiner'
        }
      })
      .populate('candidate', 'name email');

    if (!session || !session.examDeployment?.quiz) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Authorization & Candidate Ownership Check
    const candidateId = session.candidate?._id || session.candidate;
    const examinerId = session.examDeployment.quiz?.examiner?._id || session.examDeployment.quiz?.examiner;

    const isAdmin = req.user.role === 'admin';
    const isOwnerExaminer = req.user.role === 'examiner' && examinerId && examinerId.toString() === req.user._id.toString();
    const isCandidateOwner = req.user.role === 'candidate' && candidateId && candidateId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwnerExaminer && !isCandidateOwner) {
      return res.status(403).json({ message: 'Not authorized to access this attempt' });
    }

    const raw = session.toObject();
    const deployment = raw.examDeployment;
    const quiz = deployment?.quiz;

    if (deployment && quiz) {
      raw.deploymentId = deployment._id;
      raw.quizId = quiz._id;
      raw.quiz = {
        ...quiz,
        startTime: deployment.startTime,
        duration: deployment.duration,
        deploymentId: deployment._id,
        quizId: quiz._id,
        isPaused: deployment.isPaused,
        broadcastMessage: deployment.broadcastMessage || '',
        universityCampus: deployment.universityCampus,
        branch: deployment.branch,
        semester: deployment.semester,
        section: deployment.section
      };
      delete raw.examDeployment;
    }

    raw.sessionStatus = raw.status;
    if (raw.status === 'submitted' || raw.status === 'auto_submitted') raw.status = 'completed';
    if (raw.status === 'in_progress') raw.status = 'in-progress';

    // Never expose evaluation internals to candidate during active attempt
    if (req.user.role === 'candidate' && (raw.sessionStatus === 'in_progress' || raw.status === 'in-progress')) {
      if (raw.responses) {
        raw.responses = raw.responses.map(r => ({
          question: r.question,
          selectedOption: r.selectedOption
        }));
      }
    }

    res.json(raw);
  } catch (error) {
    console.error('Get attempt by ID error:', error);
    res.status(500).json({ message: 'Unable to load attempt' });
  }
};

export const saveAttemptProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const session = await ExamSession.findById(attemptId);
    if (!session) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Candidate ownership check
    const candidateId = session.candidate?._id || session.candidate;
    if (candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this attempt' });
    }

    // Only allow saving while attempt is genuinely in progress
    if (session.status !== 'in_progress') {
      return res.status(400).json({ message: 'Attempt is not in progress or has already been submitted' });
    }

    const deployment = await getDeploymentWithQuiz(session.examDeployment);
    if (!deployment?.quiz) {
      return res.status(404).json({ message: 'Exam deployment not found' });
    }

    // Check expiration
    const now = Date.now();
    const sessionDeadline = new Date(session.startTime).getTime() + (deployment.duration * 60 * 1000);
    const deploymentDeadline = deployment.endTime ? new Date(deployment.endTime).getTime() : null;
    const isLate = now > sessionDeadline || (deploymentDeadline && now > deploymentDeadline);

    if (isLate) {
      return res.status(400).json({ message: 'Exam time has expired' });
    }

    // Validate clientSeq — required for concurrency control
    const { responses, clientSeq } = req.body;
    if (typeof clientSeq !== 'number' || !Number.isInteger(clientSeq) || clientSeq < 1) {
      return res.status(400).json({ message: 'clientSeq must be a positive integer' });
    }

    if (!Array.isArray(responses)) {
      return res.status(400).json({ message: 'responses must be an array' });
    }

    // Validate question IDs against this quiz
    const questions = await Question.find({ quiz: deployment.quiz._id }).select('_id');
    const validQuestionMap = new Set(questions.map((q) => q._id.toString()));
    const seenQuestionIds = new Set();
    const sanitizedResponses = [];

    for (const r of responses) {
      if (!r || typeof r !== 'object') {
        return res.status(400).json({ message: 'Each response entry must be an object' });
      }
      const qId = String(r.questionId || r.question || '');
      if (!qId || !mongoose.Types.ObjectId.isValid(qId) || !validQuestionMap.has(qId)) {
        return res.status(400).json({ message: 'Response contains an invalid question ID for this exam' });
      }
      if (seenQuestionIds.has(qId)) {
        return res.status(400).json({ message: 'Responses must contain unique question IDs' });
      }
      seenQuestionIds.add(qId);

      const selectedOption = r.selectedOption === null || r.selectedOption === undefined
        ? ''
        : String(r.selectedOption);

      sanitizedResponses.push({
        question: new mongoose.Types.ObjectId(qId),
        selectedOption
      });
    }

    // Atomic versioned write — only proceeds if clientSeq > autoSaveSeq stored in DB.
    // This prevents an older in-flight save from overwriting a newer snapshot.
    // $max ensures autoSaveSeq is always set to the highest value seen.
    const updateResult = await ExamSession.updateOne(
      { _id: session._id, status: 'in_progress', autoSaveSeq: { $lt: clientSeq } },
      { $set: { responses: sanitizedResponses }, $max: { autoSaveSeq: clientSeq } }
    );

    if (updateResult.matchedCount === 0) {
      // A newer save already landed — the candidate's current answers are safe.
      return res.status(409).json({
        message: 'Stale autosave: a newer snapshot has already been saved. No answers were lost.'
      });
    }

    res.json({
      success: true,
      message: 'Progress saved successfully',
      savedCount: sanitizedResponses.length,
      savedVersion: clientSeq,
      responses: sanitizedResponses.map((item) => ({
        question: item.question,
        selectedOption: item.selectedOption
      }))
    });
  } catch (error) {
    console.error('Save attempt progress error:', error);
    res.status(500).json({ message: 'Unable to save attempt progress' });
  }
};
