import ProtectedRoute from '../components/ProtectedRoute';

const Index = () => {
  return (
    <ProtectedRoute>
      <div>
        <h1>Bem-vindo ao sistema!</h1>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
