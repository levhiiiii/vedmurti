import { useState, useEffect } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where, doc } from 'firebase/firestore';
import { useUser } from '../../../context/UserContext';
import { FaUser, FaUserCircle, FaUserPlus, FaUserSlash, FaSearch, FaExpand, FaCompress, FaList } from 'react-icons/fa';
import { PulseLoader } from 'react-spinners';
import { Tooltip } from 'react-tooltip';
import { MLMService } from '../../../services/mlmService';

const MLMTreeView = () => {
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showTable, setShowTable] = useState(false);
    const [networkMembers, setNetworkMembers] = useState([]);
    const [currentRoot, setCurrentRoot] = useState(null);
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
                const buildTree = async (userId, referralCode, level = 0, maxLevel = isExpanded ? 5 : 5) => {
                    if (level >= maxLevel) return null;

                    console.log(`Building tree for referralCode: ${referralCode} at level: ${level}`);

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
                    
                    // Check payment status - hide rejected and pending users
                    const paymentStatus = userData.paymentStatus || userData.paymentRequestStatus || 'pending';
                    if (paymentStatus === 'rejected' || paymentStatus === 'pending') {
                        console.log(`Hiding ${paymentStatus} user: ${referralCode} with payment status: ${paymentStatus}`);
                        return { missingDownline: true, referralCode, level, reason: paymentStatus === 'rejected' ? 'payment_rejected' : 'payment_pending' };
                    }
                    
                    console.log(`User data for ${referralCode}:`, {
                        name: userData.name,
                        leftDownLine: userData.leftDownLine,
                        rightDownLine: userData.rightDownLine,
                        paymentStatus: paymentStatus
                    });
                    
                    // Get left and right downlines
                    let leftDownline = null;
                    let rightDownline = null;

                    if (userData.leftDownLine) {
                        console.log(`Fetching left downline: ${userData.leftDownLine}`);
                        leftDownline = await buildTree(userId, userData.leftDownLine, level + 1, maxLevel);
                    }

                    if (userData.rightDownLine) {
                        console.log(`Fetching right downline: ${userData.rightDownLine}`);
                        rightDownline = await buildTree(userId, userData.rightDownLine, level + 1, maxLevel);
                    }

                    const nodeData = {
                        id: userId,
                        referralCode: userData.referralCode,
                        name: userData.name || 'Unnamed',
                        email: userData.email,
                        joinDate: userData.joinDate,
                        leftDownLine: userData.leftDownLine,
                        rightDownLine: userData.rightDownLine,
                        leftDownlineNode: leftDownline,
                        rightDownlineNode: rightDownline,
                        level,
                        affiliateStatus: userData.affiliateStatus || false,
                        paymentStatus: paymentStatus
                    };
                    
                    console.log(`Tree node for ${userData.referralCode}:`, {
                        leftDownLine: userData.leftDownLine,
                        rightDownLine: userData.rightDownLine,
                        paymentStatus: paymentStatus
                    });
                    
                    return nodeData;
                };

                // 3. Build the complete tree
                const tree = await buildTree(
                    userSnapshot.docs[0].id,
                    referralCode
                );

                setTreeData(tree);
                
                // Extract all network members for table view with better error handling
                const extractNetworkMembers = (node, members = []) => {
                    if (!node) return members;
                    
                    // Skip payment rejected and pending users in table view
                    if (node.missingDownline && (node.reason === 'payment_rejected' || node.reason === 'payment_pending')) {
                        console.log(`Skipping ${node.reason} user in table: ${node.referralCode}`);
                        return members;
                    }
                    
                    // Add current node to members
                    const memberData = {
                        name: node.name || 'Unknown',
                        referralCode: node.referralCode,
                        email: node.email,
                        joinDate: node.joinDate,
                        leftDownLine: node.leftDownLine,
                        rightDownLine: node.rightDownLine,
                        level: node.level,
                        isRoot: node.level === 0,
                        hasLeftDownline: !!node.leftDownLine,
                        hasRightDownline: !!node.rightDownLine,
                        leftDownlineExists: !!node.leftDownlineNode && !node.leftDownlineNode.missingDownline,
                        rightDownlineExists: !!node.rightDownlineNode && !node.rightDownlineNode.missingDownline,
                        paymentStatus: node.paymentStatus || 'pending'
                    };
                    
                    members.push(memberData);
                    
                    // Recursively extract left downline
                    if (node.leftDownlineNode && !node.leftDownlineNode.missingDownline) {
                        extractNetworkMembers(node.leftDownlineNode, members);
                    }
                    
                    // Recursively extract right downline
                    if (node.rightDownlineNode && !node.rightDownlineNode.missingDownline) {
                        extractNetworkMembers(node.rightDownlineNode, members);
                    }
                    
                    return members;
                };
                
                // Get all network members directly from database for complete data
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
                            isMissing: false
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
                
                // Get complete network data
                const completeMembers = await getAllNetworkMembers(referralCode);
                console.log('Complete network members:', completeMembers);
                setNetworkMembers(completeMembers);
                
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
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow border-2 ${
                        node.reason === 'payment_rejected' 
                            ? 'bg-red-100 border-red-400' 
                            : node.reason === 'payment_pending'
                            ? 'bg-orange-100 border-orange-400'
                            : 'bg-yellow-100 border-yellow-400'
                    }`}>
                        <FaUserSlash className={`text-2xl ${
                            node.reason === 'payment_rejected' ? 'text-red-500' : 
                            node.reason === 'payment_pending' ? 'text-orange-500' : 'text-yellow-500'
                        }`} />
                    </div>
                    <span className={`text-xs mt-2 ${
                        node.reason === 'payment_rejected' ? 'text-red-700' : 
                        node.reason === 'payment_pending' ? 'text-orange-700' : 'text-yellow-700'
                    }`}>
                        {node.reason === 'payment_rejected' ? 'Payment Rejected' : 
                         node.reason === 'payment_pending' ? 'Payment Pending' : 'Missing downline'}
                    </span>
                    <span className={`text-xs font-mono px-2 py-1 rounded mt-1 ${
                        node.reason === 'payment_rejected' 
                            ? 'text-red-500 bg-red-50' 
                            : node.reason === 'payment_pending'
                            ? 'text-orange-500 bg-orange-50'
                            : 'text-yellow-500 bg-yellow-50'
                    }`}>
                        {node.referralCode}
                    </span>
                    {(node.reason === 'payment_rejected' || node.reason === 'payment_pending') && (
                        <span className={`text-xs mt-1 ${
                            node.reason === 'payment_rejected' ? 'text-red-600' : 'text-orange-600'
                        }`}>
                            Awaiting Admin Approval
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div 
                className="flex flex-col items-center group cursor-pointer"
                data-tooltip-id={`node-${node.referralCode}`}
                onClick={() => handleNodeClick(node)}
            >
                <div className={`
                    w-20 h-20 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all
                    ${node.level === 0 ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300' : 
                      currentRoot === node.referralCode ? 'bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-300' :
                      !node.affiliateStatus ? 'bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-300' :
                      'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'}
                    hover:scale-105 transform transition-transform
                `}>
                    {node.level === 0 ? (
                        <FaUserCircle className="text-blue-500 text-3xl" />
                    ) : currentRoot === node.referralCode ? (
                        <FaUserCircle className="text-green-500 text-3xl" />
                    ) : !node.affiliateStatus ? (
                        <FaUser className="text-red-500 text-2xl" />
                    ) : (
                        <FaUser className="text-gray-600 text-2xl" />
                    )}
                </div>
                <span className={`text-sm font-medium mt-2 text-center max-w-[120px] truncate ${
                    currentRoot === node.referralCode ? 'text-green-600 font-bold' : 
                    !node.affiliateStatus ? 'text-red-600' : ''
                }`}>
                    {node.name}
                    {!node.affiliateStatus && (
                        <div className="text-xs text-red-500 mt-1">Inactive</div>
                    )}
                </span>
                <span className={`text-xs font-mono px-2 py-1 rounded mt-1 ${
                    !node.affiliateStatus ? 'text-red-500 bg-red-100' : 'text-gray-500 bg-gray-100'
                }`}>
                    {node.referralCode}
                </span>
                <span className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentRoot === node.referralCode ? 'Current view' : 'Click to view network'}
                </span>

                <Tooltip id={`node-${node.referralCode}`} className="z-50">
                    <div className="bg-white p-3 rounded-lg shadow-lg max-w-xs">
                        <h3 className={`font-bold ${!node.affiliateStatus ? 'text-red-600' : 'text-blue-600'}`}>
                            {node.name}
                            {!node.affiliateStatus && (
                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                    Inactive
                                </span>
                            )}
                        </h3>
                        <div className="text-xs text-gray-500 mb-1">ID: {node.referralCode}</div>
                        <div className="text-xs text-gray-700">{node.email}</div>
                        {node.joinDate && (
                            <div className="text-xs text-gray-500 mt-1">
                                Joined: {new Date(node.joinDate.seconds * 1000).toLocaleDateString()}
                            </div>
                        )}
                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
                            <div className="flex justify-between">
                            <span className="text-xs text-green-600">
                                Left: {node.leftDownLine || 'None'}
                            </span>
                            <span className="text-xs text-blue-600">
                                Right: {node.rightDownLine || 'None'}
                            </span>
                            </div>
                            <div className="flex justify-between">
                                <span className={`text-xs px-2 py-1 rounded ${
                                    node.affiliateStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {node.affiliateStatus ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                    node.paymentStatus === 'approved' ? 'bg-green-100 text-green-700' : 
                                    node.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {node.paymentStatus || 'pending'}
                                </span>
                            </div>
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
        const searchValue = e.target.search.value.trim();
        if (searchValue) {
        setSearchTerm(searchValue);
        }
    };

    const handleNodeClick = (node) => {
        if (node && node.referralCode) {
            setSearchTerm(node.referralCode);
            setCurrentRoot(node.referralCode);
        }
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
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {currentRoot && currentRoot !== currentUser?.referralCode 
                            ? `Network Tree - ${currentRoot}`
                            : 'Affilate Tree'
                        }
                    </h1>
                    {currentRoot && currentRoot !== currentUser?.referralCode && (
                        <button
                            onClick={() => {
                                setSearchTerm(currentUser?.referralCode || '');
                                setCurrentRoot(currentUser?.referralCode || null);
                            }}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                        >
                            Back to My Tree
                        </button>
                    )}
                </div>
                
                {/* Color Legend */}
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Tree Color Legend:</h3>
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 mr-2"></div>
                            <span>You (Root User)</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-300 mr-2"></div>
                            <span>Current View</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-300 mr-2"></div>
                            <span>Inactive Affiliate</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 mr-2"></div>
                            <span>Active Affiliate</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-400 mr-2"></div>
                            <span>Payment Rejected (Hidden)</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-orange-100 border-2 border-orange-400 mr-2"></div>
                            <span>Payment Pending (Hidden)</span>
                        </div>
                    </div>
                </div>
                
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
                    
                    <button
                        onClick={() => setShowTable(!showTable)}
                        className="flex items-center gap-2 bg-purple-500 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-600"
                    >
                        {showTable ? 'Hide Table' : 'Show Table'}
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
                {showTable && networkMembers.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-800">Network Members Table</h2>
                            <button
                                onClick={() => setShowTable(false)}
                                className="text-gray-500 hover:text-gray-700 text-xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="mb-4 text-sm text-gray-600">
                            Showing {networkMembers.length} network member{networkMembers.length !== 1 ? 's' : ''}
                        </div>
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
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                            Join Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {networkMembers.map((member, index) => (
                                        <tr key={index} className={`hover:bg-gray-50 ${
                                            member.isRoot ? 'bg-blue-50' : ''
                                        }`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                                        member.isRoot 
                                                            ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300' 
                                                            : !member.affiliateStatus
                                                            ? 'bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-300'
                                                            : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
                                                    }`}>
                                                        {member.isRoot ? (
                                                            <FaUserCircle className="text-blue-500 text-sm" />
                                                        ) : !member.affiliateStatus ? (
                                                            <FaUser className="text-red-500 text-sm" />
                                                        ) : (
                                                            <FaUser className="text-gray-600 text-sm" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-medium ${
                                                            !member.affiliateStatus ? 'text-red-600' : 'text-gray-900'
                                                        }`}>
                                                            {member.name}
                                                            {!member.affiliateStatus && (
                                                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`text-sm ${
                                                            !member.affiliateStatus ? 'text-red-400' : 'text-gray-500'
                                                        }`}>
                                                            {member.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                    {member.referralCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    member.isRoot 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {member.isRoot ? 'Root' : `Level ${member.level}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-mono ${
                                                        member.leftDownLine && member.leftDownlineExists
                                                            ? 'text-green-600 bg-green-100 px-2 py-1 rounded' 
                                                            : member.leftDownLine && !member.leftDownlineExists
                                                            ? 'text-orange-600 bg-orange-100 px-2 py-1 rounded'
                                                            : 'text-gray-400'
                                                    }`}>
                                                        {member.leftDownLine || 'None'}
                                                    </span>
                                                    {member.leftDownLine && !member.leftDownlineExists && (
                                                        <span className="text-xs text-orange-500 mt-1">Missing</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-mono ${
                                                        member.rightDownLine && member.rightDownlineExists
                                                            ? 'text-blue-600 bg-blue-100 px-2 py-1 rounded' 
                                                            : member.rightDownLine && !member.rightDownlineExists
                                                            ? 'text-orange-600 bg-orange-100 px-2 py-1 rounded'
                                                            : 'text-gray-400'
                                                    }`}>
                                                        {member.rightDownLine || 'None'}
                                                    </span>
                                                    {member.rightDownLine && !member.rightDownlineExists && (
                                                        <span className="text-xs text-orange-500 mt-1">Missing</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {member.leftDownLine && (
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            member.leftDownlineExists 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            Left: {member.leftDownlineExists ? 'Active' : 'Missing'}
                                                        </span>
                                                    )}
                                                    {member.rightDownLine && (
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            member.rightDownlineExists 
                                                                ? 'bg-blue-100 text-blue-700' 
                                                                : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            Right: {member.rightDownlineExists ? 'Active' : 'Missing'}
                                                        </span>
                                                    )}
                                                    {!member.leftDownLine && !member.rightDownLine && (
                                                        <span className="text-xs text-gray-500">No downlines</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        member.paymentStatus === 'approved'
                                                            ? 'bg-green-100 text-green-700' 
                                                            : member.paymentStatus === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        Payment: {member.paymentStatus || 'pending'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {member.joinDate ? 
                                                    new Date(member.joinDate.seconds * 1000).toLocaleDateString() : 
                                                    'N/A'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Network Statistics */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center">
                                    <FaUserCircle className="text-blue-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-sm font-medium text-blue-800">Total Members</div>
                                        <div className="text-2xl font-bold text-blue-600">{networkMembers.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center">
                                    <FaUser className="text-green-500 text-xl mr-2" />
                                    <div>
                                        <div className="text-sm font-medium text-green-800">Active Left Downlines</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {networkMembers.filter(m => m.leftDownLine && m.leftDownlineExists).length}
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
                                            {networkMembers.filter(m => m.rightDownLine && m.rightDownlineExists).length}
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
                                            {networkMembers.filter(m => 
                                                (m.leftDownLine && !m.leftDownlineExists) || 
                                                (m.rightDownLine && !m.rightDownlineExists)
                                            ).length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Debug Information */}
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h3 className="text-sm font-medium text-yellow-800 mb-2">Network Analysis</h3>
                            <div className="text-xs text-yellow-700">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div className="font-semibold">Total Members: {networkMembers.length}</div>
                                        <div>Root: {networkMembers.filter(m => m.isRoot).length}</div>
                                        <div>Level 1: {networkMembers.filter(m => m.level === 1).length}</div>
                                        <div>Level 2: {networkMembers.filter(m => m.level === 2).length}</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">Left Downlines:</div>
                                        <div>Active: {networkMembers.filter(m => m.leftDownLine && m.leftDownlineExists).length}</div>
                                        <div>Missing: {networkMembers.filter(m => m.leftDownLine && !m.leftDownlineExists).length}</div>
                                        <div>None: {networkMembers.filter(m => !m.leftDownLine).length}</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">Right Downlines:</div>
                                        <div>Active: {networkMembers.filter(m => m.rightDownLine && m.rightDownlineExists).length}</div>
                                        <div>Missing: {networkMembers.filter(m => m.rightDownLine && !m.rightDownlineExists).length}</div>
                                        <div>None: {networkMembers.filter(m => !m.rightDownLine).length}</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">Complete Pairs:</div>
                                        <div>Both Active: {networkMembers.filter(m => m.leftDownLine && m.rightDownLine && m.leftDownlineExists && m.rightDownlineExists).length}</div>
                                        <div>One Missing: {networkMembers.filter(m => (m.leftDownLine && m.rightDownLine) && (!m.leftDownlineExists || !m.rightDownlineExists)).length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : treeData ? (
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