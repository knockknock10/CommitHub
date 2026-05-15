import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Landing from "./pages/Landing";

import Login from
"./components/auth/Login";

import SignUp from
"./components/auth/SignUp";

import Dashboard from
"./pages/Dashboard";

import ProtectedRoute from
"./routes/ProtectedRoute";

const App = () => {

    return (

        <BrowserRouter>

            <Routes>

                {/* public */}

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

                {/* protected */}

                <Route
                    path="/dashboard"
                    element={

                        <ProtectedRoute>

                            <Dashboard />

                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
};

export default App;