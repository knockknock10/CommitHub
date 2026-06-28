import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import Dashboard from "./pages/Dashboard";
import Repositories from "./pages/Repositories";
import RepositoryDetails from "./pages/RepositoryDetails";
import Issues from "./pages/Issues";
import PullRequests from "./pages/PullRequests";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import ProtectedRoute from "./routes/ProtectedRoute";
import CreateRepoModal from "./components/repo/CreateRepoModal";
import RepositoryPage from "./pages/RepositoryPage";
import IssuePage from "./pages/IssuePage";
import ProfilePage from "./pages/ProfilePage";

const App = () => {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Landing />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<SignUp />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/repositories"
                    element={
                        <ProtectedRoute>
                            <Repositories />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/repositories/:repoName"
                    element={
                        <ProtectedRoute>
                            <RepositoryDetails />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/issues"
                    element={
                        <ProtectedRoute>
                            <Issues />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/pull-requests"
                    element={
                        <ProtectedRoute>
                            <PullRequests />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/activity"
                    element={
                        <ProtectedRoute>
                            <Activity />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/new"
                    element={
                        <ProtectedRoute>
                            <CreateRepoModal />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/repo/:id"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/issues/:id"
                    element={
                        <ProtectedRoute>
                            <IssuePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile/:id"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
            </Routes>

        </BrowserRouter>
    );
};

export default App;