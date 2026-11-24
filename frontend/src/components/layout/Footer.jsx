import React, { useContext, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Send, MessageSquare } from 'lucide-react';
import QuizSphereLogo from '../logo/QuizSphereLogo';

const Footer = ({ className = '' }) => {
  const { user } = useContext(AuthContext) || {};
  
  const [feedback, setFeedback] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    message: '' 
  });
  const [feedbackStatus, setFeedbackStatus] = useState('');

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/feedbacks', feedback);
      setFeedbackStatus('Feedback sent successfully.');
      setFeedback({ name: user?.name || '', email: user?.email || '', message: '' });
      setTimeout(() => setFeedbackStatus(''), 4000);
    } catch {
      setFeedbackStatus('Failed to send feedback.');
    }
  };

  return (
    <footer className={`bg-[var(--surface)] border-t border-[var(--border)] ${className}`}>
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-10">
            
            {/* Brand Block */}
            <div className="lg:col-span-4 space-y-4">
               <QuizSphereLogo size="md" layout="horizontal" />
               <p className="text-[var(--muted)] text-sm leading-relaxed max-w-sm">
                 A secure examination management platform built for scalable academic testing and evaluation.
               </p>
               
               {/* Social Links */}
               <div className="pt-2 flex items-center gap-3">
                 <a href="https://github.com/SauravPandey56" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--primary)]/50 transition-all" aria-label="GitHub">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                 </a>
                 <a href="https://www.linkedin.com/in/sauravpandey56" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[#0A66C2] hover:border-[#0A66C2]/50 transition-all" aria-label="LinkedIn">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                 </a>
               </div>
            </div>

            {/* Platform Links */}
            <div className="lg:col-span-2 lg:col-start-6">
               <h3 className="text-[var(--text)] font-semibold text-sm mb-4 font-heading">Platform</h3>
               <ul className="space-y-3 text-sm text-[var(--muted)]">
                  <li><span className="hover:text-[var(--primary)] transition-colors cursor-default">Exam Engine</span></li>
                  <li><span className="hover:text-[var(--primary)] transition-colors cursor-default">Leaderboard</span></li>
                  <li><span className="hover:text-[var(--primary)] transition-colors cursor-default">Documentation</span></li>
               </ul>
            </div>

            <div className="lg:col-span-2">
               <h3 className="text-[var(--text)] font-semibold text-sm mb-4 font-heading">Legal</h3>
               <ul className="space-y-3 text-sm text-[var(--muted)]">
                  <li><span className="hover:text-[var(--primary)] transition-colors cursor-default">Security</span></li>
                  <li><span className="hover:text-[var(--primary)] transition-colors cursor-default">Privacy Policy</span></li>
                  <li><span className="hover:text-[var(--primary)] transition-colors cursor-default">Terms of Service</span></li>
               </ul>
            </div>

            {/* Quick Feedback */}
            <div className="lg:col-span-4 pl-0 lg:pl-8 lg:border-l border-[var(--border)]">
               <h3 className="text-[var(--text)] font-semibold text-sm mb-4 flex items-center font-heading">
                 <MessageSquare size={14} className="mr-2 text-[var(--primary)]" /> Quick Feedback
               </h3>
               <form onSubmit={submitFeedback} className="space-y-3 relative">
                 <p className="text-xs text-[var(--muted)] mb-3">Share your experience or report an issue.</p>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--muted)]">
                     <Mail size={14} />
                   </div>
                   <input 
                     type="email" 
                     placeholder="Your email"
                     value={feedback.email} 
                     onChange={e => setFeedback({...feedback, email: e.target.value})}
                     className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--primary)] rounded-[var(--radius-btn)] text-sm outline-none text-[var(--text)] transition-colors placeholder:text-[var(--muted)]/60" 
                     required 
                     readOnly={!!user}
                   />
                 </div>
                 <div className="relative">
                   <textarea 
                     value={feedback.message} 
                     onChange={e => setFeedback({...feedback, message: e.target.value})} 
                     className="w-full pl-4 pr-12 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--primary)] rounded-[var(--radius-btn)] text-sm outline-none text-[var(--text)] transition-colors resize-none placeholder:text-[var(--muted)]/60" 
                     rows="3" 
                     placeholder="Your feedback..." 
                     required
                   ></textarea>
                   <button 
                     type="submit" 
                     className="absolute bottom-2.5 right-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white p-2 rounded-lg transition-colors"
                     aria-label="Send feedback"
                   >
                     <Send size={14} />
                   </button>
                 </div>
                 {feedbackStatus && (
                   <span className="text-xs font-medium text-[var(--primary)] animate-fade-in">
                     {feedbackStatus}
                   </span>
                 )}
               </form>
            </div>

         </div>

         <div className="border-t border-[var(--border)] pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-[var(--muted)]">
            <p>&copy; {new Date().getFullYear()} Saurav Pandey. QuizSphere.</p>
            <p className="mt-3 md:mt-0 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--correct)] mr-2"></span>
              All systems operational
            </p>
         </div>
      </div>
    </footer>
  );
};

export default Footer;
