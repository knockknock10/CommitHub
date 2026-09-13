import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("commithub-user");

        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            // Normalize legacy shape { token, user: { _id, userName, ... } }
            // to flat shape { _id, userName, token, ... } so Topbar and
            // other components that read user._id / user.userName work.
            if (parsed.user && parsed.user._id) {
                setUser({ ...parsed.user, token: parsed.token });
            } else {
                setUser(parsed);
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