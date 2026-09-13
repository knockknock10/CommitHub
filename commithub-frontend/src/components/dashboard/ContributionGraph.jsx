const ContributionGraph = ({ activities = [] }) => {
    // Generate 52 weeks * 7 days = 364 squares
    const squares = Array.from({ length: 364 });

    // Deterministic pseudo-levels seeded by real activity volume
    const seed = activities.length || 0;
    const data = squares.map((_, i) => ((i * 31 + seed) % 5));

    return (
        <div className="contribution-graph-wrapper">
            <div className="graph-header">
                <span className="graph-title">Contribution activity</span>
            </div>
            <div className="contribution-graph">
                {data.map((level, i) => (
                    <div key={i} className={`graph-square level-${level}`} title={`Contributions: ${level}`} />
                ))}
            </div>
            <div className="graph-footer">
                <div className="graph-legend">
                    <span className="legend-label">Less</span>
                    <div className="legend-squares">
                        <div className="legend-square level-0" />
                        <div className="legend-square level-1" />
                        <div className="legend-square level-2" />
                        <div className="legend-square level-3" />
                        <div className="legend-square level-4" />
                    </div>
                    <span className="legend-label">More</span>
                </div>
            </div>
        </div>
    );
};

export default ContributionGraph;
