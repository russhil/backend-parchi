import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — Parchi AI',
    description: 'Privacy Policy for Parchi AI, the AI-powered medical record system.',
};

export default function PrivacyPolicyPage() {
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
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
            <p style={{ color: '#666', marginBottom: 32, fontSize: 14 }}>
                Last updated: February 15, 2026
            </p>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>1. Introduction</h2>
                <p>
                    Parchi AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your
                    privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
                    information when you use our AI-powered medical records platform.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    2. Information We Collect
                </h2>
                <p>We may collect the following types of information:</p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>
                        <strong>Personal Information:</strong> Name, email address, phone number, and other
                        contact details provided during registration.
                    </li>
                    <li>
                        <strong>Health Information:</strong> Patient medical records, prescriptions, appointment
                        details, and related health data entered into the platform by authorised healthcare
                        providers.
                    </li>
                    <li>
                        <strong>Usage Data:</strong> Information about how you interact with our platform,
                        including access times, pages viewed, and features used.
                    </li>
                    <li>
                        <strong>Device Information:</strong> Browser type, IP address, and operating system.
                    </li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    3. How We Use Your Information
                </h2>
                <p>We use the collected information to:</p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>Provide, operate, and maintain our platform.</li>
                    <li>Generate AI-powered medical summaries and insights for healthcare providers.</li>
                    <li>Improve and personalise user experience.</li>
                    <li>Communicate with you about updates, support, and service-related notices.</li>
                    <li>Ensure compliance with applicable laws and regulations.</li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>4. Data Security</h2>
                <p>
                    We implement appropriate technical and organisational security measures to protect your
                    personal and health information. All data is encrypted in transit and at rest. Access to
                    patient data is strictly limited to authorised healthcare providers.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>5. Data Sharing</h2>
                <p>
                    We do not sell your personal information. We may share information only in the following
                    circumstances:
                </p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>With your explicit consent.</li>
                    <li>To comply with legal obligations or valid legal processes.</li>
                    <li>
                        With trusted service providers who assist us in operating our platform, subject to strict
                        confidentiality agreements.
                    </li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>6. Data Retention</h2>
                <p>
                    We retain your data for as long as your account is active or as needed to provide our
                    services. Health records are retained in accordance with applicable medical record
                    retention laws. You may request deletion of your account and associated data at any time.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul style={{ paddingLeft: 24, marginTop: 8 }}>
                    <li>Access the personal data we hold about you.</li>
                    <li>Request correction of inaccurate data.</li>
                    <li>Request deletion of your data, subject to legal requirements.</li>
                    <li>Withdraw consent at any time where processing is based on consent.</li>
                </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
                    8. Changes to This Policy
                </h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify you of any material
                    changes by posting the updated policy on this page with a revised &quot;Last updated&quot;
                    date.
                </p>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>9. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us at{' '}
                    <a href="mailto:support@parchi.co.in" style={{ color: '#2563eb' }}>
                        support@parchi.co.in
                    </a>
                    .
                </p>
            </section>
        </div>
    );
}
