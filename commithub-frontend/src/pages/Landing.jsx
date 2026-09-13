import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import Workflow from "../components/landing/Workflow";
import RepoPreview from "../components/landing/RepoPreview";
import Collaborate from "../components/landing/Collaborate";
import Trust from "../components/landing/Trust";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";

const Landing = () => {
    return (
        <div className="ch-landing">
            <Navbar />
            <Hero />
            <Features />
            <Workflow />
            <RepoPreview />
            <Collaborate />
            <Trust />
            <CTA />
            <Footer />
        </div>
    );
};

export default Landing;
