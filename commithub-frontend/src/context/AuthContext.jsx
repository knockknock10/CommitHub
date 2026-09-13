import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("commithub-user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                // Check token is still valid by attempting to decode it
                if (parsed.token) {
                    const payload = JSON.parse(atob(parsed.token.split(".")[1]));
                    // Token expired?
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        localStorage.removeItem("commithub-user");
                        setLoading(false);
                        return;
                    }
                }
                if (parsed.user && parsed.user._id) {
                    setUser({ ...parsed.user, token: parsed.token });
                } else {
                    setUser(parsed);
                }
            } catch (e) {
                localStorage.removeItem("commithub-user");
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("commithub-user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("commithub-user");
    };

    return (
        <AuthContext.Provider value={{
                user,
                login,
                logout,
                loading
            }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
