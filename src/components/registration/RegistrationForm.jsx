// components/registration/RegistrationForm.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../../context/AlertContext';
import { useUser } from '../../context/UserContext';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { FormInput } from './FormInput';
import {
    FaUser,
    FaEnvelope,
    FaLock,
    FaPhone,
    FaVenusMars,
    FaBirthdayCake,
    FaUserTie,
} from 'react-icons/fa';
import { FiEye, FiEyeOff } from 'react-icons/fi';

import { FaLocationDot } from 'react-icons/fa6';

import { useLocation } from 'react-router-dom';

import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../Firebase/firebase'; // adjust path if needed



export const RegistrationForm = () => {
    const { registerUser } = useUser();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [referralDetails, setReferralDetails] = useState(null);
    const [uplineDetails, setUplineDetails] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobile: '',
        gender: '',
        age: '',
        pincode: '',
        address: '',
        referralCode: '',
        upline: '',
        position: '',
        rightDownLine: '',
        leftDownLine: '',
        level: '',
    });

    const [profilePic, setProfilePic] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const location = useLocation();


    // Handle input changes
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

        // Check upline when upline field changes
        if (name === 'upline' && value.trim()) {
            checkUpline(value.trim());
        } else if (name === 'upline' && !value.trim()) {
            setUplineDetails(null);
        }
    };

    // Check upline in database
    const checkUpline = async (uplineCode) => {
        try {
            const db = getFirestore(app);
            const q = query(
                collection(db, 'users'),
                where('referralCode', '==', uplineCode)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const uplineUser = querySnapshot.docs[0].data();
                
                // Check which positions are available (left or right downline is empty)
                const availablePositions = [];
                if (!uplineUser.leftDownLine || uplineUser.leftDownLine === '') {
                    availablePositions.push('left');
                }
                if (!uplineUser.rightDownLine || uplineUser.rightDownLine === '') {
                    availablePositions.push('right');
                }
                
                setUplineDetails({
                    userId: uplineUser.userId,
                    name: uplineUser.name,
                    referralCode: uplineUser.referralCode,
                    availablePositions: availablePositions
                });
            } else {
                setUplineDetails(null);
            }
        } catch (error) {
            console.error('Error checking upline:', error);
            setUplineDetails(null);
        }
    };

    useEffect(() => {
        const fetchReferralUser = async () => {
            const params = new URLSearchParams(location.search);
            const refCode = params.get('ref');
            if (refCode) {
                setFormData(prev => ({
                    ...prev,
                    referralCode: refCode
                }));

                try {
                    const db = getFirestore(app);
                    const q = query(
                        collection(db, 'users'),
                        where('referralCode', '==', refCode)
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const refUser = querySnapshot.docs[0].data();
                        setReferralDetails({
                            userId: refUser.userId,
                            name: refUser.name
                        });
                    }
                } catch (error) {
                    console.error('Error fetching referral user:', error);
                }
            }
        };

        fetchReferralUser();
    }, [location.search]);


    // Handle profile picture upload
      const handleFileChange = (file) => {
        setProfilePic(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemove = () => {
        setProfilePic(null);
        setPreviewImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the file input
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const refCode = params.get('ref');
        if (refCode) {
            setFormData(prev => ({
                ...prev,
                referralCode: refCode
            }));
        }
    }, [location.search]);


    // Trigger file input
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!formData.mobile.trim()) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!/^[0-9]{10}$/.test(formData.mobile)) {
            newErrors.mobile = 'Invalid mobile number';
        }
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.age) {
            newErrors.age = 'Age is required';
        } else if (parseInt(formData.age) < 18) {
            newErrors.age = 'You must be at least 18 years old';
        }
        if (!formData.address.trim()) newErrors.address = 'Address is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showAlert('error', 'Please fix the errors in the form');
            return;
        }

        setIsLoading(true);

        try {
            await registerUser({
                ...formData,
                profilePic,
            });

            showAlert('success', 'Registration successful! Welcome to Vedamurti');
            navigate('/account');
        } catch (error) {
            showAlert('error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                    }
                }}
                accept="image/*"
                className="hidden"
            />

            <ProfilePictureUpload
                previewImage={previewImage}
                triggerFileInput={triggerFileInput}
                onFileChange={handleFileChange}
                onRemove={handleRemove}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                    label="Full Name"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    error={errors.name}
                    icon={FaUser}
                />

                <FormInput
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    error={errors.email}
                    icon={FaEnvelope}
                />

                <FormInput
                    label="Password"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    error={errors.password}
                    icon={FaLock}
                    showPasswordToggle={
                        showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />
                    }
                    onTogglePassword={() => setShowPassword(!showPassword)}
                />

                <FormInput
                    label="Confirm Password"
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    error={errors.confirmPassword}
                    icon={FaLock}
                    showPasswordToggle={
                        showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />
                    }
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <FormInput
                    label="Mobile Number"
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="9876543210"
                    maxLength={10}
                    error={errors.mobile}
                    icon={FaPhone}
                />

                <FormInput
                    label="Gender"
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    as="select"
                    error={errors.gender}
                    icon={FaVenusMars}
                >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                </FormInput>

                <FormInput
                    label="Age"
                    id="age"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleChange}
                    min="18"
                    max="100"
                    placeholder="25"
                    error={errors.age}
                    icon={FaBirthdayCake}
                />

                <FormInput
                    label="Pincode"
                    id="pincode"
                    name="pincode"
                    type="number"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="000000"
                    error={errors.pincode}
                    icon={FaLocationDot}
                />

                <FormInput
                    label="Referral Code (optional)"
                    id="referralCode"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    placeholder="Enter if someone referred you"
                    disabled={!!new URLSearchParams(location.search).get('ref')}
                />

                <FormInput
                    label="Upline ID (optional)"
                    id="upline"
                    name="upline"
                    value={formData.upline}
                    onChange={handleChange}
                    placeholder="Enter your upline referral code"
                    icon={FaUserTie}
                />

                {uplineDetails && (
                    <FormInput
                        label="Upline Found"
                        id="uplineInfo"
                        name="uplineInfo"
                        value={`${uplineDetails.name}, ID: ${uplineDetails.userId}`}
                        disabled
                    />
                )}

                {uplineDetails && uplineDetails.availablePositions.length > 0 && (
                    <FormInput
                        label="Available Positions"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        as="select"
                        icon={FaUserTie}
                    >
                        <option value="">Select Position</option>
                        {uplineDetails.availablePositions.includes('left') && (
                            <option value="left">Left</option>
                        )}
                        {uplineDetails.availablePositions.includes('right') && (
                            <option value="right">Right</option>
                        )}
                    </FormInput>
                )}

                {uplineDetails && uplineDetails.availablePositions.length === 0 && (
                    <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                            ⚠️ No positions available under this upline. Both left and right positions are already filled.
                        </p>
                    </div>
                )}

                {referralDetails && (
                  
                        <FormInput
                            label="Referral By"
                            id="referralInfo"
                            name="referralInfo"
                            value={`${referralDetails.name}, ID: ${referralDetails.userId}`}
                            disabled
                        />
                   
                )}



            </div>

            <div className="md:col-span-2">
                <FormInput
                    label="Address"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    as="textarea"
                    rows={3}
                    placeholder="Your complete address"
                    error={errors.address}
                    icon={FaLocationDot}
                    iconPosition="top"
                />
            </div>

            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="terms"
                        name="terms"
                        type="checkbox"
                        required
                        className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-medium text-gray-700">
                        I agree to the <a href="/terms" className="text-green-600 hover:text-green-500">Terms of Service</a> and{' '}
                        <a href="/privacy" className="text-green-600 hover:text-green-500">Privacy Policy</a>
                    </label>
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Account...
                        </>
                    ) : (
                        'Create Account'
                    )}
                </button>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-600">
                <p>
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-medium text-green-600 hover:text-green-500"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </form>
    );
};