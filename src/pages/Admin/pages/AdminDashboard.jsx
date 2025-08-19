import React, { useEffect, useState } from 'react';
import { 
  FaChartLine, 
  FaShoppingCart, 
  FaUsers, 
  FaMoneyBillWave,
  FaStar,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEllipsisV,
  FaUser, FaUserCircle, FaUserSlash, FaExpand, FaCompress
} from 'react-icons/fa';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { collection, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../../../Firebase/firebase';
import AdminNetworkTree from './AdminNetworkTree.jsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('monthly');
  const [showFilters, setShowFilters] = useState(false);
  // Real-time data state
  const [orders, setOrders] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [mlmUsers, setMlmUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkSearchType, setNetworkSearchType] = useState('referralCode');
  const [networkTree, setNetworkTree] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [networkExpanded, setNetworkExpanded] = useState(false);

  // Real-time Firestore listeners
  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });
    const paymentRequestsQuery = query(collection(db, 'paymentRequests'), orderBy('submittedAt', 'desc'));
    const unsubscribePayments = onSnapshot(paymentRequestsQuery, (snapshot) => {
      const paymentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPaymentRequests(paymentData);
    });
    
    // Listen to income records for actual affiliate revenue
    const incomeRecordsQuery = query(collection(db, 'incomeRecords'), orderBy('createdAt', 'desc'));
    const unsubscribeIncomeRecords = onSnapshot(incomeRecordsQuery, (snapshot) => {
      const incomeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncomeRecords(incomeData);
    });
    
    // Listen to MLM users for fallback calculation
    const mlmUsersQuery = query(collection(db, 'mlmUsers'));
    const unsubscribeMlmUsers = onSnapshot(mlmUsersQuery, (snapshot) => {
      const mlmData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMlmUsers(mlmData);
    });
    
    // Listen to users collection for affiliate data
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });
    
    return () => {
      unsubscribeOrders();
      unsubscribePayments();
      unsubscribeIncomeRecords();
      unsubscribeMlmUsers();
      unsubscribeUsers();
    };
  }, []);
  // Analytics calculations
  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const newCustomers = new Set(orders.map(o => o.userId)).size;
  
  // Calculate affiliate revenue from income records
  const promotionalIncome = incomeRecords.filter(r => r.type === 'promotional').reduce((sum, r) => sum + (r.amount || 0), 0);
  const rewardsIncome = incomeRecords.filter(r => r.type === 'performance_reward').reduce((sum, r) => sum + (r.amount || 0), 0);
  const affiliateRevenue = promotionalIncome + rewardsIncome;
  
  // Calculate payment requests revenue as potential affiliate revenue
  const paymentRequestsRevenue = paymentRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
  
  // Debug logging
  
  
  // Calculate payment requests revenue by status
  const approvedPaymentRequestsRevenue = paymentRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingPaymentRequestsRevenue = paymentRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0);
  
  // Additional affiliate metrics
  const totalPaymentRequests = paymentRequests.length;
  const approvedPaymentRequests = paymentRequests.filter(r => r.status === 'approved').length;
  const pendingPaymentRequests = paymentRequests.filter(r => r.status === 'pending').length;
  const rejectedPaymentRequests = paymentRequests.filter(r => r.status === 'rejected').length;
  
  // Income records metrics
  const totalIncomeRecords = incomeRecords.length;
  const promotionalRecords = incomeRecords.filter(r => r.type === 'promotional').length;
  const rewardsRecords = incomeRecords.filter(r => r.type === 'performance_reward').length;
  
  // Helper function to fetch all downlines for a user (same as Affiliate Dashboard)
  const fetchAllDownlines = async (referralCode) => {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('referredBy', '==', referralCode),
      where('affiliateStatus', '==', true),
      where('paymentRequestStatus', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    let allDownlines = [];
    for (const docSnap of querySnapshot.docs) {
      const downline = docSnap.data();
      allDownlines.push(downline);
      // Recursively fetch this downline's downlines
      const subDownlines = await fetchAllDownlines(downline.referralCode);
      allDownlines = allDownlines.concat(subDownlines);
    }
    return allDownlines;
  };

  // Helper function to build tree for pair calculation (same as Affiliate Dashboard)
  const buildTreeForPairs = async (referralCode, level = 0, maxLevel = 3) => {
    if (level >= maxLevel) return null;
    const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
    const userSnapshot = await getDocs(userQuery);
    if (userSnapshot.empty) return null;
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    
    // Only include users with approved payment requests for pair matching
    const isPaymentApproved = userData.affiliateStatus === true && userData.paymentRequestStatus === 'approved';
    
    let leftNode = null;
    let rightNode = null;
    
    if (userData.leftDownLine) {
      leftNode = await buildTreeForPairs(userData.leftDownLine, level + 1, maxLevel);
    }
    if (userData.rightDownLine) {
      rightNode = await buildTreeForPairs(userData.rightDownLine, level + 1, maxLevel);
    }
    
    return {
      ...userData,
      leftNode,
      rightNode,
      isPaymentApproved,
      level
    };
  };

  // Helper function to count pairs (same as Affiliate Dashboard)
  const countPairs = (node) => {
    if (!node) return 0;
    // Only count as a pair if both left and right nodes exist AND both have approved payment requests
    const isPair = node.leftNode && node.rightNode && 
                   node.leftNode.isPaymentApproved && node.rightNode.isPaymentApproved ? 1 : 0;
    return isPair + countPairs(node.leftNode) + countPairs(node.rightNode);
  };

  // Helper function to calculate promotional income (same as Affiliate Dashboard)
  const calculatePromotionalIncome = (treeData) => {
    if (!treeData) return 0;
    
    const countLeg = (node) => {
      if (!node) return 0;
      const currentUserCount = node.isPaymentApproved ? 1 : 0;
      return currentUserCount + countLeg(node.leftNode) + countLeg(node.rightNode);
    };
    
    let l = treeData.leftNode ? countLeg(treeData.leftNode) : 0;
    let r = treeData.rightNode ? countLeg(treeData.rightNode) : 0;
    
    let pairs = 0;
    while ((l >= 2 && r >= 1) || (l >= 1 && r >= 2)) {
      if (l > r) {
        l -= 2;
        r -= 1;
      } else {
        l -= 1;
        r -= 2;
      }
      pairs += 1;
    }
    
    return pairs * 400; // ₹400 per pair
  };

  // Calculate top performers based on network size (downlines)
  const [topPerformers, setTopPerformers] = useState([]);
  
  useEffect(() => {
    const calculateTopPerformers = async () => {
      const affiliateUsers = users.filter(user => user.role === 'affiliate' || user.affiliateStatus === true);
      const performersData = [];
      
      for (const user of affiliateUsers) {
        try {
          // Calculate network size using the same logic as Affiliate Dashboard
          const totalDownlines = await fetchAllDownlines(user.referralCode);
          const directDownlines = users.filter(downline => 
            downline.referredBy === user.referralCode &&
            downline.affiliateStatus === true &&
            downline.paymentRequestStatus === 'approved'
          );
          
          // Calculate pairs and income using the same logic as Affiliate Dashboard
          const treeData = await buildTreeForPairs(user.referralCode);
          const pairsCount = countPairs(treeData);
          const calculatedPromotionalIncome = calculatePromotionalIncome(treeData);
          const rewardsIncome = user.rewardsIncome || 0;
          const totalIncome = calculatedPromotionalIncome + rewardsIncome;
          
          performersData.push({
            id: user.id,
            name: user.name || user.email || 'Unknown',
            email: user.email,
            referralCode: user.referralCode,
            networkSize: totalDownlines.length,
            directDownlines: directDownlines.length,
            pairsCount: pairsCount,
            totalIncome: totalIncome,
            promotionalIncome: calculatedPromotionalIncome,
            rewardsIncome: rewardsIncome,
            leftDownLine: user.leftDownLine,
            rightDownLine: user.rightDownLine,
            joinDate: user.joinDate || user.createdAt
          });
        } catch (error) {
          console.error('Error calculating network for user:', user.referralCode, error);
        }
      }
      
      // Sort by network size and take top 10
      const sortedPerformers = performersData
        .sort((a, b) => b.networkSize - a.networkSize)
        .slice(0, 10);
      
      setTopPerformers(sortedPerformers);
    };
    
    if (users.length > 0) {
      calculateTopPerformers();
    }
  }, [users]);
    
  // Debug logging for top performers
  
  
  // Chart data (example: monthly sales)
  const salesByMonth = Array(12).fill(0);
  orders.forEach(order => {
    if (order.createdAt && order.createdAt.toDate) {
      const month = order.createdAt.toDate().getMonth();
      salesByMonth[month] += order.totalAmount || 0;
    }
  });
  
  // Payment requests monthly data
  const paymentRequestsByMonth = Array(12).fill(0);
  const paymentRequestsCountByMonth = Array(12).fill(0);
  paymentRequests.forEach(request => {
    if (request.submittedAt && request.submittedAt.toDate) {
      const month = request.submittedAt.toDate().getMonth();
      paymentRequestsByMonth[month] += request.amount || 0;
      paymentRequestsCountByMonth[month]++;
    }
  });
  const salesChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Sales',
        data: salesByMonth,
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.3,
        fill: true
      }
    ]
  };
  // Revenue sources (example: product orders vs affiliate income)
  const revenueChartData = {
    labels: ['Product Orders', 'Affiliate Income', 'Promotional Income', 'Rewards Income'],
    datasets: [
      {
        label: 'Revenue',
        data: [totalSales, affiliateRevenue, promotionalIncome, rewardsIncome],
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(139, 92, 246, 0.7)'
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(139, 92, 246, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  // Payment requests monthly chart data
  const paymentRequestsChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Payment Amount (₹)',
        data: paymentRequestsByMonth,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      },
      {
        label: 'Number of Requests',
        data: paymentRequestsCountByMonth,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        fill: false,
        yAxisID: 'y1'
      }
    ]
  };

  // Helper to fetch user by any field
  const fetchUserByField = async (field, value) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(field, '==', value));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  };
  // Helper to build tree
  const buildTree = async (referralCode, level = 0, maxLevel = networkExpanded ? 4 : 3) => {
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
  // Handle network search
  const handleNetworkSearch = async (e) => {
    e.preventDefault();
    setNetworkLoading(true);
    setNetworkError(null);
    setNetworkTree(null);
    let user = null;
    try {
      if (networkSearchType === 'referralCode') {
        user = await fetchUserByField('referralCode', networkSearch);
      } else if (networkSearchType === 'email') {
        user = await fetchUserByField('email', networkSearch);
      } else if (networkSearchType === 'userId') {
        user = await fetchUserByField('userId', networkSearch);
      }
      if (!user) {
        setNetworkError('User not found');
        setNetworkLoading(false);
        return;
      }
      const tree = await buildTree(user.referralCode);
      setNetworkTree({ root: user, tree });
    } catch (err) {
      setNetworkError('Error loading network tree');
    } finally {
      setNetworkLoading(false);
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
              <FaFilter />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:px-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex -mb-px flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sales' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Sales
            </button>
            <button
              onClick={() => setActiveTab('performers')}
              className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'performers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Top Performers
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'network' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Network
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Total Sales</p>
                    <h3 className="text-2xl font-bold mt-1">₹{totalSales.toLocaleString()}</h3>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <FaChartLine className="text-indigo-600 text-xl" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Total Orders</p>
                    <h3 className="text-2xl font-bold mt-1">{totalOrders.toLocaleString()}</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <FaShoppingCart className="text-green-600 text-xl" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">New Customers</p>
                    <h3 className="text-2xl font-bold mt-1">{newCustomers.toLocaleString()}</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FaUsers className="text-blue-600 text-xl" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Affiliate Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">₹{affiliateRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FaMoneyBillWave className="text-purple-600 text-xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Requests Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Requests Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Total Requests</p>
                  <p className="text-xl font-bold">{totalPaymentRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Approved</p>
                  <p className="text-xl font-bold text-green-600">{approvedPaymentRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">{pendingPaymentRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Rejected</p>
                  <p className="text-xl font-bold text-red-600">{rejectedPaymentRequests}</p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
                  <h3 className="font-semibold">Sales Trend</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setTimeRange('daily')}
                      className={`px-3 py-1 rounded-lg text-xs ${timeRange === 'daily' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setTimeRange('weekly')}
                      className={`px-3 py-1 rounded-lg text-xs ${timeRange === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setTimeRange('monthly')}
                      className={`px-3 py-1 rounded-lg text-xs ${timeRange === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <div className="h-64 min-w-[320px]">
                  <Line 
                    data={salesChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        },
                        x: {
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
                <h3 className="font-semibold mb-4">Revenue Sources</h3>
                <div className="h-64 min-w-[320px]">
                  <Pie 
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Payment Requests Monthly Chart */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
              <h3 className="font-semibold mb-4">Payment Requests - Monthly Trend</h3>
              <div className="h-64 min-w-[320px]">
                <Line 
                  data={paymentRequestsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Amount (₹)'
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Number of Requests'
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <h3 className="font-semibold">Recent Orders</h3>
                <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[600px] w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{order.totalAmount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-indigo-600 hover:text-indigo-900">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <h3 className="font-semibold">Order Management</h3>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 bg-gray-100 rounded-lg flex items-center hover:bg-gray-200"
                >
                  <FaFilter className="mr-2" /> Filters
                </button>
                <button className="px-3 py-1 bg-gray-100 rounded-lg flex items-center hover:bg-gray-200">
                  <FaDownload className="mr-2" /> Export
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option>All Statuses</option>
                      <option>Completed</option>
                      <option>Processing</option>
                      <option>Shipped</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option>All Time</option>
                      <option>Today</option>
                      <option>This Week</option>
                      <option>This Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option>Any Amount</option>
                      <option>Under $100</option>
                      <option>$100 - $500</option>
                      <option>Over $500</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full">
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-[600px] w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.userId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{order.totalAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <FaEllipsisV />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex-1 flex justify-between items-center">
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Previous
                </button>
                <div className="hidden md:flex">
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page 1 of 5
                  </span>
                </div>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
                <h3 className="font-semibold">Sales Analytics</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTimeRange('daily')}
                    className={`px-3 py-1 rounded-lg text-xs ${timeRange === 'daily' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTimeRange('weekly')}
                    className={`px-3 py-1 rounded-lg text-xs ${timeRange === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimeRange('monthly')}
                    className={`px-3 py-1 rounded-lg text-xs ${timeRange === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              <div className="h-96 min-w-[320px]">
                <Bar 
                  data={salesChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
                <h3 className="font-semibold mb-4">Revenue Breakdown</h3>
                <div className="h-64 min-w-[320px]">
                  <Pie 
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
                <h3 className="font-semibold mb-4">Top Products</h3>
                <div className="space-y-4 min-w-[320px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <span className="text-indigo-600">A1</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Product Alpha</h4>
                        <p className="text-sm text-gray-500">SKU: PROD-001</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹12,450</p>
                      <p className="text-sm text-green-500">+15%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-lg mr-3">
                        <span className="text-green-600">B2</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Product Beta</h4>
                        <p className="text-sm text-gray-500">SKU: PROD-002</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹9,870</p>
                      <p className="text-sm text-green-500">+8%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                        <span className="text-yellow-600">C3</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Product Gamma</h4>
                        <p className="text-sm text-gray-500">SKU: PROD-003</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹7,650</p>
                      <p className="text-sm text-red-500">-3%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <span className="text-purple-600">D4</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Product Delta</h4>
                        <p className="text-sm text-gray-500">SKU: PROD-004</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹5,320</p>
                      <p className="text-sm text-green-500">+22%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Performers Tab */}
        {activeTab === 'performers' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <h3 className="font-semibold">Top Performers</h3>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 bg-gray-100 rounded-lg flex items-center hover:bg-gray-200"
                >
                  <FaFilter className="mr-2" /> Filters
                </button>
                <button className="px-3 py-1 bg-gray-100 rounded-lg flex items-center hover:bg-gray-200">
                  <FaDownload className="mr-2" /> Export
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option>All Levels</option>
                      <option>Diamond</option>
                      <option>Gold</option>
                      <option>Silver</option>
                      <option>Bronze</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option>This Month</option>
                      <option>Last Month</option>
                      <option>This Quarter</option>
                      <option>This Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                      <option>Total Sales</option>
                      <option>Recruits</option>
                      <option>Commission</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full">
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-[600px] w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pairs Matched</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Income</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topPerformers.length > 0 ? (
                    topPerformers.map((performer, index) => (
                      <tr key={performer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{performer.name}</div>
                            <div className="text-sm text-gray-500">{performer.email}</div>
                          </div>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                           {performer.referralCode || 'N/A'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           <span className="font-semibold text-blue-600">{performer.networkSize}</span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           <span className="font-semibold text-green-600">{performer.pairsCount}</span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           ₹{performer.totalIncome.toLocaleString()}
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <FaEllipsisV />
                          </button>
                        </td>
                      </tr>
                    ))
                                     ) : (
                     <tr>
                       <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                         <div className="flex flex-col items-center">
                           <FaUsers className="text-4xl text-gray-300 mb-2" />
                           <p className="text-lg font-medium">No performers found</p>
                           <p className="text-sm">No affiliates have verified downlines yet.</p>
                         </div>
                       </td>
                     </tr>
                   )}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex-1 flex justify-between items-center">
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Previous
                </button>
                <div className="hidden md:flex">
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page 1 of 3
                  </span>
                </div>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <AdminNetworkTree />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;