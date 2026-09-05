const asyncHandler = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Server error";
        return res.status(statusCode).json({ message });
    }
};

export default asyncHandler;