import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { secureApi } from '../services/secureApi';
import './VerificationBanner.css';

interface VerificationBannerProps {
  onClose?: () => void;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setIsVisible(false);
        return;
      }

      setUser(currentUser);

      // Check verification status
      const result = await secureApi.getVerificationStatus();
      
      if (result.success && result.data) {
        setIsVisible(!result.data.is_verified);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setMessage('');

    try {
      const result = await secureApi.resendVerificationEmail();
      
      if (result.success) {
        setMessage('Verification email sent! Check your inbox.');
      } else {
        setMessage(result.error || 'Failed to send verification email');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="verification-banner">
      <div className="verification-banner-content">
        <div className="verification-info">
          <span className="verification-icon">📧</span>
          <span className="verification-text">
            Verify your email to participate in contests and solve problems
          </span>
        </div>
        
        <div className="verification-actions">
          <button
            onClick={handleResendVerification}
            disabled={isLoading}
            className="verification-btn send-btn"
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send Verification Email</span>
                <span>📤</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleClose}
            className="verification-btn close-btn"
            title="Dismiss (you can still access this from your profile)"
          >
            ✕
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`verification-message ${message.includes('sent') ? 'success' : 'error'}`}>
          <span className="message-icon">
            {message.includes('sent') ? '✅' : '⚠️'}
          </span>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};

export default VerificationBanner;