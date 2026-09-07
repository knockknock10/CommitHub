import { useState, useEffect } from "react";

const useDebounce = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
};

export default useDebounce;
