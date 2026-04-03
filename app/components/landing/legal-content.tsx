import * as React from "react";

export function PrivacyPolicyContent() {
  return (
    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6 text-muted-foreground pb-8">
      <p><strong>Effective Date:</strong> January 1, 2026</p>

      <p>
        At VentraPOS, your privacy is our priority. This Privacy Policy outlines the types of information we collect, how we use it, and the safeguards we have in place to protect your business data and your customers' data. By using the VentraPOS application, you consent to the data practices described in this statement.
      </p>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">1. Information We Collect</h3>
        <p>We collect several types of data to provide and improve our Services:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Business & Account Information:</strong> Name, email, business name, location, and billing details required to maintain your subscription.</li>
          <li><strong>Transaction & Operational Data:</strong> Inventory counts, sales receipts, customer profiles created at your POS, shift timings, and transaction histories.</li>
          <li><strong>Technical Data:</strong> IP addresses, browser types, device identifiers, and generic telemetry data to ensure application performance.</li>
        </ul>

        <h3 className="text-xl font-bold text-foreground">2. How We Use Information</h3>
        <p>VentraPOS uses the collected data to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Operate and maintain the core functions of your point-of-sale system.</li>
          <li>Process transactions securely and send automated receipts.</li>
          <li>Generate business analytics and financial reporting tailored to your branches.</li>
          <li>Provide customer support, address technical issues, and improve our interface.</li>
        </ul>

        <h3 className="text-xl font-bold text-foreground">3. Data Security & Storage</h3>
        <p>
          We implement enterprise-grade security measures. All transaction and operational data is encrypted both in transit (via TLS/SSL) and at rest. Access to backend databases is strictly limited to authorized engineering personnel using multi-factor authentication. While we strive to use commercially acceptable means to protect your personal data, no method of transmission over the internet is 100% secure.
        </p>

        <h3 className="text-xl font-bold text-foreground">4. Third-Party Sharing</h3>
        <p>
          VentraPOS does not sell or rent your business data. We may share necessary transaction metadata only with trusted partners (such as payment processors like Paystack) strictly to facilitate requested payouts or integrations. These partners are legally bound to confidentiality.
        </p>

        <h3 className="text-xl font-bold text-foreground">5. Your Data Rights</h3>
        <p>
          As an active user, you can request an export of your inventory and sales data at any moment through the dashboard. You have the right to request the deletion or anonymization of your merchant account, subject to standard financial compliance retention laws governing transaction records.
        </p>

        <h3 className="text-xl font-bold text-foreground">6. Modifications</h3>
        <p>
          We may update this Privacy Policy periodically. We will notify you of any major changes by posting the new document within your dashboard and sending an email to the primary account holder.
        </p>

        <p className="pt-4 text-sm">
          If you have questions about our Privacy Policy, please contact our Data Protection Officer at privacy@ventrapos.com.
        </p>
      </div>
    </div>
  );
}

export function TermsOfServiceContent() {
  return (
    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6 text-muted-foreground pb-8">
      <p><strong>Effective Date:</strong> January 1, 2026</p>

      <p>
        Welcome to VentraPOS. These Terms of Service ("Terms") dictate your access to and use of our point-of-sale software, mobile applications, API, and associated web services. Please read them carefully.
      </p>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h3>
        <p>
          By creating an account, accessing, or using the VentraPOS platform, you agree to be bound by these Terms and our Privacy Policy. If you are accepting these Terms on behalf of a company (such as a retail chain or pharmacy), you represent that you have the authority to bind that entity.
        </p>

        <h3 className="text-xl font-bold text-foreground">2. Description of Service</h3>
        <p>
          VentraPOS provides cloud-based inventory management, sales tracking, staff scheduling, and point-of-sale terminal software ("Service"). Our Service is continuously evolving; features may be added, removed, or modified at our discretion to better serve the broader ecosystem.
        </p>

        <h3 className="text-xl font-bold text-foreground">3. Account Obligations</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You are solely responsible for all activities that occur under your account, including actions performed by staff members you provision.</li>
          <li>You must use the Service in compliance with all local laws and regulations (including taxation, consumer rights, and labor laws).</li>
        </ul>

        <h3 className="text-xl font-bold text-foreground">4. Payment Processing and Fees</h3>
        <p>
          VentraPOS offers software subscriptions. Selected plans are billed monthly or annually. Failure to pay recurring fees will result in the temporary suspension of Service access. 
          Third-party transaction fees (e.g., from integrated debit/credit card processors) are billed directly by those partners according to their separate agreements.
        </p>

        <h3 className="text-xl font-bold text-foreground">5. Service Availability</h3>
        <p>
          We strive to maintain 99.9% uptime. However, the Service is provided on an "AS IS" and "AS AVAILABLE" basis. VentraPOS does not guarantee uninterrupted access and is not liable for revenue losses resulting from temporary system downtimes, local internet outages, or hardware failures.
        </p>

        <h3 className="text-xl font-bold text-foreground">6. Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, VentraPOS shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your operation of the Service.
        </p>

        <h3 className="text-xl font-bold text-foreground">7. Termination</h3>
        <p>
          You may terminate your account at any time via the billing settings. We may suspend or terminate your access immediately, without prior notice, if you breach these Terms or engage in fraudulent activities.
        </p>

        <p className="pt-4 text-sm">
          For legal inquiries regarding these terms, send an email to legal@ventrapos.com.
        </p>
      </div>
    </div>
  );
}
