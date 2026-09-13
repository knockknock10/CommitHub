const Stats = () => {
    const stats = [
        { value: "10k+", label: "Commits tracked" },
        { value: "2.4k", label: "Repositories" },
        { value: "800+", label: "Developers" },
        { value: "1.2k", label: "Pull requests" }
    ];

    return (
        <section className="landing-stats" id="platform">
            <div className="landing-stats-grid">
                {stats.map((stat, index) => (
                    <div className="landing-stat" key={index}>
                        <div className="landing-stat-value">{stat.value}</div>
                        <div className="landing-stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Stats;