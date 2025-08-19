import { useState, useEffect } from 'react';
import { FaRegEdit } from 'react-icons/fa';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../Firebase/firebase';
import { useOutletContext } from 'react-router-dom';

const Addresses = () => {
  const { currentUser, loading } = useOutletContext();
  const user = currentUser?.currentUser;

  if (loading) {
    return <div>Loading user data...</div>;
  }

  if (!user) {
    return <div>No user data available.</div>;
  }

  const [addresses, setAddresses] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState({
    type: '',
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    isDefault: false
  });

  useEffect(() => {
    if (!user || !user.uid) return;
    const fetchAddresses = async () => {
      const q = query(collection(db, "addresses"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedAddresses = [];
      querySnapshot.forEach((doc) => {
        fetchedAddresses.push({ id: doc.id, ...doc.data() });
      });
      setAddresses(fetchedAddresses);
    };
    fetchAddresses();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setNewAddress({
      type: '',
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      isDefault: false
    });
    setEditingAddressId(null);
    setIsAdding(false);
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleEditClick = (address) => {
    setNewAddress({ ...address });
    setEditingAddressId(address.id);
    setIsAdding(true);
  };

  const handleRemoveClick = async (id) => {
    await deleteDoc(doc(db, "addresses", id));
    setAddresses(prev => prev.filter(addr => addr.id !== id));
  };

  const handleSetDefault = async (id) => {
    // Update all addresses to isDefault false
    const batchUpdates = addresses.map(async (addr) => {
      const addrRef = doc(db, "addresses", addr.id);
      await updateDoc(addrRef, { isDefault: addr.id === id });
    });
    await Promise.all(batchUpdates);
    setAddresses(prev => prev.map(addr => ({ ...addr, isDefault: addr.id === id })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting address with user:', user);
    console.log('user.uid:', user ? user.uid : 'undefined');
    if (!user || !user.uid) {
      alert('User not logged in or user ID missing. Cannot save address.');
      return;
    }
    if (editingAddressId) {
      // Update existing address
      const addrRef = doc(db, "addresses", editingAddressId);
      await updateDoc(addrRef, { ...newAddress });
      setAddresses(prev => prev.map(addr => addr.id === editingAddressId ? { ...newAddress, id: editingAddressId } : addr));
    } else {
      // Add new address
      const docRef = await addDoc(collection(db, "addresses"), { ...newAddress, userId: user.uid });
      setAddresses(prev => [...prev, { ...newAddress, id: docRef.id }]);
    }
    resetForm();
  };

  return (
    <>
      {loading ? (
        <div>Loading user data...</div>
      ) : !user ? (
        <div>No user data available.</div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Saved Addresses</h2>
            <button onClick={handleAddNewClick} className="text-green-600 hover:text-green-700 flex items-center">
              <FaRegEdit className="mr-1" /> Add New
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-6 border p-4 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="type" value={newAddress.type} onChange={handleInputChange} placeholder="Type (Home, Work)" required className="border p-2 rounded" />
                <input name="name" value={newAddress.name} onChange={handleInputChange} placeholder="Name" required className="border p-2 rounded" />
                <input name="address" value={newAddress.address} onChange={handleInputChange} placeholder="Address" required className="border p-2 rounded" />
                <input name="city" value={newAddress.city} onChange={handleInputChange} placeholder="City" required className="border p-2 rounded" />
                <input name="state" value={newAddress.state} onChange={handleInputChange} placeholder="State" required className="border p-2 rounded" />
                <input name="pincode" value={newAddress.pincode} onChange={handleInputChange} placeholder="Pincode" required className="border p-2 rounded" />
                <input name="phone" value={newAddress.phone} onChange={handleInputChange} placeholder="Phone" required className="border p-2 rounded" />
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={newAddress.isDefault} onChange={e => setNewAddress(prev => ({ ...prev, isDefault: e.target.checked }))} />
                  <span>Set as Default</span>
                </label>
              </div>
              <div className="mt-4 flex space-x-4">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  {editingAddressId ? 'Update Address' : 'Add Address'}
                </button>
                <button type="button" onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          )}

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
                  <button onClick={() => handleEditClick(address)} className="text-green-600 hover:text-green-700 text-sm">
                    Edit
                  </button>
                  {!address.isDefault && (
                    <button onClick={() => handleSetDefault(address.id)} className="text-green-600 hover:text-green-700 text-sm">
                      Set as Default
                    </button>
                  )}
                  <button onClick={() => handleRemoveClick(address.id)} className="text-red-600 hover:text-red-700 text-sm">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Addresses;
