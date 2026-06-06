/**
 * Terms of Service — PiBazaar
 *
 * Static, self-contained legal page. Linked from the login footer and used as the
 * Terms of Service URL in the Pi Developer Portal app registration.
 */

import { Link } from 'wouter'

const LAST_UPDATED = 'June 6, 2026'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold font-heading text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Welcome to PiBazaar, a decentralized peer-to-peer marketplace for the
            Pi Network community. These Terms of Service ("Terms") govern your use
            of the app. By signing in or using PiBazaar, you agree to these Terms.
          </p>

          <Section title="1. Eligibility">
            <p>
              You must have a valid Pi Network account and sign in through Pi to use
              PiBazaar. You are responsible for keeping your account secure and for
              all activity that happens under it.
            </p>
          </Section>

          <Section title="2. The marketplace">
            <p>
              PiBazaar is a platform that connects buyers and sellers. We are not a
              party to transactions between users. Sellers are responsible for the
              accuracy of their listings and for delivering items; buyers are
              responsible for reviewing listings before purchasing.
            </p>
          </Section>

          <Section title="3. Listings and prohibited items">
            <ul className="list-disc space-y-1 pl-5">
              <li>You may only list items you have the right to sell.</li>
              <li>Listings must be accurate and not misleading.</li>
              <li>
                You may not list illegal items, stolen goods, counterfeit products,
                or anything prohibited by applicable law or the Pi Network policies.
              </li>
            </ul>
          </Section>

          <Section title="4. Payments and fees">
            <p>
              Payments are made in Pi through the Pi Network platform. A service fee
              may be applied to completed sales and is shown before a transaction is
              finalized. You are responsible for any taxes that apply to your
              transactions.
            </p>
          </Section>

          <Section title="5. Transactions and disputes">
            <p>
              Buyers and sellers are expected to communicate honestly and complete
              transactions in good faith. While we may provide tools to help resolve
              disputes, you acknowledge that PiBazaar is not responsible for the
              conduct of other users or the quality of items exchanged.
            </p>
          </Section>

          <Section title="6. User conduct">
            <ul className="list-disc space-y-1 pl-5">
              <li>Do not harass, defraud, or abuse other users.</li>
              <li>Do not attempt to disrupt or misuse the service.</li>
              <li>Do not use the app for any unlawful purpose.</li>
            </ul>
          </Section>

          <Section title="7. Account suspension">
            <p>
              We may suspend or terminate accounts that violate these Terms, harm
              other users, or misuse the platform.
            </p>
          </Section>

          <Section title="8. Disclaimer of warranties">
            <p>
              PiBazaar is provided "as is" without warranties of any kind. We do not
              guarantee that the service will be uninterrupted, error-free, or that
              items listed will meet your expectations.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              To the maximum extent permitted by law, PiBazaar and its operators are
              not liable for any indirect, incidental, or consequential damages
              arising from your use of the app or transactions with other users.
            </p>
          </Section>

          <Section title="10. Changes to these Terms">
            <p>
              We may update these Terms from time to time. When we do, we will revise
              the "Last updated" date above. Continued use of PiBazaar after changes
              means you accept the updated Terms.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              If you have questions about these Terms, please contact us through the
              support channel listed in the app.
            </p>
          </Section>
        </div>

        <footer className="border-t border-border pt-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
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
