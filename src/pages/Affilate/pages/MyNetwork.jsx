import { useState, useEffect } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { FaUser, FaUserCircle, FaUserSlash, FaUsers } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';

const MyNetwork = () => {
    const [leftCount, setLeftCount] = useState(0);
    const [rightCount, setRightCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useUser();

    useEffect(() => {
        const countDownlines = async () => {
            try {
                if (!currentUser?.referralCode) {
                    setLoading(false);
                    return;
                }

                setLoading(true);
                setLeftCount(0);
                setRightCount(0);

                // 1. Get current user data
                const userQuery = query(
                    collection(db, 'users'),
                    where('referralCode', '==', currentUser.referralCode)
                );
                const userSnapshot = await getDocs(userQuery);
                
                if (userSnapshot.empty) {
                    setError("User data not found");
                    setLoading(false);
                    return;
                }

                const userData = userSnapshot.docs[0].data();

                // 2. Recursive function to count downlines
                const countRecursive = async (referralCode, side) => {
                    if (!referralCode) return 0;

                    // Get the user document
                    const q = query(
                        collection(db, 'users'),
                        where('referralCode', '==', referralCode)
                    );
                    const snapshot = await getDocs(q);
                    
                    if (snapshot.empty) return 0;

                    const user = snapshot.docs[0].data();
                    let count = 1; // Count this user

                    // Count left and right downlines recursively
                    if (user.leftDownLine) {
                        count += await countRecursive(user.leftDownLine, side);
                    }
                    if (user.rightDownLine) {
                        count += await countRecursive(user.rightDownLine, side);
                    }

                    return count;
                };

                // 3. Count left and right downlines
                if (userData.leftDownLine) {
                    const leftTotal = await countRecursive(userData.leftDownLine, 'left');
                    setLeftCount(leftTotal);
                }

                if (userData.rightDownLine) {
                    const rightTotal = await countRecursive(userData.rightDownLine, 'right');
                    setRightCount(rightTotal);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error counting downlines: ", error);
                setError("Failed to load network data");
                setLoading(false);
            }
        };

        countDownlines();
    }, [currentUser]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="mb-4">
                    <PulseLoader color="#3B82F6" size={15} />
                </div>
                <p className="text-gray-600">Counting your network members...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">My Network Summary</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-blue-800">Total Network</h3>
                        <div className="bg-blue-100 p-2 rounded-full">
                            <FaUsers className="text-blue-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                        {leftCount + rightCount}
                    </p>
                    <p className="text-sm text-blue-500 mt-1">All members in your organization</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-green-800">Left Team</h3>
                        <div className="bg-green-100 p-2 rounded-full">
                            <FaUsers className="text-green-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                        {leftCount}
                    </p>
                    <p className="text-sm text-green-500 mt-1">Members in your left leg</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-purple-800">Right Team</h3>
                        <div className="bg-purple-100 p-2 rounded-full">
                            <FaUsers className="text-purple-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                        {rightCount}
                    </p>
                    <p className="text-sm text-purple-500 mt-1">Members in your right leg</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Network Structure</h2>
                
                <div className="flex flex-col items-center">
                    {/* Root Node (You) */}
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 flex items-center justify-center">
                            <FaUserCircle className="text-blue-500 text-2xl" />
                        </div>
                        <span className="text-sm font-medium mt-2">You</span>
                    </div>
                    
                    {/* Downline Connectors */}
                    <div className="flex justify-center space-x-16 mt-6">
                        {/* Left Downline */}
                        <div className="flex flex-col items-center">
                            <div className="h-8 w-0.5 bg-green-300"></div>
                            <div className="text-xs text-green-600 mt-1">
                                {leftCount} {leftCount === 1 ? 'member' : 'members'}
                            </div>
                        </div>
                        
                        {/* Right Downline */}
                        <div className="flex flex-col items-center">
                            <div className="h-8 w-0.5 bg-purple-300"></div>
                            <div className="text-xs text-purple-600 mt-1">
                                {rightCount} {rightCount === 1 ? 'member' : 'members'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyNetwork;