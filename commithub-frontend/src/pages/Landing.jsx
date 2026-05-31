import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import Workflow from "../components/landing/Workflow";
import Stats from "../components/landing/Stats";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";

import "../styles/landing.css";

const Landing = () => {

    return (

        <div className="landing-page">

            <Navbar />

            <Hero />

            <Features />

            <Workflow />

            <Stats />

            <CTA />

            <Footer />

        </div>
    );
};

export default Landing;