import { Alert, Container } from "react-bootstrap";

const ErrorPage = () => {
  return (
    <Container fluid="md">
      <div className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Sorry!</Alert.Heading>
          Something went wrong. Please try re-launching the application.
        </Alert>
      </div>
    </Container>
  );
};
export default ErrorPage;
