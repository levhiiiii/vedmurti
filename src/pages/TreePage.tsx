import { useState, useEffect } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

// User data
const Users = [
  {
    upline: 5,
    id: 1,
    name: "Sarah Johnson",
    level: "Diamond",
    joinDate: "2025-05-05T18:42:45.232Z",
    sales: "$125,000",
  },
  {
    upline: 5,
    id: 2,
    name: "Michael Chen",
    level: "Gold",
    joinDate: "2025-04-05T18:42:45.232Z",
    sales: "$82,000",
  },
  {
    upline: 1,
    id: 3,
    name: "Emily Rodriguez",
    level: "Silver",
    joinDate: "2025-03-05T18:42:45.232Z",
    sales: "$45,000",
  },
  {
    upline: 1,
    id: 4,
    name: "David Kim",
    level: "Silver",
    joinDate: "2025-02-05T18:42:45.232Z",
    sales: "$38,000",
  },
  {
    // upline: 0,
    id: 5,
    name: "Jessica Williams",
    level: "Diamond",
    joinDate: "2025-01-05T18:42:45.232Z",
    sales: "$150,000",
  },
  {
    upline: 2,
    id: 6,
    name: "Robert Garcia",
    level: "Gold",
    joinDate: "2025-07-05T18:42:45.232Z",
    sales: "$68,000",
  },
  {
    upline: 2,
    id: 7,
    name: "Robert Garcia",
    level: "Gold",
    joinDate: "2025-08-05T18:42:45.232Z",
    sales: "$68,000",
  },

];

// Format join date to "Month Year" format
const formatJoinDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Member component
const Member = ({ member, isRoot = false }: { member: any; isRoot?: boolean }) => {
  const levelColors = {
    Diamond: {
      bg: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900',
      border: 'border-purple-400 dark:border-purple-600',
      text: 'text-purple-700 dark:text-purple-200',
      badge: 'bg-purple-500 dark:bg-purple-600'
    },
    Gold: {
      bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900',
      border: 'border-yellow-400 dark:border-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-200',
      badge: 'bg-yellow-500 dark:bg-yellow-600'
    },
    Silver: {
      bg: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800',
      border: 'border-gray-400 dark:border-gray-600',
      text: 'text-gray-700 dark:text-gray-200',
      badge: 'bg-gray-500 dark:bg-gray-600'
    }
  };

  const colors = levelColors[member.level as keyof typeof levelColors] || levelColors.Silver;

  return (
    <div className="flex flex-col items-center">
      {/* Member card */}
      <div className={`p-4 rounded-xl shadow-lg w-48 text-center relative z-10 transition-all duration-200 hover:scale-105 ${colors.bg} border ${colors.border}`}>
        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${colors.badge}`}>
          {member.id}
        </div>
        
        <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{member.name}</h3>
        <p className={`text-xs font-semibold mb-1 ${colors.text}`}>
          {member.level}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300">Joined: {member.joinDate}</p>
        <p className="text-xs font-medium text-green-700 dark:text-green-400 mt-1">Sales: {member.sales}</p>
      </div>
      
      {/* Children container */}
      {member.children.length > 0 && (
        <div className="relative mt-4">
          {/* Vertical connector from parent to children */}
          {!isRoot && (
            <div className="absolute left-1/2 top-0 h-4 w-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"></div>
          )}
          
          {/* Children row */}
          <div className="flex justify-center pt-6 relative">
            {/* Horizontal connector line */}
            <div className="absolute left-0 right-0 top-0 h-0.5 bg-gray-300 dark:bg-gray-600" 
                 style={{ 
                   left: `${100/(member.children.length*2)}%`, 
                   right: `${100/(member.children.length*2)}%` 
                 }}>
            </div>
            
            {/* Render each child */}
            {member.children.map((child: any) => (
              <div key={child.id} className="relative px-4">
                {/* Vertical connector to child */}
                <div className="absolute left-1/2 top-0 h-6 w-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"></div>
                <Member member={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Function to build the tree structure from flat array
const buildTree = (users: any[]) => {
  // Create a map for quick lookup
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.id, { 
      ...user, 
      children: [],
      joinDate: formatJoinDate(user.joinDate)
    });
  });

  // Build the tree
  const tree: any[] = [];
  userMap.forEach(user => {
    if (user.upline === undefined) {
      // This is the root user (no upline)
      tree.push(user);
    } else {
      // Find the upline and add this user as a child
      const upline = userMap.get(user.upline);
      if (upline) {
        upline.children.push(user);
      }
    }
  });

  // Sort children by joinDate (newest first)
  const sortChildren = (node: any) => {
    node.children.sort((a: any, b: any) => 
      new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
    );
    node.children.forEach(sortChildren);
  };

  tree.forEach(sortChildren);
  
  return tree.length > 0 ? tree[0] : null;
};

const TreePage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [treeData, setTreeData] = useState<any>(null);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    // Build the tree from Users data
    const builtTree = buildTree(Users);
    setTreeData(builtTree);
  }, []);

  useEffect(() => {
    // Apply theme class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (!treeData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 md:p-8 transition-colors duration-300 flex items-center justify-center">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Building your network tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 md:p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">MLM Network Tree</h1>
            <p className="text-gray-600 dark:text-gray-300">Visual representation of your downline organization</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            {darkMode ? (
              <>
                <FaSun className="inline" /> Light Mode
              </>
            ) : (
              <>
                <FaMoon className="inline" /> Dark Mode
              </>
            )}
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md p-6 overflow-x-auto transition-colors duration-300">
          <div className="flex justify-center">
            <Member member={treeData} isRoot={true} />
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
          <p>Hover over cards to enlarge. Colors indicate membership level.</p>
          <div className="flex justify-center space-x-4 mt-2">
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-purple-400 dark:bg-purple-600 mr-1"></span>
              Diamond
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-600 mr-1"></span>
              Gold
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600 mr-1"></span>
              Silver
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreePage;