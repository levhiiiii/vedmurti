import { useState, useEffect } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { FaUserPlus, FaUserSlash, FaSearch, FaNetworkWired, FaUsers, FaUserCircle, FaChartLine, FaExclamationTriangle, FaCheckCircle, FaUser } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';
import LeafLoader from '../../../components/Loader'
import { MLMService } from '../../../services/mlmService';

const AffilateNetwork = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [networkStats, setNetworkStats] = useState({
        totalMembers: 0,
        activeLeftDownlines: 0,
        activeRightDownlines: 0,
        missingDownlines: 0,
        completePairs: 0
    });
    const { currentUser } = useUser();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                if (!currentUser?.referralCode) {
                    setLoading(false);
                    return;
                }

                // Get current user's data first
                const currentUserQuery = query(
                    collection(db, 'users'),
                    where('referralCode', '==', currentUser.referralCode)
                );
                const currentUserSnapshot = await getDocs(currentUserQuery);
                if (!currentUserSnapshot.empty) {
                    const userData = currentUserSnapshot.docs[0].data();
                    setCurrentUserData({
                        id: currentUserSnapshot.docs[0].id,
                        ...userData
                    });
                }

                // Get complete network members recursively
                if (currentUser.referralCode) {
                    const getAllNetworkMembers = async (rootReferralCode) => {
                        const allMembers = [];
                        const processedCodes = new Set();
                        
                        // Function to recursively get all downlines
                        const getDownlines = async (referralCode, level = 0) => {
                            if (processedCodes.has(referralCode)) return;
                            processedCodes.add(referralCode);
                            
                            // Get user data
                            const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
                            const userSnapshot = await getDocs(userQuery);
                            
                            if (userSnapshot.empty) {
                                console.warn('User not found:', referralCode);
                                return;
                            }
                            
                            const userData = userSnapshot.docs[0].data();
                            
                            // Add current user to members
                            allMembers.push({
                                id: userSnapshot.docs[0].id,
                                name: userData.name || 'Unknown',
                                referralCode: userData.referralCode,
                                email: userData.email,
                                joinDate: userData.joinDate,
                                leftDownLine: userData.leftDownLine,
                                rightDownLine: userData.rightDownLine,
                                level: level,
                                isRoot: level === 0,
                                hasLeftDownline: !!userData.leftDownLine,
                                hasRightDownline: !!userData.rightDownLine,
                                leftDownlineExists: false, // Will be updated later
                                rightDownlineExists: false, // Will be updated later
                                isMissing: false,
                                affiliateStatus: userData.affiliateStatus || false,
                                paymentStatus: userData.paymentStatus || 'pending'
                            });
                            
                            // Recursively get left downline
                            if (userData.leftDownLine) {
                                await getDownlines(userData.leftDownLine, level + 1);
                            }
                            
                            // Recursively get right downline
                            if (userData.rightDownLine) {
                                await getDownlines(userData.rightDownLine, level + 1);
                            }
                        };
                        
                        // Start from root
                        await getDownlines(rootReferralCode);
                        
                        // Update existence flags
                        allMembers.forEach(member => {
                            const leftExists = allMembers.some(m => m.referralCode === member.leftDownLine);
                            const rightExists = allMembers.some(m => m.referralCode === member.rightDownLine);
                            
                            member.leftDownlineExists = leftExists;
                            member.rightDownlineExists = rightExists;
                        });
                        
                        return allMembers;
                    };
                    
                    const usersData = await getAllNetworkMembers(currentUser.referralCode);
                    console.log('Complete network members:', usersData);
                    
                    setUsers(usersData);
                    setFilteredUsers(usersData);
                    
                    // Calculate network statistics
                    const stats = {
                        totalMembers: usersData.length,
                        activeLeftDownlines: usersData.filter(u => u.leftDownlineExists).length,
                        activeRightDownlines: usersData.filter(u => u.rightDownlineExists).length,
                        missingDownlines: usersData.filter(u => 
                            (u.hasLeftDownline && !u.leftDownlineExists) ||
                            (u.hasRightDownline && !u.rightDownlineExists)
                        ).length,
                        completePairs: usersData.filter(u => u.leftDownlineExists && u.rightDownlineExists).length
                    };
                    setNetworkStats(stats);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching users: ", error);
                setError("Failed to load network data");
                setLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser]);

    useEffect(() => {
        if (searchTerm === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user => 
                (user.referralCode && user.referralCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const updatePersonalDownline = async (type) => {
        if (!currentUserData) return;
        
        try {
            const currentValue = currentUserData[type] || '';
            const newValue = prompt(`Enter ${type.replace(/([A-Z])/g, ' $1').toLowerCase()} ID:`, currentValue);
            
            if (newValue === null) return; // User cancelled
            
            const userRef = doc(db, 'users', currentUserData.id);
            await updateDoc(userRef, {
                [type]: newValue || null
            });
            
            // Update local state
            setCurrentUserData(prev => ({
                ...prev,
                [type]: newValue || null
            }));
        } catch (error) {
            console.error("Error updating downline: ", error);
            setError("Failed to update downline");
        }
    };



    const cleanupMissingDownlines = async () => {
        try {
            setLoading(true);
            
            // Use the MLMService cleanup function
            const result = await MLMService.cleanupMissingDownlinesBatch();
            
            alert(result.message);
            
            // Refresh the current user data
            if (currentUser?.referralCode) {
                const currentUserQuery = query(
                    collection(db, 'users'),
                    where('referralCode', '==', currentUser.referralCode)
                );
                const currentUserSnapshot = await getDocs(currentUserQuery);
                if (!currentUserSnapshot.empty) {
                    const userData = currentUserSnapshot.docs[0].data();
                    setCurrentUserData({
                        id: currentUserSnapshot.docs[0].id,
                        ...userData
                    });
                }
            }
            
            // Refresh the users list
            await fetchUsers();
            
        } catch (error) {
            console.error("Error cleaning up missing downlines: ", error);
            setError("Failed to cleanup missing downlines");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="mb-4">
                    <PulseLoader color="#3B82F6" size={15} />
                </div>
                <p className="text-gray-600">Loading your network...</p>
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Your Network</h1>
            </div>
            
            {/* Network Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                    <div className="flex items-center">
                        <FaUsers className="text-2xl mr-3" />
                        <div>
                            <div className="text-sm opacity-90">Total Members</div>
                            <div className="text-2xl font-bold">{networkStats.totalMembers}</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
                    <div className="flex items-center">
                        <FaUserCircle className="text-2xl mr-3" />
                        <div>
                            <div className="text-sm opacity-90">Left Downlines</div>
                            <div className="text-2xl font-bold">{networkStats.activeLeftDownlines}</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                    <div className="flex items-center">
                        <FaUserCircle className="text-2xl mr-3" />
                        <div>
                            <div className="text-sm opacity-90">Right Downlines</div>
                            <div className="text-2xl font-bold">{networkStats.activeRightDownlines}</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
                    <div className="flex items-center">
                        <FaExclamationTriangle className="text-2xl mr-3" />
                        <div>
                            <div className="text-sm opacity-90">Missing</div>
                            <div className="text-2xl font-bold">{networkStats.missingDownlines}</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 rounded-lg text-white">
                    <div className="flex items-center">
                        <FaCheckCircle className="text-2xl mr-3" />
                        <div>
                            <div className="text-sm opacity-90">Complete Pairs</div>
                            <div className="text-2xl font-bold">{networkStats.completePairs}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Current User Downlines */}
            {currentUserData && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <FaNetworkWired className="mr-2 text-blue-600" />
                            Your Network Position
                        </h2>
                        <div className="text-sm text-gray-500">
                            Referral Code: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{currentUserData.referralCode}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-gray-700 flex items-center">
                                    <FaUserCircle className="mr-2 text-green-600" />
                                    Right Downline
                                </h3>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Right Leg</span>
                            </div>
                            <div className="flex items-center justify-between">
                                {currentUserData.rightDownLine ? (
                                    <div>
                                        <span className="text-green-600 font-medium">{currentUserData.rightDownLine}</span>
                                        <div className="text-xs text-gray-500 mt-1">Active downline</div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-gray-400 flex items-center">
                                            <FaUserSlash className="mr-1" /> Not set
                                        </span>
                                        <div className="text-xs text-gray-500 mt-1">No right downline</div>
                                    </div>
                                )}
                                {!currentUserData.rightDownLine && (
                                    <button
                                        onClick={() => updatePersonalDownline('rightDownLine')}
                                        className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                                        title="Set right downline"
                                    >
                                        <FaUserPlus className="mr-1" /> Set
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-gray-700 flex items-center">
                                    <FaUserCircle className="mr-2 text-purple-600" />
                                    Left Downline
                                </h3>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Left Leg</span>
                            </div>
                            <div className="flex items-center justify-between">
                                {currentUserData.leftDownLine ? (
                                    <div>
                                        <span className="text-purple-600 font-medium">{currentUserData.leftDownLine}</span>
                                        <div className="text-xs text-gray-500 mt-1">Active downline</div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-gray-400 flex items-center">
                                            <FaUserSlash className="mr-1" /> Not set
                                        </span>
                                        <div className="text-xs text-gray-500 mt-1">No left downline</div>
                                    </div>
                                )}
                                {!currentUserData.leftDownLine && (
                                    <button
                                        onClick={() => updatePersonalDownline('leftDownLine')}
                                        className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                                        title="Set left downline"
                                    >
                                        <FaUserPlus className="mr-1" /> Set
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Color Legend */}
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Color Legend:</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 mr-2"></div>
                        <span>You (Current User)</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-300 mr-2"></div>
                        <span>Inactive Affiliate</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 mr-2"></div>
                        <span>Active Affiliate</span>
                    </div>
                </div>
            </div>

            {/* Search Bar and Actions */}
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by referral code, name or email..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={cleanupMissingDownlines}
                            disabled={loading}
                            className="flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 text-sm"
                            title="Remove missing downline references"
                        >
                            <FaUserSlash className="mr-2" />
                            Cleanup Missing
                        </button>
                        
                        <div className="text-sm text-gray-500 flex items-center">
                            <FaChartLine className="mr-1" />
                            {filteredUsers.length} of {users.length} members
                        </div>
                    </div>
                </div>
            </div>
            
            {filteredUsers.length === 0 ? (
                <div className="bg-blue-100 flex justify-center items-center border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
                    {users.length === 0 ? 
                        <LeafLoader/> : 
                        "No users match your search criteria."}
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Member
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Referral Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Level
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Left Downline
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Right Downline
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Downline Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                        Affiliate Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((user, index) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 ${
                                        user.referralCode === currentUser?.referralCode ? 'bg-blue-50' : ''
                                    }`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                                    user.referralCode === currentUser?.referralCode
                                                        ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300' 
                                                        : !user.affiliateStatus
                                                        ? 'bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-300'
                                                        : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
                                                }`}>
                                                    {user.referralCode === currentUser?.referralCode ? (
                                                        <FaUserCircle className="text-blue-500 text-sm" />
                                                    ) : !user.affiliateStatus ? (
                                                        <FaUser className="text-red-500 text-sm" />
                                                    ) : (
                                                        <FaUser className="text-gray-600 text-sm" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${
                                                        !user.affiliateStatus ? 'text-red-600' : 'text-gray-900'
                                                    }`}>
                                                        {user.name || 'Unknown'}
                                                        {!user.affiliateStatus && (
                                                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-sm ${
                                                        !user.affiliateStatus ? 'text-red-400' : 'text-gray-500'
                                                    }`}>
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                {user.referralCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.referralCode === currentUser?.referralCode
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {user.referralCode === currentUser?.referralCode ? 'You' : `Level ${user.level}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-mono ${
                                                    user.leftDownLine && user.leftDownlineExists
                                                        ? 'text-green-600 bg-green-100 px-2 py-1 rounded' 
                                                        : user.leftDownLine && !user.leftDownlineExists
                                                        ? 'text-orange-600 bg-orange-100 px-2 py-1 rounded'
                                                        : 'text-gray-400'
                                                }`}>
                                                    {user.leftDownLine || 'None'}
                                                </span>
                                                {user.leftDownLine && !user.leftDownlineExists && (
                                                    <span className="text-xs text-orange-500 mt-1">Missing</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-mono ${
                                                    user.rightDownLine && user.rightDownlineExists
                                                        ? 'text-blue-600 bg-blue-100 px-2 py-1 rounded' 
                                                        : user.rightDownLine && !user.rightDownlineExists
                                                        ? 'text-orange-600 bg-orange-100 px-2 py-1 rounded'
                                                        : 'text-gray-400'
                                                }`}>
                                                    {user.rightDownLine || 'None'}
                                                </span>
                                                {user.rightDownLine && !user.rightDownlineExists && (
                                                    <span className="text-xs text-orange-500 mt-1">Missing</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {user.leftDownLine && (
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        user.leftDownlineExists
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        Left: {user.leftDownlineExists ? 'Active' : 'Missing'}
                                                    </span>
                                                )}
                                                {user.rightDownLine && (
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        user.rightDownlineExists
                                                            ? 'bg-blue-100 text-blue-700' 
                                                            : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        Right: {user.rightDownlineExists ? 'Active' : 'Missing'}
                                                    </span>
                                                )}
                                                {!user.leftDownLine && !user.rightDownLine && (
                                                    <span className="text-xs text-gray-500">No downlines</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    user.affiliateStatus
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {user.affiliateStatus ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    user.paymentStatus === 'approved'
                                                        ? 'bg-green-100 text-green-700' 
                                                        : user.paymentStatus === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    Payment: {user.paymentStatus || 'pending'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Network Statistics */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center">
                                <FaUser className="text-green-500 text-xl mr-2" />
                                <div>
                                    <div className="text-sm font-medium text-green-800">Active Left Downlines</div>
                                    <div className="text-2xl font-bold text-green-600">
                                        {filteredUsers.filter(m => m.leftDownlineExists).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="flex items-center">
                                <FaUser className="text-purple-500 text-xl mr-2" />
                                <div>
                                    <div className="text-sm font-medium text-purple-800">Active Right Downlines</div>
                                    <div className="text-2xl font-bold text-purple-600">
                                        {filteredUsers.filter(m => m.rightDownlineExists).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="flex items-center">
                                <FaUser className="text-orange-500 text-xl mr-2" />
                                <div>
                                    <div className="text-sm font-medium text-orange-800">Missing Downlines</div>
                                    <div className="text-2xl font-bold text-orange-600">
                                        {filteredUsers.filter(m => 
                                            (m.hasLeftDownline && !m.leftDownlineExists) ||
                                            (m.hasRightDownline && !m.rightDownlineExists)
                                        ).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                            <div className="flex items-center">
                                <FaUser className="text-teal-500 text-xl mr-2" />
                                <div>
                                    <div className="text-sm font-medium text-teal-800">Complete Pairs</div>
                                    <div className="text-2xl font-bold text-teal-600">
                                        {filteredUsers.filter(m => m.leftDownlineExists && m.rightDownlineExists).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Network Analysis */}
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 className="text-sm font-medium text-yellow-800 mb-2">Network Analysis</h3>
                        <div className="text-xs text-yellow-700">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="font-semibold">Total Members: {filteredUsers.length}</div>
                                    <div>You: {filteredUsers.filter(m => m.referralCode === currentUser?.referralCode).length}</div>
                                    <div>Others: {filteredUsers.filter(m => m.referralCode !== currentUser?.referralCode).length}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">Left Downlines:</div>
                                    <div>Active: {filteredUsers.filter(m => m.leftDownlineExists).length}</div>
                                    <div>Missing: {filteredUsers.filter(m => m.hasLeftDownline && !m.leftDownlineExists).length}</div>
                                    <div>None: {filteredUsers.filter(m => !m.hasLeftDownline).length}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">Right Downlines:</div>
                                    <div>Active: {filteredUsers.filter(m => m.rightDownlineExists).length}</div>
                                    <div>Missing: {filteredUsers.filter(m => m.hasRightDownline && !m.rightDownlineExists).length}</div>
                                    <div>None: {filteredUsers.filter(m => !m.hasRightDownline).length}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">Complete Pairs:</div>
                                    <div>Both Active: {filteredUsers.filter(m => m.leftDownlineExists && m.rightDownlineExists).length}</div>
                                    <div>One Missing: {filteredUsers.filter(m => (m.hasLeftDownline && m.hasRightDownline) && 
                                        (!m.leftDownlineExists || !m.rightDownlineExists)).length}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AffilateNetwork;