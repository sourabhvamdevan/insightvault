"""Generate the sample PDFs in demo/sample_documents/ with reportlab.

The company, people and policies are fictional. Each logical section is placed on its own page
so that the evaluation set can reference exact page numbers.

Usage (from backend/):  python scripts/make_sample_docs.py
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer

OUT_DIR = Path(__file__).resolve().parents[2] / "demo" / "sample_documents"
COMPANY = "Halcyon Dynamics Ltd."

Page = tuple[str, list[str]]

EMPLOYEE_HANDBOOK: list[Page] = [
    (
        "Welcome to Halcyon Dynamics",
        [
            "This Employee Handbook explains how we work at Halcyon Dynamics Ltd., a fictional company "
            "that designs logistics software for regional freight carriers. It applies to every permanent "
            "and fixed-term employee in all offices. Contractors follow the terms of their own agreements.",
            "The handbook is owned by the People Operations team and is reviewed every January. Policy "
            "references use the prefix HR followed by a three digit number, for example HR-101 for this "
            "introduction. If a local law gives you better terms than this handbook, the local law applies.",
            "Questions about any section should go to your manager first and then to People Operations "
            "at people@halcyon.example. Our core working hours are 10:00 to 16:00 local time, and outside "
            "those hours teams agree their own schedules.",
        ],
    ),
    (
        "HR-110 Probation and Onboarding",
        [
            "New employees serve a probation period of four months. During probation the notice period on "
            "either side is two weeks. Your manager will hold check-in meetings at the end of the first, "
            "second and fourth month and record the outcome in the HR system.",
            "Onboarding starts on day one with a laptop handover and an introduction to your onboarding buddy, "
            "a colleague from another team who helps you find your way during your first ninety days. "
            "Mandatory onboarding training, including information security awareness and data protection, "
            "must be completed within your first 30 days.",
            "Probation can be extended once, by up to two months, if both you and your manager agree that "
            "more time is needed. After probation ends, the standard notice period is one month for "
            "individual contributors and two months for people managers.",
        ],
    ),
    (
        "HR-204 Annual Leave",
        [
            "Full-time employees receive 24 days of paid annual leave per calendar year, in addition to "
            "public holidays. Part-time employees receive leave in proportion to their contracted hours. "
            "After five years of continuous service you receive two additional days each year.",
            "Up to five unused days may be carried over into the next calendar year. Carried-over days must "
            "be used by 31 March or they are forfeited. Leave cannot be exchanged for payment except when "
            "employment ends, when untaken leave for the current year is paid out.",
            "Requests for leave of more than five consecutive working days should be submitted at least "
            "three weeks in advance through the HR portal. Managers should reply to leave requests within "
            "three working days.",
        ],
    ),
    (
        "HR-215 Sick Leave and Wellbeing",
        [
            "If you are unwell, tell your manager before 10:00 on the first day of absence. You may self-certify "
            "sickness for up to three consecutive days. From the fourth day of absence a medical certificate "
            "is required.",
            "Employees receive up to ten days of fully paid sick leave per year. Longer absences are handled "
            "case by case with People Operations, and a return-to-work conversation is held after any absence "
            "longer than one week.",
            "Every employee can use the confidential Employee Assistance Programme, which offers up to six free "
            "counselling sessions per year. The company also provides an annual wellbeing allowance of 300 "
            "euros that can be spent on gym memberships, sports equipment or mental health apps.",
        ],
    ),
    (
        "HR-230 Parental Leave",
        [
            "Birth parents receive 26 weeks of parental leave, of which the first 16 weeks are paid at full "
            "salary. Non-birth parents, including adoptive parents and partners, receive 6 weeks of fully paid "
            "leave that can be taken at any time during the first year after the birth or adoption.",
            "To start parental leave, notify People Operations at least eight weeks before the expected date. "
            "Employees returning from parental leave can work a phased return at 80 percent of their hours on "
            "full pay for the first four weeks back.",
            "Parental leave does not affect eligibility for annual leave, which continues to accrue during "
            "the leave period.",
        ],
    ),
    (
        "HR-240 Learning, Expenses and Equipment",
        [
            "Each employee has an annual learning budget of 1,200 euros for courses, conferences, books and "
            "certifications. Spending above 500 euros on a single item requires your manager's approval in "
            "advance. Employees may also take up to three paid learning days each year.",
            "Business expenses must be submitted with receipts within 30 days of purchase. Travel must be booked "
            "through the company travel portal, and economy class is used for all flights shorter than six hours.",
            "Company laptops are replaced every three years. Lost or stolen equipment must be reported to the "
            "IT Service Desk within 24 hours, as described in the IT Security Policy.",
        ],
    ),
]

REMOTE_WORK_POLICY: list[Page] = [
    (
        "RW-100 Purpose and Scope",
        [
            "This Remote Work Policy describes how employees of Halcyon Dynamics Ltd. can work away from a "
            "company office. It applies to all employees who have completed probation. Employees still on "
            "probation work from the office at least four days per week.",
            "The policy aims to give people flexibility while keeping collaboration strong. It should be read "
            "together with the IT Security Policy, which sets the technical rules for working outside the office.",
        ],
    ),
    (
        "RW-110 Hybrid Working Pattern",
        [
            "Employees may work remotely up to three days per week. Each team chooses one shared anchor day "
            "when everyone is expected in the office, and team leads publish the anchor day in the team calendar "
            "at the start of every quarter.",
            "Fully remote arrangements are an exception. They require approval from both the department head "
            "and People Operations and are reviewed every twelve months.",
            "Working from another country is allowed for up to 20 working days per calendar year, subject to "
            "approval at least two weeks in advance. Working abroad for longer has tax and immigration "
            "consequences and is not permitted under this policy.",
        ],
    ),
    (
        "RW-120 Home Office Equipment and Allowance",
        [
            "Employees approved for remote work receive a one-time home office setup allowance of 400 euros "
            "for a desk, an ergonomic chair or a monitor. Receipts must be submitted within 60 days of the "
            "approval.",
            "In addition, a monthly internet and utilities stipend of 35 euros is paid with salary to every "
            "employee who works remotely at least one day per week.",
            "Company-provided equipment remains the property of Halcyon Dynamics and must be returned when "
            "employment ends.",
        ],
    ),
    (
        "RW-130 Availability, Security and Review",
        [
            "Remote employees must be reachable on the company chat tool during core working hours and should "
            "respond to direct messages within one hour. Cameras should be on for meetings with customers.",
            "When working remotely, employees must connect through the company VPN and must never use public "
            "Wi-Fi networks without it. Confidential documents must not be printed at home.",
            "Managers may end a remote arrangement with four weeks' notice if performance or collaboration "
            "concerns are documented. This policy is reviewed every year by People Operations and the "
            "Workplace team.",
        ],
    ),
]

IT_SECURITY_POLICY: list[Page] = [
    (
        "SEC-100 Introduction",
        [
            "This IT Security Policy, version 2.1, sets out the minimum security controls for everyone who uses "
            "Halcyon Dynamics systems, including employees, contractors and interns. It is owned by the "
            "Information Security team and approved by the Chief Technology Officer.",
            "Breaches of this policy may lead to disciplinary action. Exceptions must be requested through the "
            "IT Service Desk and approved by the Information Security team before any control is bypassed.",
        ],
    ),
    (
        "SEC-110 Passwords and Authentication",
        [
            "Passwords must be at least 14 characters long and must not be reused across systems. A password "
            "manager approved by the Information Security team must be used to store work credentials.",
            "Multi-factor authentication is mandatory for email, source code repositories, the VPN and all "
            "cloud consoles. Hardware security keys are required for administrators.",
            "Passwords do not expire on a fixed schedule. They must be changed immediately if there is any "
            "suspicion that they have been exposed. Accounts are locked for 15 minutes after ten failed "
            "sign-in attempts.",
        ],
    ),
    (
        "SEC-117 Device Security",
        [
            "Company laptops must use full-disk encryption and automatic screen lock after five minutes of "
            "inactivity. Operating system security updates must be installed within 7 days of release.",
            "Personal devices may only access company email through the approved mobile management app, and "
            "company data must never be stored on personal USB drives.",
            "Lost or stolen devices must be reported to the IT Service Desk within 24 hours so the device can "
            "be wiped remotely.",
        ],
    ),
    (
        "SEC-120 Data Classification and Handling",
        [
            "All information is classified as Public, Internal, Confidential or Restricted. Customer shipment "
            "data and employee records are classified as Restricted.",
            "Restricted data may only be shared with external parties through the secure file transfer service "
            "and never as an email attachment. Confidential and Restricted data must not be pasted into "
            "external AI tools that are not approved by the Information Security team.",
            "Data is retained according to the records retention schedule. Backups are kept for 35 days.",
        ],
    ),
    (
        "SEC-130 Incident Reporting",
        [
            "Suspected security incidents, including phishing emails, malware and accidental data disclosure, "
            "must be reported to security@halcyon.example or the IT Service Desk within one hour of discovery.",
            "Do not try to investigate an incident yourself, and do not delete suspicious emails before the "
            "Information Security team has reviewed them. Use the Report Phishing button in the mail client.",
            "The Information Security team runs a phishing simulation every quarter, and all staff complete "
            "security awareness training once a year.",
        ],
    ),
]

TRAVEL_EXPENSE_POLICY: list[Page] = [
    (
        "TE-300 Travel Approval and Booking",
        [
            "This Travel and Expense Policy explains how employees of Halcyon Dynamics Ltd. plan business "
            "trips and claim costs. Every business trip needs written approval from the traveller's manager "
            "before anything is booked. Trips outside the European Economic Area also need approval from the "
            "department head.",
            "All flights, trains and hotels are booked through the company travel portal so that the company "
            "can locate travellers in an emergency. Bookings made outside the portal are only reimbursed when "
            "the portal had no availability, and the traveller must attach a screenshot showing this.",
            "Economy class is used for flights shorter than six hours. Premium economy may be booked for "
            "flights of six hours or longer, and business class is never reimbursed unless the Chief Financial "
            "Officer approves it in advance. Rail travel is preferred over flying for journeys under four hours.",
            "Trips should be booked at least 14 days before departure where possible, because late bookings "
            "usually cost more. Travellers are responsible for checking visa and passport requirements.",
        ],
    ),
    (
        "TE-310 Hotels and Per Diem Allowances",
        [
            "Hotel bookings must not exceed a nightly cap of 160 euros in most cities and 220 euros in London, "
            "Paris, Zurich and New York. Stays above the cap need manager approval in the travel portal.",
            "Travellers receive a daily per diem of 55 euros for meals on full travel days and 30 euros on the "
            "day of departure and the day of return. The per diem replaces individual meal receipts, so meals "
            "covered by the per diem are not reimbursed separately. Alcohol is never reimbursed.",
            "If a customer or a conference provides a meal, the per diem for that day is reduced by 15 euros "
            "for each meal provided.",
        ],
    ),
    (
        "TE-320 Ground Transport and Mileage",
        [
            "Public transport should be used where it is practical. Taxis and ride-hailing services are allowed "
            "between 22:00 and 06:00, when carrying heavy equipment, or when public transport would add more "
            "than 45 minutes to the journey.",
            "Employees who use their own car for business trips are reimbursed at 0.30 euros per kilometre. "
            "Commuting between home and the usual office is not business mileage and is not reimbursed. "
            "Parking and toll costs are reimbursed with receipts.",
            "Rental cars must be booked in the compact category through the travel portal, and the company "
            "insurance covers them. Fines for parking or speeding are the personal responsibility of the driver.",
        ],
    ),
    (
        "TE-330 Expense Claims and Corporate Cards",
        [
            "Expense claims are submitted in the finance system within 30 days of the expense, with an itemised "
            "receipt for every amount above 10 euros. Claims submitted more than 90 days late are rejected.",
            "Claims are approved by the employee's manager and paid with the next monthly salary run. Finance "
            "may ask for additional evidence for any claim above 1,000 euros.",
            "Employees who travel more than six times a year can request a corporate card. Corporate cards must "
            "never be used for personal purchases, and cash withdrawals are limited to 200 euros per trip. A lost "
            "corporate card must be reported to Finance and the card provider immediately.",
        ],
    ),
]

DOCUMENTS: dict[str, tuple[str, list[Page]]] = {
    "Employee_Handbook.pdf": ("Employee Handbook", EMPLOYEE_HANDBOOK),
    "Remote_Work_Policy.pdf": ("Remote Work Policy", REMOTE_WORK_POLICY),
    "IT_Security_Policy.pdf": ("IT Security Policy (v2.1)", IT_SECURITY_POLICY),
    "Travel_Expense_Policy.pdf": ("Travel and Expense Policy", TRAVEL_EXPENSE_POLICY),
}


def _footer(title: str):  # noqa: ANN202 - reportlab callback factory
    def draw(canvas: Canvas, doc: BaseDocTemplate) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.drawString(2 * cm, 1.2 * cm, f"{COMPANY} - {title}")
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
        canvas.restoreState()

    return draw


def build_pdf(path: Path, title: str, pages: list[Page]) -> None:
    styles = getSampleStyleSheet()
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=10.5, leading=15, spaceAfter=8)
    doc = BaseDocTemplate(
        str(path),
        pagesize=A4,
        title=title,
        author=COMPANY,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm,
        invariant=1,  # deterministic output so the committed PDFs are reproducible
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    # Footer drawn at page end so text extraction yields body text first.
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame], onPageEnd=_footer(title))])
    story: list = []
    for i, (heading, paragraphs) in enumerate(pages):
        if i > 0:
            story.append(PageBreak())
        if i == 0:
            story.append(Paragraph(f"{COMPANY} {title}", styles["Title"]))
            story.append(Spacer(1, 6))
        story.append(Paragraph(heading, styles["Heading2"]))
        story.extend(Paragraph(p, body) for p in paragraphs)
    doc.build(story)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, (title, pages) in DOCUMENTS.items():
        build_pdf(OUT_DIR / filename, title, pages)
        print(f"wrote {OUT_DIR / filename} ({len(pages)} pages)")


if __name__ == "__main__":
    main()
