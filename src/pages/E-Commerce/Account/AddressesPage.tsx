// pages/AddressesPage.jsx
import { FaRegEdit } from 'react-icons/fa';
import AccountLayout from './components/layout/AccountLayout';

const AddressesPage = () => {
  const addresses = [
    {
      id: 1,
      type: "Home",
      name: "Rahul Sharma",
      address: "123 Green Apartments, MG Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      phone: "+91 98765 43210",
      isDefault: true
    },
    {
      id: 2,
      type: "Work",
      name: "Rahul Sharma",
      address: "45 Tech Park, Outer Ring Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560103",
      phone: "+91 98765 43210",
      isDefault: false
    }
  ];

  return (
    <AccountLayout>
      {/* Saved Addresses Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Saved Addresses</h2>
          <button className="text-green-600 hover:text-green-700 flex items-center">
            <FaRegEdit className="mr-1" /> Add New
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div 
              key={address.id} 
              className={`border rounded-lg p-4 ${address.isDefault ? "border-green-500 bg-green-50" : "border-gray-200"}`}
            >
              <div className="flex justify-between mb-2">
                <span className="font-medium">{address.type}</span>
                {address.isDefault && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="font-medium">{address.name}</p>
              <p className="text-gray-600">{address.address}</p>
              <p className="text-gray-600">{address.city}, {address.state} - {address.pincode}</p>
              <p className="text-gray-600 mt-2">Phone: {address.phone}</p>
              
              <div className="mt-4 flex space-x-3">
                <button className="text-green-600 hover:text-green-700 text-sm">
                  Edit
                </button>
                {!address.isDefault && (
                  <button className="text-green-600 hover:text-green-700 text-sm">
                    Set as Default
                  </button>
                )}
                <button className="text-red-600 hover:text-red-700 text-sm">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AccountLayout>
  );
};

export default AddressesPage;