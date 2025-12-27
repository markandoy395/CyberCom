import React from "react";

const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-color mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-h4 text-accent-primary mb-4">CyberCom</h3>
            <p className="text-body text-muted">
              Advanced cybersecurity training platform for ethical hackers and
              security professionals.
            </p>
          </div>

          <div>
            <h4 className="text-h4 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/challenges"
                  className="text-body text-secondary hover:text-accent-primary transition-colors"
                >
                  Challenges
                </a>
              </li>
              <li>
                <a
                  href="/leaderboard"
                  className="text-body text-secondary hover:text-accent-primary transition-colors"
                >
                  Leaderboard
                </a>
              </li>
              <li>
                <a
                  href="/profile"
                  className="text-body text-secondary hover:text-accent-primary transition-colors"
                >
                  Profile
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-h4 mb-4">Contact</h4>
            <p className="text-body text-muted">
              Questions? Reach out to our support team.
            </p>
            <p className="text-body text-accent-primary mt-2">
              support@cybercom.com
            </p>
          </div>
        </div>

        <div className="border-t border-color mt-8 pt-6 text-center">
          <p className="text-body text-muted">
            &copy; 2025 CyberCom. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
