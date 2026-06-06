/**
 * Privacy Policy — PiBazaar
 *
 * Static, self-contained legal page. Linked from the login footer and used as the
 * Privacy Policy URL in the Pi Developer Portal app registration.
 */

import { Link } from 'wouter'

const LAST_UPDATED = 'June 6, 2026'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold font-heading text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            PiBazaar ("we", "us", or "the app") is a decentralized peer-to-peer
            marketplace for the Pi Network community. This Privacy Policy explains
            what information we collect, how we use it, and the choices you have.
            By using PiBazaar you agree to the practices described here.
          </p>

          <Section title="1. Information we collect">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Pi account information.</strong> When you
                sign in with Pi, we receive your Pi username and a Pi-issued
                identifier through the Pi SDK. We do not receive your Pi wallet
                passphrase or private keys.
              </li>
              <li>
                <strong className="text-foreground">Marketplace activity.</strong> Listings you
                create, messages you send, orders, and transaction history needed
                to operate the marketplace.
              </li>
              <li>
                <strong className="text-foreground">Profile details you provide.</strong> Optional
                information such as a display name, location, or shipping details
                you choose to add.
              </li>
              <li>
                <strong className="text-foreground">Technical data.</strong> Basic device and
                usage information used to keep the service secure and working.
              </li>
            </ul>
          </Section>

          <Section title="2. How we use your information">
            <ul className="list-disc space-y-1 pl-5">
              <li>To create and authenticate your account via Pi.</li>
              <li>To publish your listings and connect buyers and sellers.</li>
              <li>To process orders and Pi payments through the Pi platform.</li>
              <li>To enable messaging between users.</li>
              <li>To prevent fraud, abuse, and to keep the marketplace safe.</li>
            </ul>
          </Section>

          <Section title="3. Pi Network and payments">
            <p>
              PiBazaar uses the Pi SDK for sign-in and processes payments through
              the Pi Network platform. Your use of Pi is also governed by the Pi
              Network terms and privacy policy. Payment authorization and transfer
              of Pi happen through Pi's systems; we receive the transaction details
              needed to fulfill your order.
            </p>
          </Section>

          <Section title="4. Sharing your information">
            <p>
              We do not sell your personal information. Certain details are shared
              only as needed to operate the marketplace — for example, a buyer and
              seller can see each other's username and the information required to
              complete a transaction. We may disclose information if required by law
              or to protect the rights and safety of our users.
            </p>
          </Section>

          <Section title="5. Data retention">
            <p>
              We keep your information for as long as your account is active or as
              needed to provide the service, resolve disputes, and comply with legal
              obligations.
            </p>
          </Section>

          <Section title="6. Your choices">
            <ul className="list-disc space-y-1 pl-5">
              <li>You can edit your profile details at any time in Settings.</li>
              <li>You can request deletion of your account and associated data.</li>
              <li>You can stop using the app at any time.</li>
            </ul>
          </Section>

          <Section title="7. Security">
            <p>
              We take reasonable measures to protect your information. No method of
              transmission or storage is completely secure, so we cannot guarantee
              absolute security.
            </p>
          </Section>

          <Section title="8. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we
              will revise the "Last updated" date above. Continued use of PiBazaar
              after changes means you accept the updated policy.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              If you have questions about this Privacy Policy, please contact us
              through the support channel listed in the app.
            </p>
          </Section>
        </div>

        <footer className="border-t border-border pt-4 text-sm">
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          <span className="mx-2 text-muted-foreground">·</span>
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </footer>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}
