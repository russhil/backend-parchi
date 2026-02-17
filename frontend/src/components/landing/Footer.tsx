export default function Footer() {
    return (
        <footer className="landing-footer">
            <div className="landing-footer-inner">
                <div className="landing-footer-brand">
                    <span className="landing-footer-brand-name">parchi</span>
                    <span className="landing-footer-dot"></span>
                </div>
                <div className="landing-footer-links">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#team">Team</a>
                    <a href="mailto:hello@parchi.tech">Contact</a>
                </div>
                <p className="landing-footer-copy">© {new Date().getFullYear()} Parchi AI. Built for Indian clinics.</p>
            </div>
        </footer>
    );
}
