import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — Parchi AI',
    description: 'Terms of Service for Parchi AI, the AI-powered medical record system.',
};

export default function TermsOfServicePage() {
    return (
        <div
            style={{
                maxWidth: 800,
                margin: '0 auto',
                padding: '48px 24px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#1a1a1a',
                lineHeight: 1.7,
            }}
        >
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
            <p style={{ color: '#666', marginBottom: 32, fontSize: 14 }}>
                Last updated: February 15, 2026
            </p>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>1. Acceptance of Terms</h2>
                <p>
                    By accessing or using the Parchi AI platform (&quot;Service&quot;), you agree to be bound
                    by these Terms of Service. If you do not agree to these terms, please do not use our
                    Service. These terms apply to all users, including healthcare providers and clinic
                    administrators.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    2. Description of Service
                </h2>
                <p>
                    Parchi AI provides an AI-powered medical records platform designed for healthcare
                    providers. Our Service includes:
                </p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>AI-generated pre-consult summaries and patient briefs.</li>
                    <li>Digital patient record management.</li>
                    <li>Document upload, storage, and OCR-based digitisation.</li>
                    <li>Appointment scheduling and management tools.</li>
                    <li>AI-assisted clinical decision support features.</li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    3. User Accounts &amp; Responsibilities
                </h2>
                <p>
                    You are responsible for maintaining the confidentiality of your account credentials and for
                    all activities that occur under your account. You agree to:
                </p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>Provide accurate and complete registration information.</li>
                    <li>Keep your login credentials secure and confidential.</li>
                    <li>Notify us immediately of any unauthorised use of your account.</li>
                    <li>
                        Use the Service only for lawful purposes and in compliance with all applicable healthcare
                        regulations.
                    </li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    4. Medical Disclaimer
                </h2>
                <p>
                    Parchi AI is a clinical support tool and does <strong>not</strong> provide medical advice,
                    diagnosis, or treatment. All AI-generated summaries, suggestions, and insights are intended
                    to assist qualified healthcare professionals and should not be used as a substitute for
                    professional medical judgement. The treating physician remains solely responsible for all
                    clinical decisions.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    5. Intellectual Property
                </h2>
                <p>
                    All content, features, and functionality of the Service — including but not limited to
                    software, text, graphics, logos, and design — are the exclusive property of Parchi AI and
                    are protected by intellectual property laws. You may not copy, modify, distribute, or
                    reverse-engineer any part of the Service without our prior written consent.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>6. Data &amp; Privacy</h2>
                <p>
                    Your use of the Service is also governed by our{' '}
                    <a href="/privacy-policy" style={{ color: '#2563eb' }}>
                        Privacy Policy
                    </a>
                    . By using the Service, you consent to the collection and use of your information as
                    described therein. You retain ownership of all patient data you enter into the platform.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>7. Prohibited Uses</h2>
                <p>You agree not to:</p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>Use the Service for any unlawful purpose.</li>
                    <li>Attempt to gain unauthorised access to any part of the Service.</li>
                    <li>
                        Upload malicious code, viruses, or any content that could harm the Service or other
                        users.
                    </li>
                    <li>Share patient data with unauthorised parties through the platform.</li>
                    <li>Use the Service in any way that violates applicable data protection laws.</li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    8. Limitation of Liability
                </h2>
                <p>
                    To the fullest extent permitted by law, Parchi AI shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages arising out of or related to your
                    use of the Service. Our total liability shall not exceed the amount paid by you, if any,
                    for accessing the Service during the twelve months preceding the claim.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>9. Termination</h2>
                <p>
                    We reserve the right to suspend or terminate your access to the Service at any time, with
                    or without cause, and with or without notice. Upon termination, your right to use the
                    Service will immediately cease. You may request export of your data prior to account
                    closure.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    10. Changes to These Terms
                </h2>
                <p>
                    We may revise these Terms of Service at any time. Material changes will be communicated via
                    the platform or by email. Your continued use of the Service after changes are posted
                    constitutes your acceptance of the revised terms.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>11. Governing Law</h2>
                <p>
                    These Terms shall be governed by and construed in accordance with the laws of India. Any
                    disputes arising under these terms shall be subject to the exclusive jurisdiction of the
                    courts in India.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>12. Contact Us</h2>
                <p>
                    If you have any questions about these Terms of Service, please contact us at{' '}
                    <a href="mailto:support@parchi.co.in" style={{ color: '#2563eb' }}>
                        support@parchi.co.in
                    </a>
                    .
                </p>
            </section>
        </div>
    );
}
