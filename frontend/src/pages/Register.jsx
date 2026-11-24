import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import QuizSphereLogo from '../components/logo/QuizSphereLogo';
import { 
  User, Mail, Lock, Eye, EyeOff, GraduationCap, 
  UserCheck, Phone, MapPin, Camera, ArrowRight, ArrowLeft, 
  Check, Sun, Moon, AlertCircle
} from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'candidate',
    course: '', universityCampus: '', branch: '', semester: 1, section: '',
    contact: '', address: '', profilePhoto: null
  });
  
  const [courses, setCourses] = useState([]);
  const [settings, setSettings] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState('');

  const { register } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoursesAndSettings = async () => {
      try {
        const [coursesRes, settingsRes] = await Promise.all([
          axios.get('/api/courses'),
          axios.get('/api/settings')
        ]);
        setCourses(coursesRes.data || []);
        if (coursesRes.data && coursesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, course: coursesRes.data[0]._id }));
        }
        setSettings(settingsRes.data || []);
      } catch {
        console.error('Data fetch failed');
      }
    };
    fetchCoursesAndSettings();
  }, []);

  const campuses = settings.filter(s => s.type === 'campus').map(s => s.value);
  const branches = settings.filter(s => s.type === 'branch').map(s => s.value);
  const sections = settings.filter(s => s.type === 'section').map(s => s.value);
  
  const defaultCampuses = ['GEU DEHRADUN', 'GEHU DEHRADUN', 'GEHU haldwani', 'GEHU bihmtal'];
  const defaultBranches = ['CSE', 'mechanical', 'civil', 'electrical', 'ECE', 'chemical'];
  const defaultSections = ['A', 'B', 'C', 'D'];
  const getOptions = (arr, defaultArr) => arr.length > 0 ? arr : defaultArr;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      let strength = 0;
      if (value.length > 5) strength += 25;
      if (value.match(/[a-z]+/)) strength += 25;
      if (value.match(/[A-Z]+/)) strength += 25;
      if (value.match(/[@$!%*#?&]+/)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return { label: 'Too short', color: 'text-slate-400' };
    if (passwordStrength <= 25) return { label: 'Weak', color: 'text-rose-500' };
    if (passwordStrength <= 50) return { label: 'Fair', color: 'text-amber-500' };
    if (passwordStrength <= 75) return { label: 'Good', color: 'text-indigo-400' };
    return { label: 'Strong', color: 'text-emerald-500' };
  };

  const validateStep1 = () => {
    setError('');
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      if (formData.role === 'examiner') {
        setStep(3); // Examiner skips academic setup directly to Step 3
      } else {
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      const { course, universityCampus, branch, semester, section } = formData;
      if (!course || !universityCampus || !branch || !semester || !section) {
        setError('Please complete all academic details before continuing.');
        return;
      }
      setError('');
      setStep(3);
    }
  };


  const handleBackStep = () => {
    setError('');
    if (step === 3) {
      if (formData.role === 'examiner') {
        setStep(1); // Examiner returns back to Step 1
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (payload.role !== 'candidate') {
        delete payload.course;
      }
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step metadata
  const stepsMeta = [
    { num: 1, title: 'Account Details', subtitle: 'Personal credentials' },
    { num: 2, title: 'Academic Details', subtitle: 'Course & campus' },
    { num: 3, title: 'Contact & Profile', subtitle: 'Final review' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between transition-colors duration-300 selection:bg-[var(--primary)]/30 selection:text-[var(--primary)] relative overflow-hidden">
      
      {/* Subtle Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[var(--primary)]/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-[#4F8CFF]/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="focus:outline-none focus:ring-2 focus:ring-[var(--primary)] rounded-lg">
          <QuizSphereLogo size="md" layout="horizontal" />
        </Link>
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={toggleTheme} 
            className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden sm:flex items-center text-xs text-[var(--muted)]">
            Already registered?
            <Link to="/login" className="ml-1.5 font-semibold text-[var(--primary)] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Centered Registration Container */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col justify-center relative z-10">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-[var(--shadow)] relative overflow-hidden transition-all duration-300">
          
          {/* Header Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] font-heading">
              Create Your Account
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1.5">
              Join QuizSphere to experience secure online examinations
            </p>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="mb-8" aria-label="Registration Progress">
            <div className="flex items-center justify-between relative">
              {/* Stepper Track */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-[var(--border)] -z-0"></div>
              <div 
                className="absolute top-4 left-6 h-0.5 bg-[var(--primary)] transition-all duration-300 -z-0"
                style={{
                  width: step === 1 ? '0%' : step === 2 ? '50%' : '100%'
                }}
              ></div>

              {stepsMeta.map((s) => {
                const isCompleted = step > s.num;
                const isCurrent = step === s.num;
                const isSkipped = formData.role === 'examiner' && s.num === 2;

                return (
                  <div key={s.num} className="flex flex-col items-center relative z-10">
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 ${
                        isCompleted 
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20' 
                          : isCurrent 
                            ? 'bg-[var(--surface)] border-[var(--primary)] text-[var(--primary)] ring-4 ring-[var(--primary)]/15 font-extrabold'
                            : isSkipped 
                              ? 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]/50 opacity-60'
                              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]'
                      }`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {isCompleted ? <Check size={16} strokeWidth={3} /> : s.num}
                    </div>
                    <span className={`text-xs mt-2 font-medium hidden sm:block ${isCurrent ? 'text-[var(--text)] font-semibold' : 'text-[var(--muted)]'}`}>
                      {isSkipped ? 'Academic (N/A)' : s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div 
              role="alert" 
              className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2.5 transition-all"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} noValidate>
            
            {/* ================= STEP 1: ACCOUNT DETAILS ================= */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                
                {/* Role Selection Cards */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2.5">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* Candidate Option */}
                    <label 
                      className={`relative cursor-pointer rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                        formData.role === 'candidate' 
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-sm' 
                          : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--primary)]/40'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="role" 
                        value="candidate" 
                        checked={formData.role === 'candidate'} 
                        onChange={handleChange} 
                        className="sr-only" 
                      />
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl ${formData.role === 'candidate' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--muted)]'}`}>
                          <GraduationCap size={20} />
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.role === 'candidate' ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'
                        }`}>
                          {formData.role === 'candidate' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-[var(--text)] block">Candidate</span>
                        <span className="text-xs text-[var(--muted)] mt-0.5 block leading-relaxed">
                          Take exams and track your academic progress
                        </span>
                      </div>
                    </label>

                    {/* Examiner Option */}
                    <label 
                      className={`relative cursor-pointer rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                        formData.role === 'examiner' 
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-sm' 
                          : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--primary)]/40'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="role" 
                        value="examiner" 
                        checked={formData.role === 'examiner'} 
                        onChange={handleChange} 
                        className="sr-only" 
                      />
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl ${formData.role === 'examiner' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--muted)]'}`}>
                          <UserCheck size={20} />
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.role === 'examiner' ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'
                        }`}>
                          {formData.role === 'examiner' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-[var(--text)] block">Examiner</span>
                        <span className="text-xs text-[var(--muted)] mt-0.5 block leading-relaxed">
                          Create, deploy, and evaluate examinations
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <User size={18} />
                    </div>
                    <input 
                      type="text" 
                      name="name" 
                      id="name" 
                      required
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="e.g. Saurav Pandey"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <Mail size={18} />
                    </div>
                    <input 
                      type="email" 
                      name="email" 
                      id="email" 
                      required
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="e.g. saurav@university.edu"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Password & Strength Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Password
                    </label>
                    {formData.password && (
                      <span className={`text-xs font-semibold ${getPasswordStrengthLabel().color}`}>
                        {getPasswordStrengthLabel().label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      name="password" 
                      id="password" 
                      required
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-11 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Visual Meter */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                    <div className={`h-1 rounded-full transition-all duration-300 ${passwordStrength >= 25 ? 'bg-rose-500' : 'bg-[var(--border)]'}`}></div>
                    <div className={`h-1 rounded-full transition-all duration-300 ${passwordStrength >= 50 ? 'bg-amber-500' : 'bg-[var(--border)]'}`}></div>
                    <div className={`h-1 rounded-full transition-all duration-300 ${passwordStrength >= 75 ? 'bg-indigo-400' : 'bg-[var(--border)]'}`}></div>
                    <div className={`h-1 rounded-full transition-all duration-300 ${passwordStrength >= 100 ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}></div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      name="confirmPassword" 
                      id="confirmPassword" 
                      required
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Continue CTA */}
                <button 
                  type="button" 
                  onClick={handleNextStep}
                  className="w-full mt-4 py-3.5 px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 transition-all duration-150 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* ================= STEP 2: ACADEMIC DETAILS ================= */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Course Dropdown */}
                <div>
                  <label htmlFor="course" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Enrolled Course
                  </label>
                  <select 
                    id="course"
                    name="course" 
                    value={formData.course} 
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                  >
                    <option value="" disabled>Select your course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id} className="bg-[var(--surface)] text-[var(--text)]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campus Dropdown */}
                <div>
                  <label htmlFor="universityCampus" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Campus
                  </label>
                  <select 
                    id="universityCampus"
                    name="universityCampus" 
                    value={formData.universityCampus} 
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                  >
                    <option value="">Select your campus</option>
                    {getOptions(campuses, defaultCampuses).map((c, i) => (
                      <option key={i} value={c} className="bg-[var(--surface)] text-[var(--text)]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch and Semester 2-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="branch" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                      Branch
                    </label>
                    <select 
                      id="branch"
                      name="branch" 
                      value={formData.branch} 
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    >
                      <option value="">Select branch</option>
                      {getOptions(branches, defaultBranches).map((b, i) => (
                        <option key={i} value={b} className="bg-[var(--surface)] text-[var(--text)]">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="semester" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                      Semester
                    </label>
                    <select 
                      id="semester"
                      name="semester" 
                      value={formData.semester} 
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s} className="bg-[var(--surface)] text-[var(--text)]">
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section Dropdown */}
                <div>
                  <label htmlFor="section" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Section
                  </label>
                  <select 
                    id="section"
                    name="section" 
                    value={formData.section} 
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                  >
                    <option value="">Select section</option>
                    {getOptions(sections, defaultSections).map((s, i) => (
                      <option key={i} value={s} className="bg-[var(--surface)] text-[var(--text)]">
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={handleBackStep}
                    className="flex-1 py-3.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]/40 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors focus:outline-none"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleNextStep}
                    className="flex-[2] py-3.5 px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 transition-all duration-150 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 3: CONTACT & PROFILE ================= */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                
                {/* Profile Photo Placeholder */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-20 h-20 rounded-full bg-[var(--surface-2)] border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] flex flex-col items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] transition-all cursor-pointer group">
                    <Camera size={22} className="group-hover:scale-105 transition-transform" />
                    <span className="text-[10px] font-semibold mt-1">Photo</span>
                  </div>
                  <span className="text-xs text-[var(--muted)] mt-1.5">Optional profile avatar</span>
                </div>

                {/* Contact Number */}
                <div>
                  <label htmlFor="contact" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Contact Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <Phone size={18} />
                    </div>
                    <input 
                      type="tel" 
                      name="contact" 
                      id="contact" 
                      value={formData.contact} 
                      onChange={handleChange} 
                      placeholder="e.g. +91 98765 43210"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Residential / Permanent Address */}
                <div>
                  <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <MapPin size={18} />
                    </div>
                    <input 
                      type="text" 
                      name="address" 
                      id="address" 
                      value={formData.address} 
                      onChange={handleChange} 
                      placeholder="e.g. Dehradun, Uttarakhand"
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Final Submission Navigation */}
                <div className="flex items-center gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={handleBackStep}
                    className="flex-1 py-3.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]/40 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors focus:outline-none"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-[2] py-3.5 px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/25 transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <Check size={18} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </form>

          {/* Bottom Prompt */}
          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--primary)] hover:underline">
              Sign In
            </Link>
          </div>

        </div>
      </main>

      {/* Simple Accessible Footer */}
      <footer className="w-full text-center py-4 text-xs text-[var(--muted)] relative z-10">
        &copy; {new Date().getFullYear()} QuizSphere. All rights reserved.
      </footer>

    </div>
  );
};

export default Register;
