import React, { useState, useEffect } from 'react';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaLock,
  FaGlobe,
  FaBirthdayCake,
  FaVenusMars,
  FaEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram
} from 'react-icons/fa';

const AffilateProfile = () => {
  // Mock user data
  const initialUserData = {
    id: 12345,
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main St, New York, NY 10001",
    level: "Diamond",
    joinDate: "2022-03-15",
    birthday: "1985-07-22",
    gender: "Male",
    bio: "Experienced Affilate professional with 5+ years in the industry. Passionate about helping my team succeed.",
    socialMedia: {
      linkedin: "linkedin.com/in/alexjohnson",
      facebook: "facebook.com/alexjohnson",
      twitter: "twitter.com/alexjohnson",
      instagram: "instagram.com/alexjohnson"
    },
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    privacy: {
      showEmail: true,
      showPhone: false,
      showBirthday: true
    }
  };

  const [userData, setUserData] = useState(initialUserData);
  const [editMode, setEditMode] = useState(false);
  const [tempData, setTempData] = useState(initialUserData);
  const [activeTab, setActiveTab] = useState('personal');
  const [profileImage, setProfileImage] = useState("https://randomuser.me/api/portraits/men/32.jpg");
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle nested objects for checkboxes
      const [parent, child] = name.split('.');
      setTempData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: checked
        }
      }));
    } else {
      setTempData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSocialMediaChange = (e) => {
    const { name, value } = e.target;
    setTempData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [name]: value
      }
    }));
  };

  const handleSave = () => {
    setUserData(tempData);
    setEditMode(false);
    // Here you would typically send the updated data to your backend
  };

  const handleCancel = () => {
    setTempData(userData);
    setEditMode(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
    setShowImageUpload(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm ${
              userData.level === 'Diamond' ? 'bg-purple-100 text-purple-800' :
              userData.level === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {userData.level} Member
            </span>
            <span className="text-sm text-gray-500">
              Joined {new Date(userData.joinDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="relative">
            {/* Cover Photo */}
            <div className="h-48 bg-gradient-to-r from-green-500 to-green-600"></div>
            
            {/* Profile Photo */}
            <div className="absolute -bottom-16 left-6">
              <div className="relative">
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
                {editMode && (
                  <button 
                    onClick={() => setShowImageUpload(!showImageUpload)}
                    className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full shadow hover:bg-green-700"
                  >
                    <FaCamera />
                  </button>
                )}
              </div>
            </div>
            
            {/* Edit Button */}
            <div className="absolute top-4 right-4">
              {editMode ? (
                <div className="flex space-x-2">
                  <button 
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <FaSave className="mr-2" /> Save
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center"
                  >
                    <FaTimes className="mr-2" /> Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <FaEdit className="mr-2" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Image Upload Modal */}
          {showImageUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-medium mb-4">Upload Profile Picture</h3>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-green-50 file:text-green-700
                    hover:file:bg-green-100"
                />
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => setShowImageUpload(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div className="pt-20 pb-6 px-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editMode ? (
                    <input
                      type="text"
                      name="name"
                      value={tempData.name}
                      onChange={handleInputChange}
                      className="border-b border-gray-300 focus:border-green-500 focus:outline-none"
                    />
                  ) : (
                    userData.name
                  )}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editMode ? (
                    <textarea
                      name="bio"
                      value={tempData.bio}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded p-2 focus:border-green-500 focus:outline-none"
                      rows="3"
                    />
                  ) : (
                    userData.bio
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('personal')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'personal' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Personal Information
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'account' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Account Settings
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'social' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Social Media
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          {activeTab === 'personal' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {editMode ? (
                      <input
                        type="email"
                        name="email"
                        value={tempData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <FaEnvelope className="mr-2" /> {userData.email}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    {editMode ? (
                      <input
                        type="tel"
                        name="phone"
                        value={tempData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <FaPhone className="mr-2" /> {userData.phone}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    {editMode ? (
                      <input
                        type="text"
                        name="address"
                        value={tempData.address}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <FaMapMarkerAlt className="mr-2" /> {userData.address}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                    {editMode ? (
                      <input
                        type="date"
                        name="birthday"
                        value={tempData.birthday}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <FaBirthdayCake className="mr-2" /> 
                        {new Date(userData.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    {editMode ? (
                      <select
                        name="gender"
                        value={tempData.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <FaVenusMars className="mr-2" /> {userData.gender}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
                    <div className="flex items-center text-gray-600">
                      <FaUser className="mr-2" /> {userData.id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Account Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Notification Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="notifications.email"
                        checked={editMode ? tempData.notifications.email : userData.notifications.email}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Email Notifications
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="notifications.sms"
                        checked={editMode ? tempData.notifications.sms : userData.notifications.sms}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        SMS Notifications
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="notifications.push"
                        checked={editMode ? tempData.notifications.push : userData.notifications.push}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Push Notifications
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Privacy Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="privacy.showEmail"
                        checked={editMode ? tempData.privacy.showEmail : userData.privacy.showEmail}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Show Email to Team Members
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="privacy.showPhone"
                        checked={editMode ? tempData.privacy.showPhone : userData.privacy.showPhone}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Show Phone to Team Members
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="privacy.showBirthday"
                        checked={editMode ? tempData.privacy.showBirthday : userData.privacy.showBirthday}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Show Birthday to Team Members
                      </label>
                    </div>
                  </div>
                </div>
                
                {editMode && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Social Media Links</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaLinkedin className="mr-2 text-blue-700" /> LinkedIn
                  </label>
                  {editMode ? (
                    <input
                      type="url"
                      name="linkedin"
                      value={tempData.socialMedia.linkedin}
                      onChange={handleSocialMediaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="https://linkedin.com/in/username"
                    />
                  ) : (
                    <div className="text-gray-600">
                      {userData.socialMedia.linkedin || 'Not provided'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaFacebook className="mr-2 text-blue-600" /> Facebook
                  </label>
                  {editMode ? (
                    <input
                      type="url"
                      name="facebook"
                      value={tempData.socialMedia.facebook}
                      onChange={handleSocialMediaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="https://facebook.com/username"
                    />
                  ) : (
                    <div className="text-gray-600">
                      {userData.socialMedia.facebook || 'Not provided'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaTwitter className="mr-2 text-blue-400" /> Twitter
                  </label>
                  {editMode ? (
                    <input
                      type="url"
                      name="twitter"
                      value={tempData.socialMedia.twitter}
                      onChange={handleSocialMediaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="https://twitter.com/username"
                    />
                  ) : (
                    <div className="text-gray-600">
                      {userData.socialMedia.twitter || 'Not provided'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FaInstagram className="mr-2 text-pink-600" /> Instagram
                  </label>
                  {editMode ? (
                    <input
                      type="url"
                      name="instagram"
                      value={tempData.socialMedia.instagram}
                      onChange={handleSocialMediaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="https://instagram.com/username"
                    />
                  ) : (
                    <div className="text-gray-600">
                      {userData.socialMedia.instagram || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AffilateProfile;