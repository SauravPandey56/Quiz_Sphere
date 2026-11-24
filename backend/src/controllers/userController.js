import User from '../models/User.js';
import ExamSession from '../models/ExamSession.js';
import bcrypt from 'bcryptjs';

const ALLOWED_IMAGE_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const ALLOWED_IMAGE_URL_REGEX = /^(https?:\/\/|\/uploads\/)/i;
const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

const validateProfileImage = (profileImage) => {
  if (profileImage === '' || profileImage === null) return null;
  if (typeof profileImage !== 'string') {
    return 'Invalid profile image format.';
  }

  const trimmed = profileImage.trim();
  if (trimmed === '') return null;

  const dataUrlMatch = trimmed.match(ALLOWED_IMAGE_DATA_URL_REGEX);
  if (dataUrlMatch) {
    const base64Data = dataUrlMatch[2];
    const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
    const byteSize = Math.floor((base64Data.length * 3) / 4) - padding;
    if (byteSize > MAX_PROFILE_IMAGE_BYTES) {
      return 'Profile image size must be less than 2MB.';
    }
    return null;
  }

  if (ALLOWED_IMAGE_URL_REGEX.test(trimmed)) {
    return null;
  }

  return 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WEBP image.';
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.profileImage !== undefined) {
      const imageError = validateProfileImage(req.body.profileImage);
      if (imageError) {
        return res.status(400).json({ message: imageError });
      }
      user.profileImage = typeof req.body.profileImage === 'string' ? req.body.profileImage.trim() : '';
    }

    user.name = req.body.name || user.name;
    if (req.body.contactNumber !== undefined) user.contactNumber = req.body.contactNumber;
    if (req.body.dob !== undefined) user.dob = req.body.dob;
    if (req.body.address !== undefined) user.address = req.body.address;
    if (req.body.fatherName !== undefined) user.fatherName = req.body.fatherName;
    if (req.body.universityCampus !== undefined) user.universityCampus = req.body.universityCampus;
    if (req.body.branch !== undefined) user.branch = req.body.branch;
    if (req.body.semester !== undefined) user.semester = req.body.semester;
    if (req.body.section !== undefined) user.section = req.body.section;
    
    if (req.body.password) {
      if (req.body.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      course: updatedUser.course,
      profileImage: updatedUser.profileImage,
      contactNumber: updatedUser.contactNumber,
      dob: updatedUser.dob,
      address: updatedUser.address,
      fatherName: updatedUser.fatherName,
      universityCampus: updatedUser.universityCampus,
      branch: updatedUser.branch,
      semester: updatedUser.semester,
      section: updatedUser.section
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .populate('course', 'name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User completely deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'unblocked' : 'blocked'} successfully`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGlobalPerformance = async (req, res) => {
  try {
    const sessions = await ExamSession.find({ status: { $in: ['submitted', 'auto_submitted'] } })
      .populate({
        path: 'candidate',
        select: 'name email universityCampus branch semester section course',
        populate: { path: 'course', select: 'name' }
      })
      .populate({
        path: 'examDeployment',
        populate: { path: 'quiz', select: 'title totalMarks course', populate: { path: 'course', select: 'name' } }
      })
      .sort({ endTime: -1 });

    const attempts = sessions
      .filter((session) => session.candidate && session.examDeployment?.quiz)
      .map((session) => ({
        ...session.toObject(),
        status: 'completed',
        deploymentId: session.examDeployment._id,
        quizId: session.examDeployment.quiz._id,
        quiz: session.examDeployment.quiz
      }));

    res.json(attempts);
  } catch (error) {
    console.error('Global performance error:', error);
    res.status(500).json({ message: 'Unable to load global performance data' });
  }
};

export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role, course, universityCampus, branch, semester, section } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name, email, password: hashedPassword, role, course, universityCampus, branch, semester, section
    });

    const userObject = user.toObject();
    delete userObject.password;

    res.status(201).json(userObject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
