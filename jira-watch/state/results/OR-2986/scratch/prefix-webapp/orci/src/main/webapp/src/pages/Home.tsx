import { Container } from "react-bootstrap";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import React from "react";
import { isLoggedIn } from "../types/User";
import { QuickPatientLauncher } from "../components/Admin/QuickPatientLauncher";

const Home = () => {
  const auth = useAuth();
  return (
    <main role="main">
      <Container>
        <Header />
        {isLoggedIn(auth?.user) && (
          <>
            <div>Welcome, {auth.user.name}</div>
            <hr />
            <QuickPatientLauncher />
          </>
        )}
        <Footer />
      </Container>
    </main>
  );
};
export default Home;
