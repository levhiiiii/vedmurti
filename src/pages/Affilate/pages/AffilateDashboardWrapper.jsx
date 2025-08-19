import { useUser } from '../../../context/UserContext';
import { Navigate } from 'react-router-dom';
import AffilateDashboard from './AffilateDashboard';
import LeafLoader from '../../../components/Loader';

const AffilateDashboardWrapper = () => {
  const { currentUser, loading } = useUser();

  // Show loader while checking authentication
  if (loading) {
    return (
      <div className="p-4 w-full flex h-screen justify-center items-center text-center">
        <LeafLoader />
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Render the actual dashboard with userId prop
  return <AffilateDashboard userId={currentUser.uid} />;
};

export default AffilateDashboardWrapper;
