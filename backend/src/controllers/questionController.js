import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import ExamDeployment from '../models/ExamDeployment.js';
import ExamSession from '../models/ExamSession.js';
import { encrypt } from '../utils/encryption.js';
import { isCandidateEligible, getDeploymentWindowState } from '../utils/examEligibility.js';

export const addQuestion = async (req, res) => {
  try {
    const { text, options, correctAnswer, marks, negativeMarks } = req.body;
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    let quiz = await Quiz.findById(quizId);
    if (!quiz) {
      const deployment = await ExamDeployment.findById(quizId).populate('quiz');
      if (deployment?.quiz) {
        quiz = deployment.quiz;
      }
    }

    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    
    const examinerId = quiz.examiner?._id || quiz.examiner;
    if (examinerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Encrypt the correct answer
    const correctAnswerEncrypted = encrypt(correctAnswer.toString());

    const question = await Question.create({
      quiz: quiz._id,
      text,
      options,
      correctAnswerEncrypted,
      marks: quiz.markDistributionType === 'individual' ? marks : 1,
      negativeMarks: negativeMarks || 0
    });

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuestionsForQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Resolve quiz whether quizId is a Quiz._id or ExamDeployment._id
    let quiz = await Quiz.findById(quizId).populate('course');
    let deployment = null;

    if (!quiz) {
      deployment = await ExamDeployment.findById(quizId).populate({
        path: 'quiz',
        populate: { path: 'course' }
      });
      if (deployment?.quiz) {
        quiz = deployment.quiz;
      }
    }

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Role-based authorization
    if (req.user.role === 'admin') {
      const questions = await Question.find({ quiz: quiz._id });
      return res.json(questions);
    }

    if (req.user.role === 'examiner') {
      const examinerId = quiz.examiner?._id || quiz.examiner;
      if (examinerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view questions for this quiz' });
      }
      const questions = await Question.find({ quiz: quiz._id });
      return res.json(questions);
    }

    if (req.user.role === 'candidate') {
      // 1. Locate all deployments associated with this quiz
      let deployments;
      if (deployment) {
        deployments = [deployment];
      } else {
        deployments = await ExamDeployment.find({ quiz: quiz._id }).populate({
          path: 'quiz',
          populate: { path: 'course' }
        });
      }

      if (!deployments.length) {
        return res.status(403).json({ message: 'No deployments found for this exam' });
      }

      const deploymentIds = deployments.map(d => d._id);

      // 2. Check for an existing ExamSession belonging to req.user._id with status 'in_progress'
      const activeSession = await ExamSession.findOne({
        candidate: req.user._id,
        examDeployment: { $in: deploymentIds },
        status: 'in_progress'
      });

      if (!activeSession) {
        return res.status(403).json({ message: 'No active in-progress exam session found' });
      }

      // 3. Find matching deployment for this session
      const sessionDeployment = deployments.find(
        d => d._id.toString() === activeSession.examDeployment.toString()
      );

      if (!sessionDeployment) {
        return res.status(403).json({ message: 'Deployment not found for active session' });
      }

      // 4. Check candidate eligibility (course, campus, branch, semester, section)
      if (!isCandidateEligible(sessionDeployment, req.user)) {
        return res.status(403).json({ message: 'You are not eligible for this exam' });
      }

      // 5. Active, unpaused deployment within its scheduled time window
      const windowState = getDeploymentWindowState(sessionDeployment);
      if (windowState !== 'LIVE' || sessionDeployment.isPaused || !sessionDeployment.quiz?.isActive) {
        return res.status(403).json({ message: 'Exam is not currently live' });
      }

      // 6. Return questions without correctAnswerEncrypted (never expose correct answers to candidates)
      const questions = await Question.find({ quiz: quiz._id }).select('-correctAnswerEncrypted');
      return res.json(questions);
    }

    return res.status(403).json({ message: 'Not authorized' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
