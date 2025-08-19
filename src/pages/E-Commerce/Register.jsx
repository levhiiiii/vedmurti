// pages/Register.jsx
import { FaLeaf } from 'react-icons/fa';
import { RegistrationForm } from '../../components/registration/RegistrationForm';

export const Register = () => {
  return (
    <div className="min-h-screen bg-green-50 pt-20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <FaLeaf className="text-5xl text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Create Your Vedamurti Account</h1>
          <p className="mt-2 text-gray-600">
            Join us to explore the benefits of Noni Juice and manage your orders
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-white w-2/1 shadow-md rounded-lg overflow-hidden">
            <div className="p-6 sm:p-8">
              <RegistrationForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;