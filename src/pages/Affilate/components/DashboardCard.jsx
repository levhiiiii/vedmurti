const DashboardCard = ({ title, value, change, icon: Icon }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
          <Icon size={20} />
        </div>
      </div>
      <div className={`mt-4 text-sm flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}% 
        <span className="text-gray-500 ml-1">vs last month</span>
      </div>
    </div>
  );
};

export default DashboardCard;