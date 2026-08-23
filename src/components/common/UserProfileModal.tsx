import React from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import type { UserProfileData } from '../../context/UserProfileModalContext';

interface UserProfileModalProps {
  show: boolean;
  onHide: () => void;
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
}

const getSocialIcon = (platform: string) => {
  switch (platform) {
    case 'facebook': return 'public'; // generic material icon if brand not available, or use brand svgs
    case 'instagram': return 'photo_camera';
    case 'linkedin': return 'work';
    case 'twitter': return 'tag';
    case 'tiktok': return 'music_note';
    case 'youtube': return 'play_circle';
    case 'website': return 'language';
    default: return 'link';
  }
};

const getSocialBrandColor = (platform: string) => {
  switch (platform) {
    case 'facebook': return '#1877F2';
    case 'instagram': return '#E4405F';
    case 'linkedin': return '#0A66C2';
    case 'twitter': return '#1DA1F2';
    case 'tiktok': return '#000000';
    case 'youtube': return '#FF0000';
    default: return '#4F46E5';
  }
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  show,
  onHide,
  profile,
  loading,
  error
}) => {
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Ideally use a toast here, but for simplicity we rely on native copy feedback or small alert
  };

  const renderInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
      {/* Header Background */}
      <div style={{ height: '120px', background: 'linear-gradient(135deg, #00426E, #0070BA)' }} className="position-relative">
        <Button 
          variant="link" 
          className="position-absolute text-white p-2 text-decoration-none" 
          style={{ top: '10px', right: '10px' }} 
          onClick={onHide}
        >
          <span className="material-symbols-outlined fs-4">close</span>
        </Button>
      </div>

      <Modal.Body className="px-4 pb-5 pt-0 text-center position-relative">
        {loading && (
          <div className="py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted small">Loading profile...</p>
          </div>
        )}

        {error && (
          <div className="py-5">
            <span className="material-symbols-outlined text-danger fs-1 mb-2">error</span>
            <p className="text-danger fw-semibold">{error}</p>
            <Button variant="outline-secondary" size="sm" onClick={onHide}>Close</Button>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            {/* Avatar overlaying the header */}
            <div className="d-flex justify-content-center" style={{ marginTop: '-50px', marginBottom: '15px' }}>
              <div 
                className="rounded-circle border border-white border-4 shadow-sm bg-white d-flex align-items-center justify-content-center overflow-hidden" 
                style={{ width: '100px', height: '100px' }}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div 
                    className="w-100 h-100 d-flex align-items-center justify-content-center text-white fw-bold fs-3"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                  >
                    {renderInitials(profile.fullName)}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Intro */}
            <h4 className="fw-bold mb-1" style={{ color: '#18181B' }}>{profile.fullName}</h4>
            
            <div className="d-flex align-items-center justify-content-center gap-2 mb-4 flex-wrap">
              {profile.barangay && (
                <span className="badge rounded-pill bg-light text-primary border border-primary-subtle px-3 py-2 fw-semibold">
                  <span className="material-symbols-outlined fs-6 me-1 align-bottom" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
                  {profile.barangay}
                </span>
              )}
              {profile.designation ? (
                <span className="badge rounded-pill bg-light text-secondary border px-3 py-2 fw-semibold">
                  <span className="material-symbols-outlined fs-6 me-1 align-bottom">badge</span>
                  {profile.designation}
                </span>
              ) : (
                <span className="badge rounded-pill bg-light text-secondary border px-3 py-2 fw-semibold">
                  <span className="material-symbols-outlined fs-6 me-1 align-bottom">badge</span>
                  SK Official
                </span>
              )}
            </div>

            {/* Contact Details */}
            <div className="text-start bg-light rounded-4 p-4 mb-4">
              <h6 className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>Official Contact Info</h6>
              
              <div className="d-flex align-items-start mb-3">
                <div className="bg-white rounded-circle p-2 shadow-sm me-3 d-flex align-items-center text-primary">
                  <span className="material-symbols-outlined fs-5">mail</span>
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="small text-muted mb-1">Email Address</div>
                  <div className="fw-semibold text-truncate">{profile.email}</div>
                </div>
                <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => handleCopy(profile.email)} title="Copy Email">
                  <span className="material-symbols-outlined fs-5 text-secondary">content_copy</span>
                </Button>
              </div>

              {profile.contactNumber && (
                <div className="d-flex align-items-start mb-3">
                  <div className="bg-white rounded-circle p-2 shadow-sm me-3 d-flex align-items-center text-success">
                    <span className="material-symbols-outlined fs-5">call</span>
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="small text-muted mb-1">Contact Number</div>
                    <div className="fw-semibold">{profile.contactNumber}</div>
                  </div>
                  <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => handleCopy(profile.contactNumber!)} title="Copy Phone">
                    <span className="material-symbols-outlined fs-5 text-secondary">content_copy</span>
                  </Button>
                </div>
              )}

              {profile.address && (
                <div className="d-flex align-items-start">
                  <div className="bg-white rounded-circle p-2 shadow-sm me-3 d-flex align-items-center text-danger">
                    <span className="material-symbols-outlined fs-5">location_on</span>
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="small text-muted mb-1">Barangay Hall Address</div>
                    <div className="fw-semibold small" style={{ lineHeight: '1.4' }}>{profile.address}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="text-start">
                <h6 className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>Official Social Media</h6>
                <div className="d-flex flex-wrap gap-2">
                  {profile.socialLinks.map((social, idx) => (
                    <a 
                      key={idx}
                      href={social.url.startsWith('http') ? social.url : `https://${social.url}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-sm text-white d-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-sm"
                      style={{ background: getSocialBrandColor(social.platform), border: 'none', fontWeight: 600, fontSize: '13px' }}
                    >
                      <span className="material-symbols-outlined fs-6">{getSocialIcon(social.platform)}</span>
                      <span className="text-capitalize">{social.platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {(!profile.socialLinks || profile.socialLinks.length === 0) && !profile.contactNumber && !profile.address && (
               <div className="text-muted small py-2">This official has not added any additional contact details.</div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default UserProfileModal;
