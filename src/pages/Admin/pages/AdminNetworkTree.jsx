import { useState } from 'react';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { FaUser, FaUserCircle, FaUserSlash, FaSearch, FaExpand, FaCompress, FaArrowUp } from 'react-icons/fa';

const AdminNetworkTree = () => {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('referralCode');
  const [isExpanded, setIsExpanded] = useState(false);
  const [uplineChain, setUplineChain] = useState([]);

  // Helper to fetch user by any field
  const fetchUserByField = async (field, value) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(field, '==', value));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  };

  // Helper to build downline tree
  const buildTree = async (referralCode, level = 0, maxLevel = isExpanded ? 4 : 3) => {
    if (level >= maxLevel) return null;
    const user = await fetchUserByField('referralCode', referralCode);
    if (!user) return null;
    let leftDownline = null;
    let rightDownline = null;
    if (user.leftDownLine) leftDownline = await buildTree(user.leftDownLine, level + 1, maxLevel);
    if (user.rightDownLine) rightDownline = await buildTree(user.rightDownLine, level + 1, maxLevel);
    return {
      ...user,
      leftDownlineNode: leftDownline,
      rightDownlineNode: rightDownline,
      level
    };
  };

  // Helper to build upline chain
  const buildUplineChain = async (user) => {
    const chain = [];
    let current = user;
    while (current && current.referredBy) {
      const parent = await fetchUserByField('referralCode', current.referredBy);
      if (!parent) break;
      chain.push(parent);
      current = parent;
    }
    return chain;
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTreeData(null);
    setUplineChain([]);
    let user = null;
    try {
      if (searchType === 'referralCode') {
        user = await fetchUserByField('referralCode', searchTerm);
      } else if (searchType === 'email') {
        user = await fetchUserByField('email', searchTerm);
      } else if (searchType === 'userId') {
        user = await fetchUserByField('userId', searchTerm);
      }
      if (!user) {
        setError('User not found');
        setLoading(false);
        return;
      }
      const tree = await buildTree(user.referralCode);
      setTreeData({ root: user, tree });
      const upline = await buildUplineChain(user);
      setUplineChain(upline);
    } catch (err) {
      setError('Error loading network tree');
    } finally {
      setLoading(false);
    }
  };

  // Render tree node
  const renderTreeNode = (node) => {
    if (!node) return null;
    return (
      <div className="flex flex-col items-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md ${node.level === 0 ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300' : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'}`}> 
          {node.level === 0 ? <FaUserCircle className="text-blue-500 text-3xl" /> : <FaUser className="text-gray-600 text-2xl" />}
        </div>
        <span className="text-sm font-medium mt-2 text-center max-w-[120px] truncate">{node.name}</span>
        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1">{node.referralCode}</span>
        <span className="text-xs text-gray-400">{node.email}</span>
        {/* Downlines */}
        {(node.leftDownlineNode || node.rightDownlineNode) && (
          <div className="flex justify-center space-x-8 mt-6">
            <div>{renderTreeNode(node.leftDownlineNode)}</div>
            <div>{renderTreeNode(node.rightDownlineNode)}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Network Tree</h1>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 w-full sm:w-auto"
          >
            {isExpanded ? <FaCompress /> : <FaExpand />} {isExpanded ? 'Collapse Tree' : 'Expand Tree'}
          </button>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select value={searchType} onChange={e => setSearchType(e.target.value)} className="border rounded px-2 py-1 w-full sm:w-auto">
              <option value="referralCode">Referral Code</option>
              <option value="email">Email</option>
              <option value="userId">User ID</option>
            </select>
            <input
              name="search"
              type="text"
              placeholder={`Search by ${searchType}`}
              className="block w-full pl-2 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              required
            />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700 flex items-center gap-2 w-full sm:w-auto">
              <FaSearch /> Search
            </button>
          </form>
        </div>
      </div>
      {loading && <div className="flex justify-center py-8"><span>Loading...</span></div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {treeData && (
        <div className="overflow-x-auto py-4">
          <div className="min-w-max mx-auto">
            <div className="mb-4 p-4 bg-blue-50 rounded shadow">
              <div className="font-bold">User Info</div>
              <div>Name: {treeData.root.name}</div>
              <div>Email: {treeData.root.email}</div>
              <div>Referral Code: {treeData.root.referralCode}</div>
              <div>User ID: {treeData.root.userId}</div>
            </div>
            {/* Upline Chain */}
            {uplineChain.length > 0 && (
              <div className="mb-4 p-4 bg-gray-50 rounded shadow flex flex-wrap items-center gap-2 overflow-x-auto">
                <span className="font-bold text-gray-700">Upline Chain:</span>
                {uplineChain.map((upline, idx) => (
                  <span key={upline.referralCode} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded whitespace-nowrap">
                    <FaArrowUp className="text-gray-400" /> {upline.name} ({upline.referralCode})
                  </span>
                ))}
              </div>
            )}
            <div className="overflow-x-auto pb-4">
              {renderTreeNode(treeData.tree)}
            </div>
          </div>
        </div>
      )}
      {!treeData && !loading && !error && (
        <div className="text-gray-400 text-center py-8">Enter a referral code, email, or user ID to view a network tree.</div>
      )}
    </div>
  );
};

export default AdminNetworkTree; 