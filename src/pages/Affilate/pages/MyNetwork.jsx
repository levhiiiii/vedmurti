import { useState, useEffect } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { FaUser, FaUserCircle, FaUserSlash, FaUsers, FaGift, FaUserTie, FaBullhorn, FaLink } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';
import { Tooltip } from 'react-tooltip';

const MyNetwork = () => {
    const [leftCount, setLeftCount] = useState(0);
    const [rightCount, setRightCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useUser();
    const [income, setIncome] = useState({
        promotionalIncome: 0,
        rewardsIncome: 0,
        pairsCount: 0,
        qualifiedReferrals: 0,
        businessVolume: 0
    });

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

        // Real-time income updates
        let unsubscribe = null;
        if (currentUser?.uid) {
            const mlmUserRef = doc(db, 'mlmUsers', currentUser.uid);
            unsubscribe = onSnapshot(mlmUserRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setIncome({
                        promotionalIncome: data.promotionalIncome || 0,
                        rewardsIncome: data.rewardsIncome || 0,
                        pairsCount: data.pairsCount || 0,
                        qualifiedReferrals: data.qualifiedReferrals || 0,
                        businessVolume: (data.leftTeamTurnover || 0) + (data.rightTeamTurnover || 0)
                    });
                }
            });
        }
        return () => unsubscribe && unsubscribe();
    }, [currentUser]);

    // Family Tree rendering logic using leftDownLine/rightDownLine from 'users' collection
    const [treeData, setTreeData] = useState(null);
    useEffect(() => {
        const fetchTree = async () => {
            if (!currentUser?.referralCode) return;
            // Recursive function to build tree from 'users' collection
            const buildTree = async (referralCode, level = 0, maxLevel = 5) => {
                if (level >= maxLevel) return null;
                const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
                const userSnapshot = await getDocs(userQuery);
                if (userSnapshot.empty) return null;
                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                let leftNode = null, rightNode = null;
                if (userData.leftDownLine) leftNode = await buildTree(userData.leftDownLine, level + 1, maxLevel);
                if (userData.rightDownLine) rightNode = await buildTree(userData.rightDownLine, level + 1, maxLevel);
                return {
                    id: userDoc.id,
                    name: userData.name || 'Unknown',
                    referralCode: userData.referralCode,
                    email: userData.email,
                    joinDate: userData.joinDate,
                    leftNode,
                    rightNode,
                    level
                };
            };
            const tree = await buildTree(currentUser.referralCode);
            setTreeData(tree);
        };
        fetchTree();
    }, [currentUser]);

    // Count matched pairs (binary legs completed) for user and all downlines
    const [totalPairs, setTotalPairs] = useState(0);
    useEffect(() => {
        // Recursively count pairs in the family tree
        const countPairs = (node) => {
            if (!node) return 0;
            // A pair is matched if both left and right downlines exist
            const isPair = node.leftNode && node.rightNode ? 1 : 0;
            return isPair + countPairs(node.leftNode) + countPairs(node.rightNode);
        };
        setTotalPairs(countPairs(treeData));
    }, [treeData]);

    const renderTreeNode = (node) => {
        if (!node) {
            return (
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center shadow-sm">
                        <FaUserSlash className="text-gray-400 text-xl" />
                    </div>
                    <span className="text-xs text-gray-500 mt-1">Empty</span>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center group" data-tooltip-id={`ftree-${node.id}`}> 
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md ${node.level === 0 ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300' : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'} cursor-pointer`}>
                    {node.level === 0 ? <FaUserCircle className="text-blue-500 text-2xl" /> : <FaUser className="text-gray-600 text-xl" />}
                </div>
                <span className="text-xs font-medium mt-1 text-center max-w-[80px] truncate">{node.name}</span>
                <Tooltip id={`ftree-${node.id}`} className="z-50">
                    <div className="bg-white p-2 rounded-lg shadow-lg max-w-xs">
                        <div className="font-bold text-blue-600">{node.name}</div>
                        <div className="text-xs text-gray-500">{node.email}</div>
                        <div className="text-xs text-gray-500">ID: {node.referralCode}</div>
                        {node.joinDate && <div className="text-xs text-gray-400 mt-1">Joined: {new Date(node.joinDate.seconds * 1000).toLocaleDateString()}</div>}
                    </div>
                </Tooltip>
            </div>
        );
    };

    // Enhanced Family Tree rendering to match Tree tab visuals
    const renderFamilyTree = (node) => {
        if (!node) return (
            <div className="text-center text-gray-400 py-8">No downlines found for your account.</div>
        );
        return (
            <div className="flex flex-col items-center">
                {/* Node */}
                <div className="relative">{renderTreeNode(node)}
                    {(node.leftNode || node.rightNode) && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-gray-300 to-transparent"></div>
                    )}
                </div>
                {/* Downlines */}
                {(node.leftNode || node.rightNode) && (
                    <div className="flex justify-center space-x-16 mt-6">
                        {/* Left Downline */}
                        <div className="flex flex-col items-center relative">
                            {node.leftNode && (
                                <>
                                    <div className="absolute top-0 left-1/2 w-8 h-6 border-l-2 border-t-2 border-gray-300 rounded-tl-lg"></div>
                                    <div className="mt-6">{renderFamilyTree(node.leftNode)}</div>
                                </>
                            )}
                        </div>
                        {/* Right Downline */}
                        <div className="flex flex-col items-center relative">
                            {node.rightNode && (
                                <>
                                    <div className="absolute top-0 right-1/2 w-8 h-6 border-r-2 border-t-2 border-gray-300 rounded-tr-lg"></div>
                                    <div className="mt-6">{renderFamilyTree(node.rightNode)}</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Calculate potential pairs and income
    const potentialPairs = Math.min(leftCount, rightCount);
    const potentialPromotionalIncome = potentialPairs * 400;

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
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
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
                {/* Matched Pairs Card */}
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <FaLink className="text-2xl" />
                        <span className="font-bold text-lg">Matched Pairs</span>
                    </div>
                    <p className="text-3xl font-bold mb-1">{totalPairs}</p>
                    <p className="text-sm text-cyan-100">Binary legs completed (you + all downlines)</p>
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
            {/* Family Tree Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Family Tree (Downlines Network Structure)</h3>
                <div className="overflow-auto py-4">
                    <div className="min-w-max mx-auto">{renderFamilyTree(treeData)}</div>
                </div>
            </div>
        </div>
    );
};

export default MyNetwork;