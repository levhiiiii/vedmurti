import { FaRegEdit } from 'react-icons/fa';

const Profile = () => {
  const user = {
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    joinDate: "January 15, 2022"
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Profile Information</h2>
        <button className="text-green-600 hover:text-green-700 flex items-center">
          <FaRegEdit className="mr-1" /> Edit
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-700 mb-1">Full Name</label>
          <div className="bg-green-50 p-3 rounded-lg">{user.name}</div>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Email</label>
          <div className="bg-green-50 p-3 rounded-lg">{user.email}</div>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Phone Number</label>
          <div className="bg-green-50 p-3 rounded-lg">{user.phone}</div>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Password</label>
          <div className="bg-green-50 p-3 rounded-lg">••••••••</div>
        </div>
      </div>
      
      <div className="mt-6">
        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Profile;