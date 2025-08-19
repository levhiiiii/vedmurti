// components/registration/ProfilePictureUpload.jsx
import { FaUser, FaCamera, FaTimes } from 'react-icons/fa';
import { useAlert } from '../../context/AlertContext';
import { useRef } from 'react';

export const ProfilePictureUpload = ({ 
  previewImage, 
  triggerFileInput,
  onFileChange, 
  onRemove,
  disabled = false
}) => {
  const { showAlert } = useAlert();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.match('image.*')) {
        showAlert('error', 'Please select an image file (JPEG, PNG, etc.)');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showAlert('error', 'Image size should be less than 2MB');
        return;
      }

      onFileChange(file);
    }
  };

  const handleTriggerFileInput = () => {
    if (!disabled) {
      triggerFileInput();
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div className="flex flex-col items-center mb-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
      
      <div className="relative group">
        <div
          className={`w-24 h-24 rounded-full bg-green-100 flex items-center justify-center overflow-hidden cursor-pointer ${
            disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-green-200'
          }`}
          onClick={handleTriggerFileInput}
        >
          {previewImage ? (
            <>
              <img 
                src={previewImage} 
                alt="Profile preview" 
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <FaCamera className="text-white text-xl" />
                </div>
              )}
            </>
          ) : (
            <FaUser className="text-3xl text-green-700" />
          )}
        </div>
        
        {previewImage && !disabled && (
          <button
            type="button"
            onClick={handleRemoveClick}
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
            aria-label="Remove profile picture"
          >
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>
      
      <p className="mt-2 text-sm text-gray-500 text-center">
        {previewImage ? 'Click to change' : 'Upload profile picture'}
        <br />
        <span className="text-xs text-gray-400">Max 2MB (JPEG, PNG)</span>
      </p>
    </div>
  );
};