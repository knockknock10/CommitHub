import { useState } from "react";

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "How does CommitHub differ from other version control tools?",
            answer: "CommitHub integrates AI-powered merge analysis and high-fidelity history tracking, reducing the time spent on conflict resolution by up to 40%."
        },
        {
            question: "Can I migrate my existing repositories?",
            answer: "Yes! We provide one-click migration tools for Git-based repositories, ensuring all your history, branches, and tags are preserved perfectly."
        },
        {
            question: "Is my private code actually secure?",
            answer: "Absolutely. We use AES-256 encryption at rest and TLS 1.3 in transit. Your private repositories are isolated and never used for training without explicit consent."
        },
        {
            question: "Do you offer student or open-source discounts?",
            answer: "Yes, we have a robust Student Developer Pack and free plans for verified open-source projects to support the community."
        }
    ];

    return (
        <section className="landing-faq" id="faq">
            <div className="faq-header">
                <h2>Frequently Asked Questions</h2>
                <p>Everything you need to know about getting started.</p>
            </div>

            <div className="faq-list">
                {faqs.map((faq, index) => (
                    <div className={`faq-item ${openIndex === index ? 'open' : ''}`} key={index}>
                        <button className="faq-question" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
                            {faq.question}
                            <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
                        </button>
                        <div className="faq-answer">
                            <p>{faq.answer}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQ;
