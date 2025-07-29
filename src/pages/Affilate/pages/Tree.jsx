import { useState, useEffect } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where, doc } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { FaUser, FaUserCircle, FaUserPlus, FaUserSlash, FaSearch, FaExpand, FaCompress } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';
import { Tooltip } from 'react-tooltip';

const MLMTreeView = () => {
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const { currentUser } = useUser();

    useEffect(() => {
        const fetchNetworkTree = async () => {
            try {
                const referralCode = searchTerm || currentUser?.referralCode;
                if (!referralCode) {
                    setLoading(false);
                    return;
                }

                setLoading(true);
                setTreeData(null);

                // 1. Get user data
                const userQuery = query(
                    collection(db, 'users'),
                    where('referralCode', '==', referralCode)
                );
                const userSnapshot = await getDocs(userQuery);
                
                if (userSnapshot.empty) {
                    setError("User data not found");
                    setLoading(false);
                    return;
                }

                const userData = userSnapshot.docs[0].data();
                
                // 2. Build tree structure recursively
                const buildTree = async (userId, referralCode, level = 0, maxLevel = isExpanded ? 4 : 3) => {
                    if (level >= maxLevel) return null;

                    // Get user data
                    const userQuery = query(
                        collection(db, 'users'),
                        where('referralCode', '==', referralCode)
                    );
                    const userSnapshot = await getDocs(userQuery);
                    
                    if (userSnapshot.empty) {
                        // Log missing downline
                        console.warn('Downline user not found for referralCode:', referralCode);
                        return { missingDownline: true, referralCode, level };
                    }

                    const userData = userSnapshot.docs[0].data();
                    
                    // Get left and right downlines
                    let leftDownline = null;
                    let rightDownline = null;

                    if (userData.leftDownLine) {
                        leftDownline = await buildTree(userId, userData.leftDownLine, level + 1, maxLevel);
                    }

                    if (userData.rightDownLine) {
                        rightDownline = await buildTree(userId, userData.rightDownLine, level + 1, maxLevel);
                    }

                    return {
                        id: userId,
                        referralCode: userData.referralCode,
                        name: userData.name || 'Unnamed',
                        email: userData.email,
                        joinDate: userData.joinDate,
                        leftDownLine: userData.leftDownLine,
                        rightDownLine: userData.rightDownLine,
                        leftDownlineNode: leftDownline,
                        rightDownlineNode: rightDownline,
                        level
                    };
                };

                // 3. Build the complete tree
                const tree = await buildTree(
                    userSnapshot.docs[0].id,
                    referralCode
                );

                setTreeData(tree);
                setLoading(false);
                setError(null);
            } catch (error) {
                console.error("Error fetching network tree: ", error);
                setError("Failed to load network tree");
                setLoading(false);
            }
        };

        fetchNetworkTree();
    }, [currentUser, searchTerm, isExpanded]);

    const renderNode = (node) => {
        if (!node) {
            return (
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                        <FaUserSlash className="text-gray-400 text-2xl" />
                    </div>
                    <span className="text-xs text-gray-500 mt-2">Empty slot</span>
                </div>
            );
        }
        if (node.missingDownline) {
            return (
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow border-2 border-yellow-400">
                        <FaUserSlash className="text-yellow-500 text-2xl" />
                    </div>
                    <span className="text-xs text-yellow-700 mt-2">Missing downline</span>
                    <span className="text-xs text-yellow-500 font-mono bg-yellow-50 px-2 py-1 rounded mt-1">{node.referralCode}</span>
                </div>
            );
        }

        return (
            <div 
                className="flex flex-col items-center group"
                data-tooltip-id={`node-${node.referralCode}`}
            >
                <div className={`
                    w-20 h-20 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all
                    ${node.level === 0 ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300' : 
                      'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'}
                    hover:scale-105 transform transition-transform cursor-pointer
                `}>
                    {node.level === 0 ? (
                        <FaUserCircle className="text-blue-500 text-3xl" />
                    ) : (
                        <FaUser className="text-gray-600 text-2xl" />
                    )}
                </div>
                <span className="text-sm font-medium mt-2 text-center max-w-[120px] truncate">
                    {node.name}
                </span>
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                    {node.referralCode}
                </span>

                <Tooltip id={`node-${node.referralCode}`} className="z-50">
                    <div className="bg-white p-3 rounded-lg shadow-lg max-w-xs">
                        <h3 className="font-bold text-blue-600">{node.name}</h3>
                        <div className="text-xs text-gray-500 mb-1">ID: {node.referralCode}</div>
                        <div className="text-xs text-gray-700">{node.email}</div>
                        {node.joinDate && (
                            <div className="text-xs text-gray-500 mt-1">
                                Joined: {new Date(node.joinDate.seconds * 1000).toLocaleDateString()}
                            </div>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                            <span className="text-xs text-green-600">
                                Left: {node.leftDownLine || 'None'}
                            </span>
                            <span className="text-xs text-blue-600">
                                Right: {node.rightDownLine || 'None'}
                            </span>
                        </div>
                    </div>
                </Tooltip>
            </div>
        );
    };

    const renderTree = (node) => {
        if (!node) return null;

        return (
            <div className="flex flex-col items-center">
                {/* Current Node */}
                <div className="relative">
                    {renderNode(node)}
                    {(node.leftDownlineNode || node.rightDownlineNode) && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-gray-300 to-transparent"></div>
                    )}
                </div>
                
                {/* Downlines */}
                {(node.leftDownlineNode || node.rightDownlineNode) && (
                    <div className="flex justify-center space-x-16 mt-6">
                        {/* Left Downline */}
                        <div className="flex flex-col items-center relative">
                            {node.leftDownlineNode && (
                                <>
                                    <div className="absolute top-0 left-1/2 w-8 h-6 border-l-2 border-t-2 border-gray-300 rounded-tl-lg"></div>
                                    <div className="mt-6">
                                        {renderTree(node.leftDownlineNode)}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Right Downline */}
                        <div className="flex flex-col items-center relative">
                            {node.rightDownlineNode && (
                                <>
                                    <div className="absolute top-0 right-1/2 w-8 h-6 border-r-2 border-t-2 border-gray-300 rounded-tr-lg"></div>
                                    <div className="mt-6">
                                        {renderTree(node.rightDownlineNode)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const searchValue = formData.get('search');
        setSearchTerm(searchValue);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="mb-4">
                    <PulseLoader color="#3B82F6" size={15} />
                </div>
                <p className="text-gray-600">Building network tree...</p>
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
                <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    View My Tree
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Affilate Network Tree</h1>
                
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
                    >
                        {isExpanded ? (
                            <>
                                <FaCompress /> Collapse Tree
                            </>
                        ) : (
                            <>
                                <FaExpand /> Expand Tree
                            </>
                        )}
                    </button>
                    
                    <form onSubmit={handleSearch} className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            name="search"
                            type="text"
                            placeholder="Search by referral code..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            defaultValue={searchTerm}
                        />
                    </form>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                {treeData ? (
                    <div className="overflow-auto py-4">
                        <div className="min-w-max mx-auto">
                            {renderTree(treeData)}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <FaUserCircle className="text-blue-500 text-5xl" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-700">No network tree found</h3>
                        <p className="text-gray-500 mt-2">
                            {searchTerm ? 
                                "No user found with that referral code" : 
                                "You don't have any downlines yet"}
                        </p>
                        {!searchTerm && (
                            <p className="text-gray-500">Start building your network by referring new members.</p>
                        )}
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                View My Tree
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Tree Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
                            <FaUserCircle className="text-blue-500 text-sm" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700">Root Node</h4>
                            <p className="text-sm text-gray-500 mt-1">The starting point of the tree (you or searched user)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <FaUser className="text-gray-600 text-sm" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700">Downline</h4>
                            <p className="text-sm text-gray-500 mt-1">Members in your network organization</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FaUserSlash className="text-gray-400 text-sm" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700">Empty Slot</h4>
                            <p className="text-sm text-gray-500 mt-1">Available position for new members</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MLMTreeView;