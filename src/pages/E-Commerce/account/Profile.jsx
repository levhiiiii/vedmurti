import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaRegEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useUser } from '../../../context/UserContext';
import LeafLoader from '../../../components/Loader';

const Profile = () => {
  const { currentUser, updateUserProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    profilePic: '',
    address: '',
    pincode: '',
    age: '',
    gender: '',
    password: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Initialize form data with user data
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        mobile: currentUser.mobile || '',
        profilePic: currentUser.profilePic || '',
        address: currentUser.address || '',
        pincode: currentUser.pincode || '',
        age: currentUser.age || '',
        gender: currentUser.gender || '',
        password: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Invalid mobile number';
    }
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.pincode?.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Invalid pincode';
    }
    if (!formData.age?.trim()) {
      newErrors.age = 'Age is required';
    }
    if (!formData.gender?.trim()) {
      newErrors.gender = 'Gender is required';
    }

    // Only validate passwords if changing them
    if (formData.newPassword) {
      if (!formData.password) {
        newErrors.password = 'Current password is required';
      }
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await updateUserProfile({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        pincode: formData.pincode,
        age: formData.age,
        gender: formData.gender,
        ...(formData.profilePicFile && { profilePic: formData.profilePicFile }),
        ...(formData.newPassword && {
          currentPassword: formData.password,
          newPassword: formData.newPassword
        })
      });

      setIsEditing(false);
    } catch (error) {
      setErrors({
        ...errors,
        password: error.message || 'Failed to update profile'
      });
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    // Reset form to original user data
    setFormData({
      name: currentUser.name || '',
      email: currentUser.email || '',
      mobile: currentUser.mobile || '',
      profilePic: currentUser.profilePic || '',
      address: currentUser.address || '',
      pincode: currentUser.pincode || '',
      age: currentUser.age || '',
      gender: currentUser.gender || '',
      password: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  if (!currentUser) {
    return <div className='w-full h-[80vh] flex justify-center items-center'><LeafLoader /></div>;
  }

  return (
    <div className="mx-auto p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Profile Information</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-green-600 hover:text-green-700 flex items-center"
          >
            <FaRegEdit className="mr-2" /> Edit Profile
          </button>
        ) : (
          <button
            onClick={cancelEdit}
            className="text-red-600 hover:text-red-700 flex items-center"
          >
            <FaTimes className="mr-2" /> Cancel
          </button>
        )}
      </div>

      {/* Profile Picture Field */}
          <div className="p-8 w-full flex justify-center items-center">
            {/* <label className="block text-gray-700 mb-3 font-medium">Profile Picture</label> */}
            <div className="flex items-center space-x-6">
              {/* Profile Image Preview */}
              <div className="relative group">
                <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-green-200 shadow-md">
                  {currentUser.profilePic ? (
                    <img
                      src={currentUser.profilePic}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-green-100 flex items-center justify-center">
                      <span className="text-4xl text-green-600 font-bold">
                        {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>

            

                {/* Edit Overlay */}
                {isEditing && (
                  <label className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData(prev => ({
                            ...prev,
                            profilePicFile: e.target.files[0],
                            profilePic: URL.createObjectURL(e.target.files[0])
                          }));
                        }
                      }}
                      className="hidden"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </label>
                )}
              </div>

              {/* Upload Controls */}
              {isEditing && (
                <div className="flex flex-col space-y-2">
                  <label className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-md cursor-pointer hover:bg-green-700 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Upload New
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData(prev => ({
                            ...prev,
                            profilePicFile: e.target.files[0],
                            profilePic: URL.createObjectURL(e.target.files[0])
                          }));
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {formData.profilePicFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          profilePicFile: null,
                          profilePic: currentUser.profilePic || ''
                        }));
                      }}
                      className="text-sm text-red-600 hover:text-red-800 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Remove
                    </button>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG or GIF (Max. 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>


      <div className="mb-6 grid md:grid-cols-2 gap-4">
        
        {/* Read-only fields */}
        <div>
          <label className="block text-gray-500 text-sm">User ID</label>
          <div className="bg-green-50 p-3 rounded-lg">{currentUser.userId}</div>
        </div>
        <div>
          <label className="block text-gray-500 text-sm">Referral Code</label>
          <div className="bg-green-50 p-3 rounded-lg">{currentUser.referralCode}</div>
        </div>
        <div>
          <label className="block text-gray-500 text-sm">Referred By</label>
          <div className="bg-green-50 p-3 rounded-lg">
            {currentUser.referredBy || 'No referral'}
          </div>
        </div>
        <div>
          <label className="block text-gray-500 text-sm">Affiliate Status</label>
          <div className="bg-green-50 p-3 rounded-lg">
            {currentUser.affiliateStatus ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-6">

        

          {/* Name Field */}
          <div>
            <label className="block text-gray-700 mb-1">Full Name</label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg">{currentUser.name}</div>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            {isEditing ? (
              <div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg">{currentUser.email}</div>
            )}
          </div>

          {/* Mobile Field */}
          <div>
            <label className="block text-gray-700 mb-1">Mobile Number</label>
            {isEditing ? (
              <div>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg">{currentUser.mobile || 'Not provided'}</div>
            )}
          </div>

          {/* Age Field */}
          <div>
            <label className="block text-gray-700 mb-1">Age</label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.age ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg">{currentUser.age || 'Not provided'}</div>
            )}
          </div>

          {/* Gender Field */}
          <div>
            <label className="block text-gray-700 mb-1">Gender</label>
            {isEditing ? (
              <div>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg">
                {currentUser.gender ? currentUser.gender.charAt(0).toUpperCase() + currentUser.gender.slice(1) : 'Not provided'}
              </div>
            )}
          </div>

          {/* Address Field */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 mb-1">Address</label>
            {isEditing ? (
              <div>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full p-3 border rounded-lg ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg whitespace-pre-line">
                {currentUser.address || 'Not provided'}
              </div>
            )}
          </div>

          {/* Pincode Field */}
          <div>
            <label className="block text-gray-700 mb-1">Pincode</label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.pincode ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded-lg">{currentUser.pincode || 'Not provided'}</div>
            )}
          </div>

          
          {/* Password Field - Always show in edit mode */}
          {isEditing && (
            <>
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Change Password</h3>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter current password to change"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Leave blank to keep current"
                />
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </>
          )}
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center"
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;