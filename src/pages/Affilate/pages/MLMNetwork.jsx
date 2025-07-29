import { useState, useEffect } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { FaEdit, FaSave, FaTimes, FaUserPlus, FaUserSlash, FaSearch } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';
import LeafLoader from '../../../components/Loader'

const AffilateNetwork = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editForm, setEditForm] = useState({
        rightDownLine: '',
        leftDownLine: '',
        upline: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
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

                // Get users who were referred by the current user's code
                if (currentUser.referralCode) {
                    const q = query(
                        collection(db, 'users'),
                        where('referredBy', '==', currentUser.referralCode)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    const usersData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    setUsers(usersData);
                    setFilteredUsers(usersData);
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

    const handleEditClick = (user) => {
        setEditingUserId(user.id);
        setEditForm({
            rightDownLine: user.rightDownLine || '',
            leftDownLine: user.leftDownLine || '',
            upline: user.upline || ''
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                rightDownLine: editForm.rightDownLine || null,
                leftDownLine: editForm.leftDownLine || null,
                upline: editForm.upline || null
            });
            
            // Update local state
            const updatedUsers = users.map(user => 
                user.id === userId ? { 
                    ...user, 
                    rightDownLine: editForm.rightDownLine,
                    leftDownLine: editForm.leftDownLine,
                    upline: editForm.upline
                } : user
            );
            
            setUsers(updatedUsers);
            setFilteredUsers(updatedUsers);
            setEditingUserId(null);
        } catch (error) {
            console.error("Error updating user: ", error);
            setError("Failed to update user data");
        }
    };

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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Network</h1>
            
            {/* Current User Downlines */}
            {currentUserData && (
                <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Downlines</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-medium text-gray-600 mb-2">Right Downline</h3>
                            <div className="flex items-center">
                                {currentUserData.rightDownLine ? (
                                    <span className="text-green-600">{currentUserData.rightDownLine}</span>
                                ) : (
                                    <span className="text-gray-400 flex items-center">
                                        <FaUserSlash className="mr-1" /> Not set
                                    </span>
                                )}
                                {!currentUserData.rightDownLine && (
                                    <button
                                        onClick={() => updatePersonalDownline('rightDownLine')}
                                        className="ml-auto text-blue-500 hover:text-blue-700 flex items-center"
                                        title="Set right downline"
                                    >
                                        <FaUserPlus className="mr-1" /> Set
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-medium text-gray-600 mb-2">Left Downline</h3>
                            <div className="flex items-center">
                                {currentUserData.leftDownLine ? (
                                    <span className="text-green-600">{currentUserData.leftDownLine}</span>
                                ) : (
                                    <span className="text-gray-400 flex items-center">
                                        <FaUserSlash className="mr-1" /> Not set
                                    </span>
                                )}
                                {!currentUserData.leftDownLine && (
                                    <button
                                        onClick={() => updatePersonalDownline('leftDownLine')}
                                        className="ml-auto text-blue-500 hover:text-blue-700 flex items-center"
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
            
            {/* Search Bar */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search by ID, name or email..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {filteredUsers.length === 0 ? (
                <div className="bg-blue-100 flex justify-center items-center border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
                    {users.length === 0 ? 
                        <LeafLoader/> : 
                        "No users match your search criteria."}
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Right Downline</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Left Downline</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upline</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.referralCode || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.email || 'N/A'}
                                    </td>
                                    
                                    {/* Right Downline */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {editingUserId === user.id ? (
                                            <input
                                                type="text"
                                                name="rightDownLine"
                                                value={editForm.rightDownLine}
                                                onChange={handleEditChange}
                                                className="border rounded px-2 py-1 w-full"
                                                placeholder="Enter user ID"
                                            />
                                        ) : user.rightDownLine ? (
                                            <span className="text-green-600">{user.rightDownLine}</span>
                                        ) : (
                                            <span className="text-gray-400 flex items-center">
                                                <FaUserSlash className="mr-1" /> None
                                            </span>
                                        )}
                                    </td>
                                    
                                    {/* Left Downline */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {editingUserId === user.id ? (
                                            <input
                                                type="text"
                                                name="leftDownLine"
                                                value={editForm.leftDownLine}
                                                onChange={handleEditChange}
                                                className="border rounded px-2 py-1 w-full"
                                                placeholder="Enter user ID"
                                            />
                                        ) : user.leftDownLine ? (
                                            <span className="text-green-600">{user.leftDownLine}</span>
                                        ) : (
                                            <span className="text-gray-400 flex items-center">
                                                <FaUserSlash className="mr-1" /> None
                                            </span>
                                        )}
                                    </td>
                                    
                                    {/* Upline */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.upline ? (
                                            <span className="text-green-600">{user.upline}</span>
                                        ) : (
                                            <span className="text-gray-400 flex items-center">
                                                <FaUserSlash className="mr-1" /> None
                                            </span>
                                        )}
                                    </td>
                                    
                                    {/* Actions */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {editingUserId === user.id ? (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleSave(user.id)}
                                                    className="text-green-500 hover:text-green-700"
                                                    title="Save"
                                                >
                                                    <FaSave />
                                                </button>
                                                <button
                                                    onClick={() => setEditingUserId(null)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Cancel"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ) : (
                                            (!user.rightDownLine || !user.leftDownLine) && (
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    title="Edit downlines"
                                                >
                                                    <FaEdit />
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AffilateNetwork;