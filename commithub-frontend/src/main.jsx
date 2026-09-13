import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import {
    AuthProvider
} from "./context/AuthContext.jsx";
import {
    SocketProvider
} from "./context/SocketContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(
    document.getElementById("root")
).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthProvider>
                <SocketProvider>
                    <App />
                </SocketProvider>
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>
);