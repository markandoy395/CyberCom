import { useState } from "react";
import { BiChevronDown } from "../../../utils/icons";
import "./HelpSupport.css";

export const HelpSupport = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "How do I solve a challenge?",
      answer:
        "Click on any challenge from the main page. Read the description carefully, analyze the provided files or information, and submit your answer. You can view hints if you get stuck!",
    },
    {
      id: 2,
      question: "What are points and how do I earn them?",
      answer:
        "Each challenge has a point value based on its difficulty. Easy challenges give 100 points, Medium give 200, and Hard challenges give 300 points. You earn points when you solve a challenge correctly.",
    },
    {
      id: 3,
      question: "How does the leaderboard work?",
      answer:
        "The leaderboard ranks users by total points earned. Your ranking updates in real-time as you solve challenges. You can hide your profile from the leaderboard in Settings.",
    },
    {
      id: 4,
      question: "Can I reset my progress?",
      answer:
        "Currently, progress cannot be reset. If you need to start fresh, please contact our support team at support@cybercom.com with your request.",
    },
    {
      id: 5,
      question: "What if I find a bug in a challenge?",
      answer:
        "Bug reports are valuable! Please report issues through the 'Report Issue' button on the challenge page with details and screenshots.",
    },
    {
      id: 6,
      question: "How can I improve my solving speed?",
      answer:
        "Practice regularly and start with easier challenges to build fundamentals. Study the writeups of solved challenges to learn new techniques and approaches.",
    },
  ];

  const contactMethods = [
    {
      icon: "📧",
      title: "Email Support",
      description: "support@cybercom.com",
      details: "Response time: 24-48 hours",
    },
    {
      icon: "💬",
      title: "Discord Community",
      description: "Join our Discord server",
      details: "Get help from the community",
    },
    {
      icon: "📚",
      title: "Documentation",
      description: "Read our guides and tutorials",
      details: "Learn best practices and tips",
    },
  ];

  return (
    <div className="help-container">
      <div className="help-header">
        <h1>❓ Help & Support</h1>
        <p>Find answers to common questions and get assistance</p>
      </div>

      <div className="help-content">
        {/* Contact Methods */}
        <section className="contact-section">
          <h2>Get In Touch</h2>
          <div className="contact-grid">
            {contactMethods.map((method, idx) => (
              <div key={idx} className="contact-card">
                <div className="contact-icon">{method.icon}</div>
                <h3>{method.title}</h3>
                <p className="contact-desc">{method.description}</p>
                <p className="contact-details">{method.details}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map((faq) => (
              <div key={faq.id} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === faq.id ? null : faq.id)
                  }
                >
                  <span>{faq.question}</span>
                  <BiChevronDown
                    className={`faq-chevron ${
                      expandedFaq === faq.id ? "open" : ""
                    }`}
                  />
                </button>
                {expandedFaq === faq.id && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Quick Tips */}
        <section className="tips-section">
          <h2>Quick Tips</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-number">1</div>
              <h4>Start with Easy</h4>
              <p>Begin with easy challenges to understand the platform mechanics</p>
            </div>
            <div className="tip-card">
              <div className="tip-number">2</div>
              <h4>Read Carefully</h4>
              <p>Always read the full challenge description for important clues</p>
            </div>
            <div className="tip-card">
              <div className="tip-number">3</div>
              <h4>Use Hints Wisely</h4>
              <p>Try solving first, use hints when stuck - it helps learning</p>
            </div>
            <div className="tip-card">
              <div className="tip-number">4</div>
              <h4>Join Community</h4>
              <p>Learn from others and discuss strategies in our Discord</p>
            </div>
          </div>
        </section>
      </div>

      <div className="help-footer">
        <p>Can't find what you're looking for?</p>
        <a href="mailto:support@cybercom.com" className="btn btn-primary">
          Contact Support
        </a>
      </div>
    </div>
  );
};
