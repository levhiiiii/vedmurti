import React, { useState } from 'react';
import { 
  FaChartLine, 
  FaShoppingCart, 
  FaUsers, 
  FaMoneyBillWave,
  FaStar,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEllipsisV
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

  // Mock data
  const dashboardData = {
    stats: {
      totalSales: 125430,
      totalOrders: 842,
      newCustomers: 156,
      revenue: 87450
    },
    salesTrend: {
      monthly: [12500, 18500, 22000, 17500, 21000, 24000, 28000],
      weekly: [4500, 6800, 5200, 7500, 6200, 8900, 9500],
      daily: [850, 1200, 950, 1800, 1500, 2100, 2400]
    },
    revenueSources: {
      labels: ['Direct Sales', 'Team Commissions', 'Bonuses', 'Product Sales'],
      data: [58400, 21500, 6250, 1300]
    },
    topPerformers: [
      { id: 1, name: 'Sarah Johnson', level: 'Diamond', sales: 28450, recruits: 24 },
      { id: 2, name: 'Michael Chen', level: 'Gold', sales: 18720, recruits: 18 },
      { id: 3, name: 'Emily Rodriguez', level: 'Silver', sales: 12380, recruits: 12 },
      { id: 4, name: 'David Kim', level: 'Silver', sales: 8450, recruits: 8 },
      { id: 5, name: 'Jessica Williams', level: 'Diamond', sales: 7920, recruits: 7 }
    ],
    recentOrders: [
      { id: 1001, customer: 'Robert Garcia', date: '2023-07-15', amount: 245, status: 'Completed' },
      { id: 1002, customer: 'Jennifer Taylor', date: '2023-07-14', amount: 180, status: 'Processing' },
      { id: 1003, customer: 'Daniel Brown', date: '2023-07-14', amount: 320, status: 'Completed' },
      { id: 1004, customer: 'Lisa Wilson', date: '2023-07-13', amount: 150, status: 'Shipped' },
      { id: 1005, customer: 'Thomas Moore', date: '2023-07-12', amount: 275, status: 'Completed' }
    ]
  };

  // Chart data
  const salesChartData = {
    labels: timeRange === 'monthly' ? 
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'] :
      timeRange === 'weekly' ?
      ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'] :
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Sales',
        data: dashboardData.salesTrend[timeRange],
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const revenueChartData = {
    labels: dashboardData.revenueSources.labels,
    datasets: [
      {
        label: 'Revenue',
        data: dashboardData.revenueSources.data,
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)'
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MLM Admin Dashboard</h1>
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
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
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
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Total Sales</p>
                    <h3 className="text-2xl font-bold mt-1">${dashboardData.stats.totalSales.toLocaleString()}</h3>
                    <p className="text-green-500 text-sm mt-1">+12% from last month</p>
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
                    <h3 className="text-2xl font-bold mt-1">{dashboardData.stats.totalOrders.toLocaleString()}</h3>
                    <p className="text-green-500 text-sm mt-1">+8% from last month</p>
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
                    <h3 className="text-2xl font-bold mt-1">{dashboardData.stats.newCustomers.toLocaleString()}</h3>
                    <p className="text-green-500 text-sm mt-1">+15% from last month</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FaUsers className="text-blue-600 text-xl" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">${dashboardData.stats.revenue.toLocaleString()}</h3>
                    <p className="text-green-500 text-sm mt-1">+10% from last month</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FaMoneyBillWave className="text-purple-600 text-xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
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
                <div className="h-64">
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
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Revenue Sources</h3>
                <div className="h-64">
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

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold">Recent Orders</h3>
                <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
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
                    {dashboardData.recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
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
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
              <table className="min-w-full divide-y divide-gray-200">
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
                  {dashboardData.recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
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
              <div className="h-96">
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Revenue Breakdown</h3>
                <div className="h-64">
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
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Top Products</h3>
                <div className="space-y-4">
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
                      <p className="font-medium">$12,450</p>
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
                      <p className="font-medium">$9,870</p>
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
                      <p className="font-medium">$7,650</p>
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
                      <p className="font-medium">$5,320</p>
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
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
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recruits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.topPerformers.map((performer, index) => (
                    <tr key={performer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{performer.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          performer.level === 'Diamond' ? 'bg-purple-100 text-purple-800' :
                          performer.level === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {performer.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${performer.sales.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{performer.recruits}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Math.round(performer.sales * 0.1).toLocaleString()}</td>
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
      </main>
    </div>
  );
};

export default AdminDashboard;