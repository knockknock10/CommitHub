import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import Dashboard from "./pages/Dashboard";
import Repositories from "./pages/Repositories";
import Issues from "./pages/Issues";
import PullRequests from "./pages/PullRequests";
import Activity from "./pages/Activity";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ProtectedRoute from "./routes/ProtectedRoute";
import CreateRepoModal from "./components/repo/CreateRepoModal";
import RepositoryPage from "./pages/RepositoryPage";
import IssuePage from "./pages/IssuePage";
import SearchResults from "./pages/SearchResults";
import ProfilePage from "./pages/ProfilePage";
import OrganizationPage from "./pages/OrganizationPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

/* The root "/" is the platform home: the community/exploration feed for
   signed-in users, and the public marketing page for visitors. */
const HomeGate = () => {
    const { user } = useAuth();

    if (!user) {
        return <Landing />;
    }

    return <Home />;
};

const App = () => {

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/"
                        element={<HomeGate />}
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
                    path="/workspaces"
                    element={
                        <ProtectedRoute>
                            <Repositories />
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
                    path="/tickets"
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
                    path="/merge-requests"
                    element={
                        <ProtectedRoute>
                            <PullRequests />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/pulls"
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
                    path="/notifications"
                    element={
                        <ProtectedRoute>
                            <Notifications />
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
                    path="/repository/:id"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workspace/:id"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/repository/:id/pull-request/:number"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/repository/:id/pull-requests/:number"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workspace/:id/merge-request/:number"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workspace/:id/merge-requests/:number"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workspace/:id/pull-request/:number"
                    element={
                        <ProtectedRoute>
                            <RepositoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workspace/:id/pullrequest/:number"
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
                    path="/tickets/:id"
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
                <Route
                    path="/organization/:slug"
                    element={
                        <ProtectedRoute>
                            <OrganizationPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/organizations/:slug"
                    element={
                        <ProtectedRoute>
                            <OrganizationPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/team/:slug"
                    element={
                        <ProtectedRoute>
                            <OrganizationPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/search-results"
                    element={
                        <ProtectedRoute>
                            <SearchResults />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    </ErrorBoundary>
    );
};

export default App;