import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from supabase_db import supa
from routers.admin import require_admin_token

router = APIRouter(prefix="/legal", tags=["legal"])

PRIVACY_DEFAULT = """**CourtBound Privacy Policy**

**Last updated: 5 May 2026**

CourtBound is operated by CourtBound Limited, a company registered in England and Wales ("we", "us", "our"). We are committed to protecting your personal data and complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. This Privacy Policy explains how we collect, use, store, and share your personal data when you use the CourtBound platform at getcourtbound.com (the "Platform"). Please read this policy carefully. By using the Platform you confirm that you have read and understood it.

**1. Who We Are**

Data Controller: CourtBound Limited
Registered in England and Wales
Contact email: privacy@getcourtbound.com

If you have any questions about how we handle your data, please contact us at the email address above.

**2. Data We Collect**

We collect and process the following categories of personal data:

* Account and profile data: Full name, email address, password (stored in encrypted form — we never see it in plain text)
* Athlete profile details: height, weight, position, graduation year, nationality
* Academic information: qualifications, grades, predicted results
* Athletic credentials: statistics, team history, international honours
* Links to external content such as highlight reels and social media profiles
* Usage and activity data: Colleges tracked, outreach activity, goals set, AI match queries, login times, browser type, and device information
* Payment data: Subscription tier and billing history. Payment processing is handled entirely by Stripe. CourtBound does not store or have access to card numbers or bank details
* Data relating to minors: Where an athlete is under 18, we require that a parent or guardian creates the account and provides consent on their behalf. We do not knowingly collect data from users under 13 under any circumstances.

**3. How We Use Your Data**

We use your personal data for the following purposes:

* To create and manage your account
* To provide the Platform's features including college matching, outreach tools, follow-up reminders, and the strategy advisor
* To process your subscription payments via Stripe
* To send you weekly digests, goal reminders, and platform notifications
* To improve the Platform through aggregated, anonymised usage analysis
* To comply with our legal obligations

We do not use your data for automated decision-making that produces legal or similarly significant effects without human review.

**4. Legal Basis for Processing**

We process your data on the following legal bases under UK GDPR:

* Contract performance: to provide the service you have signed up for
* Legitimate interests: to improve the Platform and ensure its security
* Legal obligation: to comply with applicable laws and regulations
* Consent: where we ask for your explicit agreement, such as for marketing communications

**5. How We Share Your Data**

We do not sell your personal data. We share data only in the following limited circumstances:

* Stripe: for payment processing. Stripe's privacy policy is available at stripe.com/gb/privacy
* Hosting and infrastructure providers: we use reputable third-party cloud services to host the Platform. These providers act as data processors under our instruction
* Legal requirements: where we are required to disclose data by law, court order, or regulatory authority

We do not share athlete profiles or personal data with US colleges, coaches, or any third party without your explicit consent.

**6. Data Retention**

We retain your personal data for as long as your account is active. If you close your account:

* Your profile and activity data will be deleted within 30 days of account closure
* Payment records will be retained for 7 years as required by UK tax law
* Anonymised and aggregated usage data may be retained indefinitely as it cannot identify you

**7. Your Rights**

Under UK GDPR you have the following rights:

* Right of access: to request a copy of the data we hold about you
* Right to rectification: to correct inaccurate data
* Right to erasure: to request deletion of your data in certain circumstances
* Right to restrict processing: to ask us to limit how we use your data
* Right to data portability: to receive your data in a structured, machine-readable format
* Right to object: to processing based on legitimate interests
* Right to withdraw consent: where processing is based on consent, you may withdraw it at any time

To exercise any of these rights, please contact us at privacy@getcourtbound.com. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.

**8. Cookies**

We use essential cookies to keep you logged in and maintain your session. We also use analytics cookies to understand how the Platform is used, subject to your consent. You can manage your cookie preferences through the cookie settings on the Platform.

**9. Security**

We take the security of your data seriously. We use industry-standard encryption (HTTPS/TLS), hashed passwords, and access controls to protect your data. In the event of a data breach that is likely to affect your rights and freedoms, we will notify you and the ICO as required by law.

**10. International Transfers**

Some of our service providers may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place, including UK adequacy decisions or Standard Contractual Clauses, to protect your data to UK GDPR standards.

**11. Changes to This Policy**

We may update this Privacy Policy from time to time. Where changes are material, we will notify you by email or by a prominent notice on the Platform before the changes take effect. Continued use of the Platform after that date constitutes acceptance of the updated policy.

**12. Contact Us**

For any privacy-related queries, please contact: privacy@getcourtbound.com"""

TERMS_DEFAULT = """**CourtBound Terms of Use**

**Last updated: 5 May 2026**

These Terms of Use ("Terms") govern your access to and use of the CourtBound platform at getcourtbound.com (the "Platform"), operated by CourtBound Limited, a company registered in England and Wales ("we", "us", "our"). By creating an account or using the Platform, you agree to these Terms. If you do not agree, please do not use the Platform.

**1. About CourtBound**

CourtBound is a digital platform designed to help athletes based in the United Kingdom and Europe research US colleges, manage basketball scholarship outreach, and track their recruitment journey. We provide tools including a college database, AI-powered matching, communication templates, and tracking features.

CourtBound does not act as a sports agent, recruitment agency, or educational adviser. We provide a self-service platform only. We make no guarantee that use of the Platform will result in a scholarship offer or college placement.

**2. Eligibility and Account Registration**

To use the Platform you must:

* Be at least 13 years of age
* If under 18, have the consent of a parent or guardian, who must create and manage the account on your behalf
* Provide accurate and complete registration information
* Keep your login credentials secure and not share them with others

You are responsible for all activity that occurs under your account. If you suspect unauthorised access, please contact us immediately at support@getcourtbound.com.

Parents and guardians who create accounts on behalf of athletes under 18 accept these Terms on behalf of the minor and take full responsibility for appropriate use of the Platform.

**3. Subscription Plans and Payment**

CourtBound offers the following subscription tiers:

* Explorer (Free): limited access to core features as described on our pricing page
* Recruit (Basic): expanded access billed monthly or annually
* Scholarship (Premium): full access to all features including AI match, billed monthly or annually

All paid subscriptions are processed securely through Stripe. By subscribing you authorise Stripe to charge your payment method on the applicable billing cycle. Prices are displayed in GBP and are inclusive of any applicable VAT. We reserve the right to change our pricing with 30 days' notice to existing subscribers.

Annual subscriptions are charged upfront for the full year. Monthly subscriptions renew automatically each month unless cancelled.

**4. Cancellation and Refunds**

You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of your current billing period — you will retain access until that date.

We offer a 14-day money-back guarantee on your first paid subscription. If you are not satisfied within 14 days of your first payment, contact us at support@getcourtbound.com for a full refund. After the 14-day period, we do not offer refunds for partial billing periods, except where required by applicable consumer protection law.

**5. Acceptable Use**

You agree to use the Platform only for lawful purposes and in accordance with these Terms. You must not:

* Use the Platform to send unsolicited or misleading communications to coaches or colleges
* Upload false, inaccurate, or misleading information about yourself or an athlete
* Attempt to reverse-engineer, scrape, or extract data from the Platform
* Share your account credentials with third parties or allow others to access your account
* Use the Platform in any way that violates applicable laws or regulations, including NCAA or NAIA recruitment rules
* Upload content that is defamatory, offensive, or infringes the intellectual property rights of others

We reserve the right to suspend or terminate accounts that breach these rules without refund.

**6. NCAA and NAIA Compliance**

It is your responsibility to ensure that your use of the Platform complies with all applicable NCAA, NAIA, and other governing body rules regarding student-athlete recruitment. CourtBound provides general information and tools only. We are not affiliated with the NCAA, NAIA, or any college or university, and we do not provide compliance advice. If you are unsure whether a particular action complies with recruitment rules, you should consult the relevant governing body directly.

**7. AI Features and Accuracy**

The AI match and strategy advisor features are provided for guidance purposes only. They are based on publicly available information and the data you provide. CourtBound does not warrant that AI-generated match scores, likelihood percentages, or strategic recommendations are accurate, complete, or will produce any particular outcome. You should not rely solely on AI-generated information when making decisions about college applications or scholarship outreach. Always conduct your own research and seek independent advice where appropriate.

**8. Intellectual Property**

All content on the Platform, including but not limited to the college database, templates, AI matching system, design, and software, is owned by or licensed to CourtBound Limited and is protected by intellectual property law. You may not reproduce, distribute, or create derivative works from any Platform content without our prior written consent.

By uploading content to the Platform (such as athlete profile information, statistics, or links to highlight reels), you grant us a non-exclusive, royalty-free licence to use that content solely for the purpose of providing the service to you.

**9. Disclaimer of Warranties**

The Platform is provided "as is" and "as available". To the fullest extent permitted by law, CourtBound makes no warranties, express or implied, regarding the Platform, including but not limited to:

* That the Platform will be uninterrupted, error-free, or free of viruses
* That the college database is complete or up to date
* That use of the Platform will result in a scholarship offer or college acceptance
* The accuracy of any AI-generated recommendations or match scores

**10. Limitation of Liability**

To the fullest extent permitted by applicable law, CourtBound Limited shall not be liable for any indirect, incidental, special, or consequential losses arising from your use of the Platform, including but not limited to loss of scholarship opportunity, loss of data, or loss of revenue. Our total aggregate liability to you in connection with the Platform shall not exceed the total subscription fees paid by you in the 12 months preceding the claim.

Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law. If you are a consumer, you may have additional statutory rights that these Terms do not affect.

**11. Third-Party Links and Services**

The Platform may contain links to third-party websites including college websites, NCAA and NAIA resources, and social media platforms. These links are provided for convenience only. CourtBound is not responsible for the content or practices of third-party sites and your use of them is subject to their own terms and privacy policies.

**12. Termination**

We reserve the right to suspend or terminate your access to the Platform at any time if you breach these Terms or if we are required to do so by law. You may terminate your account at any time by contacting us at support@getcourtbound.com. Upon termination, your right to use the Platform ceases immediately.

**13. Changes to These Terms**

We may update these Terms from time to time to reflect changes in our service or applicable law. Where changes are material, we will notify you by email at least 14 days before they take effect. Your continued use of the Platform after that date constitutes acceptance of the updated Terms.

**14. Governing Law**

These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of England and Wales. If you are a consumer resident in Scotland or Northern Ireland, you may also bring proceedings in your local courts.

**15. Contact Us**

For any queries relating to these Terms, please contact: legal@getcourtbound.com

CourtBound Limited, England and Wales"""


async def _seed_defaults():
    """Insert default documents if table is empty."""
    for doc_type, content in [("privacy", PRIVACY_DEFAULT), ("terms", TERMS_DEFAULT)]:
        try:
            existing = await run_in_threadpool(
                lambda t=doc_type: supa.table("legal_documents").select("type").eq("type", t).execute()
            )
            if not existing.data:
                await run_in_threadpool(
                    lambda t=doc_type, c=content: supa.table("legal_documents").insert({
                        "type": t, "content": c
                    }).execute()
                )
        except Exception:
            pass


@router.get("/{doc_type}")
async def get_legal_document(doc_type: str):
    if doc_type not in ("privacy", "terms"):
        raise HTTPException(status_code=404, detail="Document not found")
    await _seed_defaults()
    result = await run_in_threadpool(
        lambda: supa.table("legal_documents").select("content,last_updated").eq("type", doc_type).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return result.data[0]


@router.patch("/{doc_type}")
async def update_legal_document(doc_type: str, body: dict, admin=Depends(require_admin_token)):
    if doc_type not in ("privacy", "terms"):
        raise HTTPException(status_code=404, detail="Document not found")
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    await run_in_threadpool(
        lambda: supa.table("legal_documents").upsert({
            "type": doc_type,
            "content": content,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "updated_by": "admin",
        }, on_conflict="type").execute()
    )
    return {"success": True, "type": doc_type}
