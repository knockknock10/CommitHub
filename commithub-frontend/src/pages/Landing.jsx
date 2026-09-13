import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import CLIWorkflow from "../components/landing/CLIWorkflow";
import RepositoryPreview from "../components/landing/RepositoryPreview";
import Collaboration from "../components/landing/Collaboration";
import Discovery from "../components/landing/Discovery";
import FinalCTA from "../components/landing/FinalCTA";
import Footer from "../components/landing/Footer";

import "../styles/landing.css";

const Landing = () => {
    return (
        <div className="landing-page">
            <Navbar />
            <Hero />
            <Features />
            <CLIWorkflow />
            <RepositoryPreview />
            <Collaboration />
            <Discovery />
            <FinalCTA />
            <Footer />
        </div>
    );
};

export default Landing;