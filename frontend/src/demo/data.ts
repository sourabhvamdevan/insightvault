// Generated from the real backend (all-MiniLM-L6-v2 + FAISS + BM25 + RRF) over demo/sample_documents.
// Scores and rankings are real measurements; answers were written from the cited passages.
// Regenerate by re-running the export against the backend if the sample documents change.

export interface DemoPage {
  page: number
  text: string
}

export interface DemoDocument {
  id: string
  filename: string
  file_size: number
  page_count: number
  pages: DemoPage[]
}

export interface DemoChunk {
  id: number
  document_id: string
  chunk_index: number
  page: number
  token_count: number
  content: string
}

export interface DemoModeResult {
  chunk_id: number
  semantic_score: number | null
  bm25_score: number | null
  rrf_score: number
}

export interface DemoQuestion {
  key: string
  group: string
  question: string
  /** Answer text with {chunkId} markers; null means the model declines. */
  answer: string | null
  tokens: string[]
  semantic_ranked: [number, number][]
  bm25_ranked: [number, number][]
  modes: Record<'hybrid' | 'semantic' | 'keyword', { passes_gate: boolean; results: DemoModeResult[] }>
}

export interface DemoEvalRow {
  id: string
  question: string
  document: string
  page: number
  type: string
  ranks: Record<'semantic' | 'keyword' | 'hybrid', number | null>
}

export const DOCUMENTS: DemoDocument[] = [
 {
  "id": "b590b9a9",
  "filename": "Employee_Handbook.pdf",
  "file_size": 8064,
  "page_count": 6,
  "pages": [
   {
    "page": 1,
    "text": "Halcyon Dynamics Ltd. Employee Handbook\nWelcome to Halcyon Dynamics\nThis Employee Handbook explains how we work at Halcyon Dynamics Ltd., a fictional company\nthat designs logistics software for regional freight carriers. It applies to every permanent and\nfixed-term employee in all offices. Contractors follow the terms of their own agreements.\nThe handbook is owned by the People Operations team and is reviewed every January. Policy\nreferences use the prefix HR followed by a three digit number, for example HR-101 for this\nintroduction. If a local law gives you better terms than this handbook, the local law applies.\nQuestions about any section should go to your manager first and then to People Operations at\npeople@halcyon.example. Our core working hours are 10:00 to 16:00 local time, and outside those\nhours teams agree their own schedules.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 1"
   },
   {
    "page": 2,
    "text": "HR-110 Probation and Onboarding\nNew employees serve a probation period of four months. During probation the notice period on\neither side is two weeks. Your manager will hold check-in meetings at the end of the first, second\nand fourth month and record the outcome in the HR system.\nOnboarding starts on day one with a laptop handover and an introduction to your onboarding\nbuddy, a colleague from another team who helps you find your way during your first ninety days.\nMandatory onboarding training, including information security awareness and data protection, must\nbe completed within your first 30 days.\nProbation can be extended once, by up to two months, if both you and your manager agree that\nmore time is needed. After probation ends, the standard notice period is one month for individual\ncontributors and two months for people managers.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 2"
   },
   {
    "page": 3,
    "text": "HR-204 Annual Leave\nFull-time employees receive 24 days of paid annual leave per calendar year, in addition to public\nholidays. Part-time employees receive leave in proportion to their contracted hours. After five years\nof continuous service you receive two additional days each year.\nUp to five unused days may be carried over into the next calendar year. Carried-over days must be\nused by 31 March or they are forfeited. Leave cannot be exchanged for payment except when\nemployment ends, when untaken leave for the current year is paid out.\nRequests for leave of more than five consecutive working days should be submitted at least three\nweeks in advance through the HR portal. Managers should reply to leave requests within three\nworking days.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 3"
   },
   {
    "page": 4,
    "text": "HR-215 Sick Leave and Wellbeing\nIf you are unwell, tell your manager before 10:00 on the first day of absence. You may self-certify\nsickness for up to three consecutive days. From the fourth day of absence a medical certificate is\nrequired.\nEmployees receive up to ten days of fully paid sick leave per year. Longer absences are handled\ncase by case with People Operations, and a return-to-work conversation is held after any absence\nlonger than one week.\nEvery employee can use the confidential Employee Assistance Programme, which offers up to six\nfree counselling sessions per year. The company also provides an annual wellbeing allowance of\n300 euros that can be spent on gym memberships, sports equipment or mental health apps.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 4"
   },
   {
    "page": 5,
    "text": "HR-230 Parental Leave\nBirth parents receive 26 weeks of parental leave, of which the first 16 weeks are paid at full salary.\nNon-birth parents, including adoptive parents and partners, receive 6 weeks of fully paid leave that\ncan be taken at any time during the first year after the birth or adoption.\nTo start parental leave, notify People Operations at least eight weeks before the expected date.\nEmployees returning from parental leave can work a phased return at 80 percent of their hours on\nfull pay for the first four weeks back.\nParental leave does not affect eligibility for annual leave, which continues to accrue during the\nleave period.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 5"
   },
   {
    "page": 6,
    "text": "HR-240 Learning, Expenses and Equipment\nEach employee has an annual learning budget of 1,200 euros for courses, conferences, books and\ncertifications. Spending above 500 euros on a single item requires your manager's approval in\nadvance. Employees may also take up to three paid learning days each year.\nBusiness expenses must be submitted with receipts within 30 days of purchase. Travel must be\nbooked through the company travel portal, and economy class is used for all flights shorter than six\nhours.\nCompany laptops are replaced every three years. Lost or stolen equipment must be reported to the\nIT Service Desk within 24 hours, as described in the IT Security Policy.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 6"
   }
  ]
 },
 {
  "id": "d9d095be",
  "filename": "Remote_Work_Policy.pdf",
  "file_size": 5297,
  "page_count": 4,
  "pages": [
   {
    "page": 1,
    "text": "Halcyon Dynamics Ltd. Remote Work Policy\nRW-100 Purpose and Scope\nThis Remote Work Policy describes how employees of Halcyon Dynamics Ltd. can work away from\na company office. It applies to all employees who have completed probation. Employees still on\nprobation work from the office at least four days per week.\nThe policy aims to give people flexibility while keeping collaboration strong. It should be read\ntogether with the IT Security Policy, which sets the technical rules for working outside the office.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 1"
   },
   {
    "page": 2,
    "text": "RW-110 Hybrid Working Pattern\nEmployees may work remotely up to three days per week. Each team chooses one shared anchor\nday when everyone is expected in the office, and team leads publish the anchor day in the team\ncalendar at the start of every quarter.\nFully remote arrangements are an exception. They require approval from both the department\nhead and People Operations and are reviewed every twelve months.\nWorking from another country is allowed for up to 20 working days per calendar year, subject to\napproval at least two weeks in advance. Working abroad for longer has tax and immigration\nconsequences and is not permitted under this policy.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 2"
   },
   {
    "page": 3,
    "text": "RW-120 Home Office Equipment and Allowance\nEmployees approved for remote work receive a one-time home office setup allowance of 400 euros\nfor a desk, an ergonomic chair or a monitor. Receipts must be submitted within 60 days of the\napproval.\nIn addition, a monthly internet and utilities stipend of 35 euros is paid with salary to every employee\nwho works remotely at least one day per week.\nCompany-provided equipment remains the property of Halcyon Dynamics and must be returned\nwhen employment ends.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 3"
   },
   {
    "page": 4,
    "text": "RW-130 Availability, Security and Review\nRemote employees must be reachable on the company chat tool during core working hours and\nshould respond to direct messages within one hour. Cameras should be on for meetings with\ncustomers.\nWhen working remotely, employees must connect through the company VPN and must never use\npublic Wi-Fi networks without it. Confidential documents must not be printed at home.\nManagers may end a remote arrangement with four weeks' notice if performance or collaboration\nconcerns are documented. This policy is reviewed every year by People Operations and the\nWorkplace team.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 4"
   }
  ]
 },
 {
  "id": "19a7f576",
  "filename": "IT_Security_Policy.pdf",
  "file_size": 6200,
  "page_count": 5,
  "pages": [
   {
    "page": 1,
    "text": "Halcyon Dynamics Ltd. IT Security Policy (v2.1)\nSEC-100 Introduction\nThis IT Security Policy, version 2.1, sets out the minimum security controls for everyone who uses\nHalcyon Dynamics systems, including employees, contractors and interns. It is owned by the\nInformation Security team and approved by the Chief Technology Officer.\nBreaches of this policy may lead to disciplinary action. Exceptions must be requested through the\nIT Service Desk and approved by the Information Security team before any control is bypassed.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 1"
   },
   {
    "page": 2,
    "text": "SEC-110 Passwords and Authentication\nPasswords must be at least 14 characters long and must not be reused across systems. A\npassword manager approved by the Information Security team must be used to store work\ncredentials.\nMulti-factor authentication is mandatory for email, source code repositories, the VPN and all cloud\nconsoles. Hardware security keys are required for administrators.\nPasswords do not expire on a fixed schedule. They must be changed immediately if there is any\nsuspicion that they have been exposed. Accounts are locked for 15 minutes after ten failed sign-in\nattempts.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 2"
   },
   {
    "page": 3,
    "text": "SEC-117 Device Security\nCompany laptops must use full-disk encryption and automatic screen lock after five minutes of\ninactivity. Operating system security updates must be installed within 7 days of release.\nPersonal devices may only access company email through the approved mobile management app,\nand company data must never be stored on personal USB drives.\nLost or stolen devices must be reported to the IT Service Desk within 24 hours so the device can\nbe wiped remotely.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 3"
   },
   {
    "page": 4,
    "text": "SEC-120 Data Classification and Handling\nAll information is classified as Public, Internal, Confidential or Restricted. Customer shipment data\nand employee records are classified as Restricted.\nRestricted data may only be shared with external parties through the secure file transfer service\nand never as an email attachment. Confidential and Restricted data must not be pasted into\nexternal AI tools that are not approved by the Information Security team.\nData is retained according to the records retention schedule. Backups are kept for 35 days.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 4"
   },
   {
    "page": 5,
    "text": "SEC-130 Incident Reporting\nSuspected security incidents, including phishing emails, malware and accidental data disclosure,\nmust be reported to security@halcyon.example or the IT Service Desk within one hour of\ndiscovery.\nDo not try to investigate an incident yourself, and do not delete suspicious emails before the\nInformation Security team has reviewed them. Use the Report Phishing button in the mail client.\nThe Information Security team runs a phishing simulation every quarter, and all staff complete\nsecurity awareness training once a year.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 5"
   }
  ]
 },
 {
  "id": "4cfbb059",
  "filename": "Travel_Expense_Policy.pdf",
  "file_size": 5799,
  "page_count": 4,
  "pages": [
   {
    "page": 1,
    "text": "Halcyon Dynamics Ltd. Travel and Expense Policy\nTE-300 Travel Approval and Booking\nThis Travel and Expense Policy explains how employees of Halcyon Dynamics Ltd. plan business\ntrips and claim costs. Every business trip needs written approval from the traveller's manager\nbefore anything is booked. Trips outside the European Economic Area also need approval from the\ndepartment head.\nAll flights, trains and hotels are booked through the company travel portal so that the company can\nlocate travellers in an emergency. Bookings made outside the portal are only reimbursed when the\nportal had no availability, and the traveller must attach a screenshot showing this.\nEconomy class is used for flights shorter than six hours. Premium economy may be booked for\nflights of six hours or longer, and business class is never reimbursed unless the Chief Financial\nOfficer approves it in advance. Rail travel is preferred over flying for journeys under four hours.\nTrips should be booked at least 14 days before departure where possible, because late bookings\nusually cost more. Travellers are responsible for checking visa and passport requirements.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 1"
   },
   {
    "page": 2,
    "text": "TE-310 Hotels and Per Diem Allowances\nHotel bookings must not exceed a nightly cap of 160 euros in most cities and 220 euros in London,\nParis, Zurich and New York. Stays above the cap need manager approval in the travel portal.\nTravellers receive a daily per diem of 55 euros for meals on full travel days and 30 euros on the\nday of departure and the day of return. The per diem replaces individual meal receipts, so meals\ncovered by the per diem are not reimbursed separately. Alcohol is never reimbursed.\nIf a customer or a conference provides a meal, the per diem for that day is reduced by 15 euros for\neach meal provided.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 2"
   },
   {
    "page": 3,
    "text": "TE-320 Ground Transport and Mileage\nPublic transport should be used where it is practical. Taxis and ride-hailing services are allowed\nbetween 22:00 and 06:00, when carrying heavy equipment, or when public transport would add\nmore than 45 minutes to the journey.\nEmployees who use their own car for business trips are reimbursed at 0.30 euros per kilometre.\nCommuting between home and the usual office is not business mileage and is not reimbursed.\nParking and toll costs are reimbursed with receipts.\nRental cars must be booked in the compact category through the travel portal, and the company\ninsurance covers them. Fines for parking or speeding are the personal responsibility of the driver.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 3"
   },
   {
    "page": 4,
    "text": "TE-330 Expense Claims and Corporate Cards\nExpense claims are submitted in the finance system within 30 days of the expense, with an\nitemised receipt for every amount above 10 euros. Claims submitted more than 90 days late are\nrejected.\nClaims are approved by the employee's manager and paid with the next monthly salary run.\nFinance may ask for additional evidence for any claim above 1,000 euros.\nEmployees who travel more than six times a year can request a corporate card. Corporate cards\nmust never be used for personal purchases, and cash withdrawals are limited to 200 euros per trip.\nA lost corporate card must be reported to Finance and the card provider immediately.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 4"
   }
  ]
 }
]

export const CHUNKS: DemoChunk[] = [
 {
  "id": 1,
  "document_id": "b590b9a9",
  "chunk_index": 0,
  "page": 1,
  "token_count": 178,
  "content": "Halcyon Dynamics Ltd. Employee Handbook\nWelcome to Halcyon Dynamics\nThis Employee Handbook explains how we work at Halcyon Dynamics Ltd., a fictional company\nthat designs logistics software for regional freight carriers. It applies to every permanent and\nfixed-term employee in all offices. Contractors follow the terms of their own agreements.\nThe handbook is owned by the People Operations team and is reviewed every January. Policy\nreferences use the prefix HR followed by a three digit number, for example HR-101 for this\nintroduction. If a local law gives you better terms than this handbook, the local law applies.\nQuestions about any section should go to your manager first and then to People Operations at\npeople@halcyon.example. Our core working hours are 10:00 to 16:00 local time, and outside those\nhours teams agree their own schedules.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 1"
 },
 {
  "id": 2,
  "document_id": "b590b9a9",
  "chunk_index": 1,
  "page": 2,
  "token_count": 173,
  "content": "HR-110 Probation and Onboarding\nNew employees serve a probation period of four months. During probation the notice period on\neither side is two weeks. Your manager will hold check-in meetings at the end of the first, second\nand fourth month and record the outcome in the HR system.\nOnboarding starts on day one with a laptop handover and an introduction to your onboarding\nbuddy, a colleague from another team who helps you find your way during your first ninety days.\nMandatory onboarding training, including information security awareness and data protection, must\nbe completed within your first 30 days.\nProbation can be extended once, by up to two months, if both you and your manager agree that\nmore time is needed. After probation ends, the standard notice period is one month for individual\ncontributors and two months for people managers.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 2"
 },
 {
  "id": 3,
  "document_id": "b590b9a9",
  "chunk_index": 2,
  "page": 3,
  "token_count": 154,
  "content": "HR-204 Annual Leave\nFull-time employees receive 24 days of paid annual leave per calendar year, in addition to public\nholidays. Part-time employees receive leave in proportion to their contracted hours. After five years\nof continuous service you receive two additional days each year.\nUp to five unused days may be carried over into the next calendar year. Carried-over days must be\nused by 31 March or they are forfeited. Leave cannot be exchanged for payment except when\nemployment ends, when untaken leave for the current year is paid out.\nRequests for leave of more than five consecutive working days should be submitted at least three\nweeks in advance through the HR portal. Managers should reply to leave requests within three\nworking days.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 3"
 },
 {
  "id": 4,
  "document_id": "b590b9a9",
  "chunk_index": 3,
  "page": 4,
  "token_count": 162,
  "content": "HR-215 Sick Leave and Wellbeing\nIf you are unwell, tell your manager before 10:00 on the first day of absence. You may self-certify\nsickness for up to three consecutive days. From the fourth day of absence a medical certificate is\nrequired.\nEmployees receive up to ten days of fully paid sick leave per year. Longer absences are handled\ncase by case with People Operations, and a return-to-work conversation is held after any absence\nlonger than one week.\nEvery employee can use the confidential Employee Assistance Programme, which offers up to six\nfree counselling sessions per year. The company also provides an annual wellbeing allowance of\n300 euros that can be spent on gym memberships, sports equipment or mental health apps.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 4"
 },
 {
  "id": 5,
  "document_id": "b590b9a9",
  "chunk_index": 4,
  "page": 5,
  "token_count": 137,
  "content": "HR-230 Parental Leave\nBirth parents receive 26 weeks of parental leave, of which the first 16 weeks are paid at full salary.\nNon-birth parents, including adoptive parents and partners, receive 6 weeks of fully paid leave that\ncan be taken at any time during the first year after the birth or adoption.\nTo start parental leave, notify People Operations at least eight weeks before the expected date.\nEmployees returning from parental leave can work a phased return at 80 percent of their hours on\nfull pay for the first four weeks back.\nParental leave does not affect eligibility for annual leave, which continues to accrue during the\nleave period.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 5"
 },
 {
  "id": 6,
  "document_id": "b590b9a9",
  "chunk_index": 5,
  "page": 6,
  "token_count": 140,
  "content": "HR-240 Learning, Expenses and Equipment\nEach employee has an annual learning budget of 1,200 euros for courses, conferences, books and\ncertifications. Spending above 500 euros on a single item requires your manager's approval in\nadvance. Employees may also take up to three paid learning days each year.\nBusiness expenses must be submitted with receipts within 30 days of purchase. Travel must be\nbooked through the company travel portal, and economy class is used for all flights shorter than six\nhours.\nCompany laptops are replaced every three years. Lost or stolen equipment must be reported to the\nIT Service Desk within 24 hours, as described in the IT Security Policy.\nHalcyon Dynamics Ltd. - Employee Handbook\nPage 6"
 },
 {
  "id": 7,
  "document_id": "d9d095be",
  "chunk_index": 0,
  "page": 1,
  "token_count": 109,
  "content": "Halcyon Dynamics Ltd. Remote Work Policy\nRW-100 Purpose and Scope\nThis Remote Work Policy describes how employees of Halcyon Dynamics Ltd. can work away from\na company office. It applies to all employees who have completed probation. Employees still on\nprobation work from the office at least four days per week.\nThe policy aims to give people flexibility while keeping collaboration strong. It should be read\ntogether with the IT Security Policy, which sets the technical rules for working outside the office.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 1"
 },
 {
  "id": 8,
  "document_id": "d9d095be",
  "chunk_index": 1,
  "page": 2,
  "token_count": 131,
  "content": "RW-110 Hybrid Working Pattern\nEmployees may work remotely up to three days per week. Each team chooses one shared anchor\nday when everyone is expected in the office, and team leads publish the anchor day in the team\ncalendar at the start of every quarter.\nFully remote arrangements are an exception. They require approval from both the department\nhead and People Operations and are reviewed every twelve months.\nWorking from another country is allowed for up to 20 working days per calendar year, subject to\napproval at least two weeks in advance. Working abroad for longer has tax and immigration\nconsequences and is not permitted under this policy.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 2"
 },
 {
  "id": 9,
  "document_id": "d9d095be",
  "chunk_index": 2,
  "page": 3,
  "token_count": 113,
  "content": "RW-120 Home Office Equipment and Allowance\nEmployees approved for remote work receive a one-time home office setup allowance of 400 euros\nfor a desk, an ergonomic chair or a monitor. Receipts must be submitted within 60 days of the\napproval.\nIn addition, a monthly internet and utilities stipend of 35 euros is paid with salary to every employee\nwho works remotely at least one day per week.\nCompany-provided equipment remains the property of Halcyon Dynamics and must be returned\nwhen employment ends.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 3"
 },
 {
  "id": 10,
  "document_id": "d9d095be",
  "chunk_index": 3,
  "page": 4,
  "token_count": 121,
  "content": "RW-130 Availability, Security and Review\nRemote employees must be reachable on the company chat tool during core working hours and\nshould respond to direct messages within one hour. Cameras should be on for meetings with\ncustomers.\nWhen working remotely, employees must connect through the company VPN and must never use\npublic Wi-Fi networks without it. Confidential documents must not be printed at home.\nManagers may end a remote arrangement with four weeks' notice if performance or collaboration\nconcerns are documented. This policy is reviewed every year by People Operations and the\nWorkplace team.\nHalcyon Dynamics Ltd. - Remote Work Policy\nPage 4"
 },
 {
  "id": 11,
  "document_id": "19a7f576",
  "chunk_index": 0,
  "page": 1,
  "token_count": 120,
  "content": "Halcyon Dynamics Ltd. IT Security Policy (v2.1)\nSEC-100 Introduction\nThis IT Security Policy, version 2.1, sets out the minimum security controls for everyone who uses\nHalcyon Dynamics systems, including employees, contractors and interns. It is owned by the\nInformation Security team and approved by the Chief Technology Officer.\nBreaches of this policy may lead to disciplinary action. Exceptions must be requested through the\nIT Service Desk and approved by the Information Security team before any control is bypassed.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 1"
 },
 {
  "id": 12,
  "document_id": "19a7f576",
  "chunk_index": 1,
  "page": 2,
  "token_count": 132,
  "content": "SEC-110 Passwords and Authentication\nPasswords must be at least 14 characters long and must not be reused across systems. A\npassword manager approved by the Information Security team must be used to store work\ncredentials.\nMulti-factor authentication is mandatory for email, source code repositories, the VPN and all cloud\nconsoles. Hardware security keys are required for administrators.\nPasswords do not expire on a fixed schedule. They must be changed immediately if there is any\nsuspicion that they have been exposed. Accounts are locked for 15 minutes after ten failed sign-in\nattempts.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 2"
 },
 {
  "id": 13,
  "document_id": "19a7f576",
  "chunk_index": 2,
  "page": 3,
  "token_count": 106,
  "content": "SEC-117 Device Security\nCompany laptops must use full-disk encryption and automatic screen lock after five minutes of\ninactivity. Operating system security updates must be installed within 7 days of release.\nPersonal devices may only access company email through the approved mobile management app,\nand company data must never be stored on personal USB drives.\nLost or stolen devices must be reported to the IT Service Desk within 24 hours so the device can\nbe wiped remotely.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 3"
 },
 {
  "id": 14,
  "document_id": "19a7f576",
  "chunk_index": 3,
  "page": 4,
  "token_count": 112,
  "content": "SEC-120 Data Classification and Handling\nAll information is classified as Public, Internal, Confidential or Restricted. Customer shipment data\nand employee records are classified as Restricted.\nRestricted data may only be shared with external parties through the secure file transfer service\nand never as an email attachment. Confidential and Restricted data must not be pasted into\nexternal AI tools that are not approved by the Information Security team.\nData is retained according to the records retention schedule. Backups are kept for 35 days.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 4"
 },
 {
  "id": 15,
  "document_id": "19a7f576",
  "chunk_index": 4,
  "page": 5,
  "token_count": 120,
  "content": "SEC-130 Incident Reporting\nSuspected security incidents, including phishing emails, malware and accidental data disclosure,\nmust be reported to security@halcyon.example or the IT Service Desk within one hour of\ndiscovery.\nDo not try to investigate an incident yourself, and do not delete suspicious emails before the\nInformation Security team has reviewed them. Use the Report Phishing button in the mail client.\nThe Information Security team runs a phishing simulation every quarter, and all staff complete\nsecurity awareness training once a year.\nHalcyon Dynamics Ltd. - IT Security Policy (v2.1)\nPage 5"
 },
 {
  "id": 16,
  "document_id": "4cfbb059",
  "chunk_index": 0,
  "page": 1,
  "token_count": 197,
  "content": "Halcyon Dynamics Ltd. Travel and Expense Policy\nTE-300 Travel Approval and Booking\nThis Travel and Expense Policy explains how employees of Halcyon Dynamics Ltd. plan business\ntrips and claim costs. Every business trip needs written approval from the traveller's manager\nbefore anything is booked. Trips outside the European Economic Area also need approval from the\ndepartment head.\nAll flights, trains and hotels are booked through the company travel portal so that the company can\nlocate travellers in an emergency. Bookings made outside the portal are only reimbursed when the\nportal had no availability, and the traveller must attach a screenshot showing this.\nEconomy class is used for flights shorter than six hours. Premium economy may be booked for\nflights of six hours or longer, and business class is never reimbursed unless the Chief Financial\nOfficer approves it in advance. Rail travel is preferred over flying for journeys under four hours.\nTrips should be booked at least 14 days before departure where possible, because late bookings"
 },
 {
  "id": 17,
  "document_id": "4cfbb059",
  "chunk_index": 1,
  "page": 1,
  "token_count": 67,
  "content": "unless the Chief Financial\nOfficer approves it in advance. Rail travel is preferred over flying for journeys under four hours.\nTrips should be booked at least 14 days before departure where possible, because late bookings\nusually cost more. Travellers are responsible for checking visa and passport requirements.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 1"
 },
 {
  "id": 18,
  "document_id": "4cfbb059",
  "chunk_index": 2,
  "page": 2,
  "token_count": 153,
  "content": "TE-310 Hotels and Per Diem Allowances\nHotel bookings must not exceed a nightly cap of 160 euros in most cities and 220 euros in London,\nParis, Zurich and New York. Stays above the cap need manager approval in the travel portal.\nTravellers receive a daily per diem of 55 euros for meals on full travel days and 30 euros on the\nday of departure and the day of return. The per diem replaces individual meal receipts, so meals\ncovered by the per diem are not reimbursed separately. Alcohol is never reimbursed.\nIf a customer or a conference provides a meal, the per diem for that day is reduced by 15 euros for\neach meal provided.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 2"
 },
 {
  "id": 19,
  "document_id": "4cfbb059",
  "chunk_index": 3,
  "page": 3,
  "token_count": 158,
  "content": "TE-320 Ground Transport and Mileage\nPublic transport should be used where it is practical. Taxis and ride-hailing services are allowed\nbetween 22:00 and 06:00, when carrying heavy equipment, or when public transport would add\nmore than 45 minutes to the journey.\nEmployees who use their own car for business trips are reimbursed at 0.30 euros per kilometre.\nCommuting between home and the usual office is not business mileage and is not reimbursed.\nParking and toll costs are reimbursed with receipts.\nRental cars must be booked in the compact category through the travel portal, and the company\ninsurance covers them. Fines for parking or speeding are the personal responsibility of the driver.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 3"
 },
 {
  "id": 20,
  "document_id": "4cfbb059",
  "chunk_index": 4,
  "page": 4,
  "token_count": 143,
  "content": "TE-330 Expense Claims and Corporate Cards\nExpense claims are submitted in the finance system within 30 days of the expense, with an\nitemised receipt for every amount above 10 euros. Claims submitted more than 90 days late are\nrejected.\nClaims are approved by the employee's manager and paid with the next monthly salary run.\nFinance may ask for additional evidence for any claim above 1,000 euros.\nEmployees who travel more than six times a year can request a corporate card. Corporate cards\nmust never be used for personal purchases, and cash withdrawals are limited to 200 euros per trip.\nA lost corporate card must be reported to Finance and the card provider immediately.\nHalcyon Dynamics Ltd. - Travel and Expense Policy\nPage 4"
 }
]

export const QUESTIONS: DemoQuestion[] = [{"key": "remote", "group": "Paraphrased question", "question": "How many days per week can I work remotely?", "tokens": ["many", "days", "per", "week", "work", "remotely"], "semantic_ranked": [[9, 0.5691], [8, 0.5625], [7, 0.4769], [10, 0.4625], [3, 0.4209], [4, 0.3927], [6, 0.3453], [13, 0.3207], [1, 0.318], [2, 0.316], [5, 0.2976], [12, 0.2381], [14, 0.222], [16, 0.1897], [11, 0.1894], [19, 0.1891], [20, 0.1693], [18, 0.1606], [15, 0.1531], [17, 0.1469]], "bm25_ranked": [[9, 4.7691], [8, 4.693], [7, 3.6189], [4, 2.4961], [13, 1.9893], [10, 1.9364], [3, 1.4142], [18, 1.2655], [20, 1.1216], [6, 0.7585], [2, 0.73], [17, 0.6873], [12, 0.6212], [14, 0.5983], [5, 0.5732], [1, 0.5294], [16, 0.451], [19, 0.3846]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 9, "semantic_score": 0.5691, "bm25_score": 4.7691, "rrf_score": 0.032787}, {"chunk_id": 8, "semantic_score": 0.5625, "bm25_score": 4.693, "rrf_score": 0.032258}, {"chunk_id": 7, "semantic_score": 0.4769, "bm25_score": 3.6189, "rrf_score": 0.031746}, {"chunk_id": 10, "semantic_score": 0.4625, "bm25_score": 1.9364, "rrf_score": 0.030777}, {"chunk_id": 4, "semantic_score": 0.3927, "bm25_score": 2.4961, "rrf_score": 0.030777}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 9, "semantic_score": 0.5691, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 8, "semantic_score": 0.5625, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 7, "semantic_score": 0.4769, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 10, "semantic_score": 0.4625, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 3, "semantic_score": 0.4209, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 9, "semantic_score": null, "bm25_score": 4.7691, "rrf_score": 0.016393}, {"chunk_id": 8, "semantic_score": null, "bm25_score": 4.693, "rrf_score": 0.016129}, {"chunk_id": 7, "semantic_score": null, "bm25_score": 3.6189, "rrf_score": 0.015873}, {"chunk_id": 4, "semantic_score": null, "bm25_score": 2.4961, "rrf_score": 0.015625}, {"chunk_id": 13, "semantic_score": null, "bm25_score": 1.9893, "rrf_score": 0.015385}]}}, "answer": "You can work remotely up to three days per week {8}. Each team also picks one shared anchor day when everyone is expected in the office {8}. If you work remotely at least one day a week, you also receive a 35 euro monthly internet and utilities stipend {9}."}, {"key": "abroad", "group": "Follow-up", "question": "What about working from another country?", "tokens": ["about", "working", "another", "country"], "semantic_ranked": [[8, 0.2944], [7, 0.2034], [9, 0.1978], [4, 0.1773], [10, 0.1561], [5, 0.1525], [3, 0.1498], [6, 0.1352], [2, 0.0675], [13, 0.059], [1, 0.0555], [20, 0.0477], [19, 0.0461], [16, 0.0454], [18, 0.0423], [14, 0.0319], [17, 0.0282], [12, -0.0084], [15, -0.0284], [11, -0.0306]], "bm25_ranked": [[8, 6.3447], [1, 3.2431], [2, 1.8118], [10, 1.5076], [3, 1.3823], [7, 1.1357]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 8, "semantic_score": 0.2944, "bm25_score": 6.3447, "rrf_score": 0.032787}, {"chunk_id": 7, "semantic_score": 0.2034, "bm25_score": 1.1357, "rrf_score": 0.031281}, {"chunk_id": 10, "semantic_score": 0.1561, "bm25_score": 1.5076, "rrf_score": 0.03101}, {"chunk_id": 2, "semantic_score": 0.0675, "bm25_score": 1.8118, "rrf_score": 0.030366}, {"chunk_id": 3, "semantic_score": 0.1498, "bm25_score": 1.3823, "rrf_score": 0.03031}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 8, "semantic_score": 0.2944, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 7, "semantic_score": 0.2034, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 9, "semantic_score": 0.1978, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 4, "semantic_score": 0.1773, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": 0.1561, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 8, "semantic_score": null, "bm25_score": 6.3447, "rrf_score": 0.016393}, {"chunk_id": 1, "semantic_score": null, "bm25_score": 3.2431, "rrf_score": 0.016129}, {"chunk_id": 2, "semantic_score": null, "bm25_score": 1.8118, "rrf_score": 0.015873}, {"chunk_id": 10, "semantic_score": null, "bm25_score": 1.5076, "rrf_score": 0.015625}, {"chunk_id": 3, "semantic_score": null, "bm25_score": 1.3823, "rrf_score": 0.015385}]}}, "answer": "Working from another country is allowed for up to 20 working days per calendar year, and it needs approval at least two weeks in advance {8}. Longer stays abroad are not permitted because of their tax and immigration consequences {8}."}, {"key": "probation", "group": "Paraphrased question", "question": "How long is the trial period for new hires?", "tokens": ["long", "trial", "period", "new", "hires"], "semantic_ranked": [[2, 0.4904], [3, 0.3598], [5, 0.3302], [8, 0.2427], [6, 0.239], [1, 0.2356], [4, 0.2297], [7, 0.1695], [10, 0.163], [20, 0.15], [13, 0.148], [12, 0.1405], [16, 0.1369], [9, 0.1357], [17, 0.1354], [15, 0.0845], [14, 0.0679], [18, 0.0618], [19, 0.0441], [11, 0.0226]], "bm25_ranked": [[2, 4.9642], [12, 2.7107], [5, 1.9518], [18, 1.9411]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 2, "semantic_score": 0.4904, "bm25_score": 4.9642, "rrf_score": 0.032787}, {"chunk_id": 5, "semantic_score": 0.3302, "bm25_score": 1.9518, "rrf_score": 0.031746}, {"chunk_id": 12, "semantic_score": 0.1405, "bm25_score": 2.7107, "rrf_score": 0.030018}, {"chunk_id": 18, "semantic_score": 0.0618, "bm25_score": 1.9411, "rrf_score": 0.028446}, {"chunk_id": 3, "semantic_score": 0.3598, "bm25_score": null, "rrf_score": 0.016129}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 2, "semantic_score": 0.4904, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 3, "semantic_score": 0.3598, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 5, "semantic_score": 0.3302, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 8, "semantic_score": 0.2427, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 6, "semantic_score": 0.239, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 2, "semantic_score": null, "bm25_score": 4.9642, "rrf_score": 0.016393}, {"chunk_id": 12, "semantic_score": null, "bm25_score": 2.7107, "rrf_score": 0.016129}, {"chunk_id": 5, "semantic_score": null, "bm25_score": 1.9518, "rrf_score": 0.015873}, {"chunk_id": 18, "semantic_score": null, "bm25_score": 1.9411, "rrf_score": 0.015625}]}}, "answer": "New employees serve a four-month probation period, with a two-week notice period on either side during that time {2}. Probation can be extended once, by up to two months, if you and your manager both agree {2}."}, {"key": "hotel", "group": "Paraphrased question", "question": "What is the nightly hotel cap in London?", "tokens": ["nightly", "hotel", "cap", "london"], "semantic_ranked": [[18, 0.4123], [16, 0.2242], [4, 0.2029], [9, 0.2026], [20, 0.1863], [3, 0.1732], [17, 0.1726], [1, 0.1702], [19, 0.1658], [10, 0.1342], [6, 0.1329], [7, 0.1293], [8, 0.1234], [12, 0.0974], [2, 0.0728], [13, 0.0581], [14, 0.0328], [11, 0.0138], [15, 0.0132], [5, -0.0022]], "bm25_ranked": [[18, 11.047]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": 0.4123, "bm25_score": 11.047, "rrf_score": 0.032787}, {"chunk_id": 16, "semantic_score": 0.2242, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 4, "semantic_score": 0.2029, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 9, "semantic_score": 0.2026, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 20, "semantic_score": 0.1863, "bm25_score": null, "rrf_score": 0.015385}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": 0.4123, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 16, "semantic_score": 0.2242, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 4, "semantic_score": 0.2029, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 9, "semantic_score": 0.2026, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 20, "semantic_score": 0.1863, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": null, "bm25_score": 11.047, "rrf_score": 0.016393}]}}, "answer": "The nightly hotel cap in London is 220 euros, the same as Paris, Zurich and New York. Most other cities are capped at 160 euros {18}. A stay above the cap needs manager approval in the travel portal {18}."}, {"key": "sick", "group": "Paraphrased question", "question": "When do I need a doctor's note for being ill?", "tokens": ["need", "doctor", "s", "note", "being", "ill"], "semantic_ranked": [[4, 0.346], [2, 0.136], [13, 0.1109], [10, 0.1025], [3, 0.092], [18, 0.0887], [17, 0.0844], [20, 0.0833], [15, 0.0651], [16, 0.0645], [6, 0.0584], [5, 0.0577], [19, 0.056], [12, 0.0531], [14, 0.0495], [1, 0.0481], [8, 0.0476], [7, 0.0469], [11, 0.0431], [9, 0.0246]], "bm25_ranked": [[16, 2.9648], [18, 1.9411], [6, 1.5356], [20, 1.5273]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": 0.0887, "bm25_score": 1.9411, "rrf_score": 0.031281}, {"chunk_id": 16, "semantic_score": 0.0645, "bm25_score": 2.9648, "rrf_score": 0.030679}, {"chunk_id": 20, "semantic_score": 0.0833, "bm25_score": 1.5273, "rrf_score": 0.030331}, {"chunk_id": 6, "semantic_score": 0.0584, "bm25_score": 1.5356, "rrf_score": 0.029958}, {"chunk_id": 4, "semantic_score": 0.346, "bm25_score": null, "rrf_score": 0.016393}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 4, "semantic_score": 0.346, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 2, "semantic_score": 0.136, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 13, "semantic_score": 0.1109, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 10, "semantic_score": 0.1025, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 3, "semantic_score": 0.092, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 16, "semantic_score": null, "bm25_score": 2.9648, "rrf_score": 0.016393}, {"chunk_id": 18, "semantic_score": null, "bm25_score": 1.9411, "rrf_score": 0.016129}, {"chunk_id": 6, "semantic_score": null, "bm25_score": 1.5356, "rrf_score": 0.015873}, {"chunk_id": 20, "semantic_score": null, "bm25_score": 1.5273, "rrf_score": 0.015625}]}}, "answer": "You can self-certify sickness for up to three consecutive days. From the fourth day of absence you need a medical certificate {4}. Tell your manager before 10:00 on the first day you are off {4}."}, {"key": "perdiem", "group": "Paraphrased question", "question": "How much is the daily meal allowance on business trips?", "tokens": ["much", "daily", "meal", "allowance", "business", "trips"], "semantic_ranked": [[18, 0.5517], [16, 0.4341], [4, 0.4074], [6, 0.4038], [19, 0.3731], [9, 0.35], [20, 0.3041], [3, 0.2707], [17, 0.2517], [1, 0.2448], [7, 0.202], [8, 0.1777], [5, 0.165], [10, 0.1591], [2, 0.1577], [11, 0.1154], [13, 0.1122], [14, 0.092], [12, 0.0594], [15, 0.0201]], "bm25_ranked": [[18, 6.6897], [16, 4.7854], [19, 3.8995], [9, 3.0504], [17, 2.0142], [4, 1.8792], [6, 1.5356]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": 0.5517, "bm25_score": 6.6897, "rrf_score": 0.032787}, {"chunk_id": 16, "semantic_score": 0.4341, "bm25_score": 4.7854, "rrf_score": 0.032258}, {"chunk_id": 19, "semantic_score": 0.3731, "bm25_score": 3.8995, "rrf_score": 0.031258}, {"chunk_id": 4, "semantic_score": 0.4074, "bm25_score": 1.8792, "rrf_score": 0.031025}, {"chunk_id": 9, "semantic_score": 0.35, "bm25_score": 3.0504, "rrf_score": 0.030777}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": 0.5517, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 16, "semantic_score": 0.4341, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 4, "semantic_score": 0.4074, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 6, "semantic_score": 0.4038, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 19, "semantic_score": 0.3731, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 18, "semantic_score": null, "bm25_score": 6.6897, "rrf_score": 0.016393}, {"chunk_id": 16, "semantic_score": null, "bm25_score": 4.7854, "rrf_score": 0.016129}, {"chunk_id": 19, "semantic_score": null, "bm25_score": 3.8995, "rrf_score": 0.015873}, {"chunk_id": 9, "semantic_score": null, "bm25_score": 3.0504, "rrf_score": 0.015625}, {"chunk_id": 17, "semantic_score": null, "bm25_score": 2.0142, "rrf_score": 0.015385}]}}, "answer": "The meal per diem is 55 euros on full travel days and 30 euros on the days you leave and return {18}. It replaces meal receipts, and it is reduced by 15 euros for each meal a customer or conference provides {18}."}, {"key": "phishing", "group": "Paraphrased question", "question": "Who do I tell if I clicked a suspicious link in an email?", "tokens": ["tell", "clicked", "suspicious", "link", "email"], "semantic_ranked": [[15, 0.3013], [11, 0.1152], [12, 0.0733], [14, 0.0713], [10, 0.0501], [13, 0.043], [1, 0.0289], [20, 0.0252], [6, 0.0125], [8, 0.0076], [7, 0.0063], [17, -0.0064], [9, -0.0094], [16, -0.0128], [19, -0.0197], [18, -0.0403], [4, -0.0403], [2, -0.0438], [3, -0.0586], [5, -0.0651]], "bm25_ranked": [[15, 2.7603], [4, 2.4082], [14, 1.7533], [13, 1.732], [12, 1.7009]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 15, "semantic_score": 0.3013, "bm25_score": 2.7603, "rrf_score": 0.032787}, {"chunk_id": 14, "semantic_score": 0.0713, "bm25_score": 1.7533, "rrf_score": 0.031498}, {"chunk_id": 12, "semantic_score": 0.0733, "bm25_score": 1.7009, "rrf_score": 0.031258}, {"chunk_id": 13, "semantic_score": 0.043, "bm25_score": 1.732, "rrf_score": 0.030777}, {"chunk_id": 4, "semantic_score": -0.0403, "bm25_score": 2.4082, "rrf_score": 0.029116}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 15, "semantic_score": 0.3013, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 11, "semantic_score": 0.1152, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 12, "semantic_score": 0.0733, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 14, "semantic_score": 0.0713, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": 0.0501, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 15, "semantic_score": null, "bm25_score": 2.7603, "rrf_score": 0.016393}, {"chunk_id": 4, "semantic_score": null, "bm25_score": 2.4082, "rrf_score": 0.016129}, {"chunk_id": 14, "semantic_score": null, "bm25_score": 1.7533, "rrf_score": 0.015873}, {"chunk_id": 13, "semantic_score": null, "bm25_score": 1.732, "rrf_score": 0.015625}, {"chunk_id": 12, "semantic_score": null, "bm25_score": 1.7009, "rrf_score": 0.015385}]}}, "answer": "Report it to security@halcyon.example or the IT Service Desk within one hour {15}. Use the Report Phishing button in your mail client, and don't delete the email or investigate it yourself before the Information Security team has reviewed it {15}."}, {"key": "homeoffice", "group": "Paraphrased question", "question": "Will the company pay for a desk or chair for my home office?", "tokens": ["company", "pay", "desk", "chair", "home", "office"], "semantic_ranked": [[9, 0.4479], [6, 0.3145], [1, 0.2702], [7, 0.2277], [10, 0.2189], [3, 0.2165], [20, 0.2157], [16, 0.21], [4, 0.2033], [19, 0.2024], [5, 0.2009], [8, 0.1962], [18, 0.1828], [13, 0.1567], [2, 0.1556], [11, 0.0956], [14, 0.083], [12, 0.0383], [17, 0.0014], [15, -0.0169]], "bm25_ranked": [[9, 8.3805], [19, 3.2851], [7, 2.6992], [5, 2.5012], [10, 2.2127], [13, 1.7841], [6, 1.5212], [8, 1.274], [11, 1.15], [15, 1.115], [16, 0.4767], [4, 0.3621], [1, 0.3473]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 9, "semantic_score": 0.4479, "bm25_score": 8.3805, "rrf_score": 0.032787}, {"chunk_id": 7, "semantic_score": 0.2277, "bm25_score": 2.6992, "rrf_score": 0.031498}, {"chunk_id": 6, "semantic_score": 0.3145, "bm25_score": 1.5212, "rrf_score": 0.031054}, {"chunk_id": 10, "semantic_score": 0.2189, "bm25_score": 2.2127, "rrf_score": 0.030769}, {"chunk_id": 19, "semantic_score": 0.2024, "bm25_score": 3.2851, "rrf_score": 0.030415}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 9, "semantic_score": 0.4479, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 6, "semantic_score": 0.3145, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 1, "semantic_score": 0.2702, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 7, "semantic_score": 0.2277, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": 0.2189, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 9, "semantic_score": null, "bm25_score": 8.3805, "rrf_score": 0.016393}, {"chunk_id": 19, "semantic_score": null, "bm25_score": 3.2851, "rrf_score": 0.016129}, {"chunk_id": 7, "semantic_score": null, "bm25_score": 2.6992, "rrf_score": 0.015873}, {"chunk_id": 5, "semantic_score": null, "bm25_score": 2.5012, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": null, "bm25_score": 2.2127, "rrf_score": 0.015385}]}}, "answer": "Yes. If you are approved for remote work, you get a one-time setup allowance of 400 euros for a desk, an ergonomic chair or a monitor {9}. Receipts must be submitted within 60 days of the approval {9}."}, {"key": "sec117", "group": "Exact policy ID", "question": "What does SEC-117 require?", "tokens": ["sec-117", "require"], "semantic_ranked": [[12, 0.456], [14, 0.4426], [15, 0.4241], [13, 0.3964], [11, 0.2942], [10, 0.28], [7, 0.1974], [2, 0.1956], [6, 0.1911], [8, 0.1795], [1, 0.1598], [9, 0.1369], [20, 0.1316], [3, 0.1256], [19, 0.1146], [4, 0.0956], [17, 0.0895], [18, 0.0776], [16, 0.0588], [5, 0.0446]], "bm25_ranked": [[13, 2.7603], [8, 2.5151]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 13, "semantic_score": 0.3964, "bm25_score": 2.7603, "rrf_score": 0.032018}, {"chunk_id": 8, "semantic_score": 0.1795, "bm25_score": 2.5151, "rrf_score": 0.030415}, {"chunk_id": 12, "semantic_score": 0.456, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 14, "semantic_score": 0.4426, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 15, "semantic_score": 0.4241, "bm25_score": null, "rrf_score": 0.015873}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 12, "semantic_score": 0.456, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 14, "semantic_score": 0.4426, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 15, "semantic_score": 0.4241, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 13, "semantic_score": 0.3964, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 11, "semantic_score": 0.2942, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 13, "semantic_score": null, "bm25_score": 2.7603, "rrf_score": 0.016393}, {"chunk_id": 8, "semantic_score": null, "bm25_score": 2.5151, "rrf_score": 0.016129}]}}, "answer": "SEC-117 is the device security policy {13}:\n- Company laptops need full-disk encryption and a screen lock after five minutes of inactivity.\n- Operating system security updates must be installed within 7 days of release.\n- Personal devices may reach company email only through the approved mobile management app, and company data must never be stored on personal USB drives.\n- Lost or stolen devices must be reported to the IT Service Desk within 24 hours so they can be wiped {13}."}, {"key": "hr204", "group": "Exact policy ID", "question": "HR-204", "tokens": ["hr-204"], "semantic_ranked": [[3, 0.3974], [2, 0.3184], [8, 0.2879], [6, 0.2878], [1, 0.2656], [4, 0.2534], [9, 0.2443], [7, 0.2394], [10, 0.234], [5, 0.2059], [12, 0.1935], [19, 0.17], [14, 0.1666], [18, 0.1638], [20, 0.1419], [11, 0.0957], [15, 0.0844], [13, 0.0701], [16, 0.0664], [17, -0.036]], "bm25_ranked": [[3, 2.3338]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 3, "semantic_score": 0.3974, "bm25_score": 2.3338, "rrf_score": 0.032787}, {"chunk_id": 2, "semantic_score": 0.3184, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 8, "semantic_score": 0.2879, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 6, "semantic_score": 0.2878, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 1, "semantic_score": 0.2656, "bm25_score": null, "rrf_score": 0.015385}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 3, "semantic_score": 0.3974, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 2, "semantic_score": 0.3184, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 8, "semantic_score": 0.2879, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 6, "semantic_score": 0.2878, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 1, "semantic_score": 0.2656, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 3, "semantic_score": null, "bm25_score": 2.3338, "rrf_score": 0.016393}]}}, "answer": "HR-204 is the annual leave policy. Full-time employees get 24 days of paid leave per year on top of public holidays, plus two extra days after five years of service {3}. Up to five unused days can be carried over, but they must be used by 31 March {3}."}, {"key": "te320", "group": "Exact policy ID", "question": "Explain TE-320", "tokens": ["explain", "te-320"], "semantic_ranked": [[19, 0.3453], [18, 0.2849], [20, 0.2347], [14, 0.1562], [10, 0.1169], [15, 0.1149], [12, 0.0958], [13, 0.0903], [8, 0.0857], [11, 0.0344], [7, 0.0323], [3, 0.0316], [6, 0.0282], [9, 0.0178], [16, 0.0013], [2, 0.0004], [1, -0.0117], [4, -0.0292], [5, -0.0357], [17, -0.1412]], "bm25_ranked": [[19, 2.5577]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 19, "semantic_score": 0.3453, "bm25_score": 2.5577, "rrf_score": 0.032787}, {"chunk_id": 18, "semantic_score": 0.2849, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 20, "semantic_score": 0.2347, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 14, "semantic_score": 0.1562, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": 0.1169, "bm25_score": null, "rrf_score": 0.015385}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 19, "semantic_score": 0.3453, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 18, "semantic_score": 0.2849, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 20, "semantic_score": 0.2347, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 14, "semantic_score": 0.1562, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": 0.1169, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 19, "semantic_score": null, "bm25_score": 2.5577, "rrf_score": 0.016393}]}}, "answer": "TE-320 covers ground transport and mileage. Use public transport where practical; taxis are allowed between 22:00 and 06:00, when carrying heavy equipment, or when public transport would add more than 45 minutes {19}. Business trips in your own car are reimbursed at 0.30 euros per kilometre, but commuting is not {19}."}, {"key": "leave", "group": "Paraphrased question", "question": "How many days of annual leave do full-time employees get?", "tokens": ["many", "days", "annual", "leave", "full-time", "employees", "get"], "semantic_ranked": [[3, 0.662], [4, 0.5407], [5, 0.525], [2, 0.4028], [8, 0.3899], [9, 0.3449], [6, 0.3427], [1, 0.3372], [7, 0.3243], [16, 0.2666], [18, 0.2494], [10, 0.2364], [20, 0.2314], [13, 0.2084], [17, 0.1684], [12, 0.1547], [19, 0.1353], [14, 0.1288], [11, 0.1027], [15, 0.0572]], "bm25_ranked": [[3, 9.0831], [5, 5.1683], [4, 4.6823], [6, 2.5222], [7, 1.5643], [8, 1.3122], [20, 1.2768], [2, 1.2272], [9, 1.2041], [16, 0.9019], [10, 0.7991], [17, 0.6873], [11, 0.6096], [14, 0.5983], [13, 0.591], [19, 0.5477], [18, 0.5326]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 3, "semantic_score": 0.662, "bm25_score": 9.0831, "rrf_score": 0.032787}, {"chunk_id": 4, "semantic_score": 0.5407, "bm25_score": 4.6823, "rrf_score": 0.032002}, {"chunk_id": 5, "semantic_score": 0.525, "bm25_score": 5.1683, "rrf_score": 0.032002}, {"chunk_id": 6, "semantic_score": 0.3427, "bm25_score": 2.5222, "rrf_score": 0.03055}, {"chunk_id": 8, "semantic_score": 0.3899, "bm25_score": 1.3122, "rrf_score": 0.030536}]}, "semantic": {"passes_gate": true, "results": [{"chunk_id": 3, "semantic_score": 0.662, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 4, "semantic_score": 0.5407, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 5, "semantic_score": 0.525, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 2, "semantic_score": 0.4028, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 8, "semantic_score": 0.3899, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 3, "semantic_score": null, "bm25_score": 9.0831, "rrf_score": 0.016393}, {"chunk_id": 5, "semantic_score": null, "bm25_score": 5.1683, "rrf_score": 0.016129}, {"chunk_id": 4, "semantic_score": null, "bm25_score": 4.6823, "rrf_score": 0.015873}, {"chunk_id": 6, "semantic_score": null, "bm25_score": 2.5222, "rrf_score": 0.015625}, {"chunk_id": 7, "semantic_score": null, "bm25_score": 1.5643, "rrf_score": 0.015385}]}}, "answer": "Full-time employees get 24 days of paid annual leave per calendar year, in addition to public holidays {3}. After five years of continuous service you receive two additional days each year {3}."}, {"key": "stock", "group": "Not in the documents", "question": "What is the company's share price today?", "tokens": ["company", "s", "share", "price", "today"], "semantic_ranked": [[20, 0.2074], [15, 0.1843], [11, 0.1813], [9, 0.1748], [18, 0.1746], [13, 0.1731], [6, 0.1681], [14, 0.163], [1, 0.1609], [4, 0.1604], [3, 0.1505], [16, 0.1408], [19, 0.1356], [7, 0.1273], [12, 0.0953], [10, 0.0893], [8, 0.0641], [17, 0.055], [5, 0.049], [2, 0.0376]], "bm25_ranked": [[6, 2.0682], [16, 1.7982], [20, 1.5273], [13, 0.6691], [10, 0.5612], [7, 0.4228], [19, 0.3846], [4, 0.3621], [1, 0.3473]], "modes": {"hybrid": {"passes_gate": true, "results": [{"chunk_id": 20, "semantic_score": 0.2074, "bm25_score": 1.5273, "rrf_score": 0.032266}, {"chunk_id": 6, "semantic_score": 0.1681, "bm25_score": 2.0682, "rrf_score": 0.031319}, {"chunk_id": 13, "semantic_score": 0.1731, "bm25_score": 0.6691, "rrf_score": 0.030777}, {"chunk_id": 16, "semantic_score": 0.1408, "bm25_score": 1.7982, "rrf_score": 0.030018}, {"chunk_id": 4, "semantic_score": 0.1604, "bm25_score": 0.3621, "rrf_score": 0.028992}]}, "semantic": {"passes_gate": false, "results": [{"chunk_id": 20, "semantic_score": 0.2074, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 15, "semantic_score": 0.1843, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 11, "semantic_score": 0.1813, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 9, "semantic_score": 0.1748, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 18, "semantic_score": 0.1746, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": true, "results": [{"chunk_id": 6, "semantic_score": null, "bm25_score": 2.0682, "rrf_score": 0.016393}, {"chunk_id": 16, "semantic_score": null, "bm25_score": 1.7982, "rrf_score": 0.016129}, {"chunk_id": 20, "semantic_score": null, "bm25_score": 1.5273, "rrf_score": 0.015873}, {"chunk_id": 13, "semantic_score": null, "bm25_score": 0.6691, "rrf_score": 0.015625}, {"chunk_id": 10, "semantic_score": null, "bm25_score": 0.5612, "rrf_score": 0.015385}]}}, "answer": null}, {"key": "banana", "group": "Not in the documents", "question": "What is the recipe for banana bread?", "tokens": ["recipe", "banana", "bread"], "semantic_ranked": [[17, 0.0084], [18, -0.0005], [1, -0.0183], [9, -0.0196], [13, -0.0207], [7, -0.032], [16, -0.0422], [8, -0.0424], [12, -0.0442], [15, -0.0484], [10, -0.0519], [14, -0.0537], [19, -0.0557], [4, -0.056], [6, -0.068], [11, -0.0704], [2, -0.0733], [3, -0.078], [20, -0.0791], [5, -0.0836]], "bm25_ranked": [], "modes": {"hybrid": {"passes_gate": false, "results": [{"chunk_id": 17, "semantic_score": 0.0084, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 18, "semantic_score": -0.0005, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 1, "semantic_score": -0.0183, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 9, "semantic_score": -0.0196, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 13, "semantic_score": -0.0207, "bm25_score": null, "rrf_score": 0.015385}]}, "semantic": {"passes_gate": false, "results": [{"chunk_id": 17, "semantic_score": 0.0084, "bm25_score": null, "rrf_score": 0.016393}, {"chunk_id": 18, "semantic_score": -0.0005, "bm25_score": null, "rrf_score": 0.016129}, {"chunk_id": 1, "semantic_score": -0.0183, "bm25_score": null, "rrf_score": 0.015873}, {"chunk_id": 9, "semantic_score": -0.0196, "bm25_score": null, "rrf_score": 0.015625}, {"chunk_id": 13, "semantic_score": -0.0207, "bm25_score": null, "rrf_score": 0.015385}]}, "keyword": {"passes_gate": false, "results": []}}, "answer": null}]

export const EVAL_ROWS: DemoEvalRow[] = [
 {
  "id": "q01",
  "question": "How much paid time off do I get each year?",
  "document": "Employee_Handbook.pdf",
  "page": 3,
  "type": "paraphrase",
  "ranks": {
   "semantic": 2,
   "keyword": 3,
   "hybrid": 2
  }
 },
 {
  "id": "q02",
  "question": "Can I roll over vacation days I didn't use?",
  "document": "Employee_Handbook.pdf",
  "page": 3,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 2,
   "hybrid": 1
  }
 },
 {
  "id": "q03",
  "question": "When do I need a doctor's note for being ill?",
  "document": "Employee_Handbook.pdf",
  "page": 4,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": null,
   "hybrid": 5
  }
 },
 {
  "id": "q04",
  "question": "How long is maternity leave and how much of it is paid?",
  "document": "Employee_Handbook.pdf",
  "page": 5,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q05",
  "question": "How long is the trial period for new hires?",
  "document": "Employee_Handbook.pdf",
  "page": 2,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q06",
  "question": "Is there money for training courses and conferences?",
  "document": "Employee_Handbook.pdf",
  "page": 6,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q07",
  "question": "What are the core working hours?",
  "document": "Employee_Handbook.pdf",
  "page": 1,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 2,
   "hybrid": 1
  }
 },
 {
  "id": "q08",
  "question": "How often am I allowed to work from home?",
  "document": "Remote_Work_Policy.pdf",
  "page": 2,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 3,
   "hybrid": 1
  }
 },
 {
  "id": "q09",
  "question": "Will the company pay for a desk or chair for my home setup?",
  "document": "Remote_Work_Policy.pdf",
  "page": 3,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q10",
  "question": "Can I work from abroad for a few weeks?",
  "document": "Remote_Work_Policy.pdf",
  "page": 2,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q11",
  "question": "Do I have to use the VPN when I'm not in the office?",
  "document": "Remote_Work_Policy.pdf",
  "page": 4,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q12",
  "question": "How long must my login password be?",
  "document": "IT_Security_Policy.pdf",
  "page": 2,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q13",
  "question": "Who do I tell if I clicked on a suspicious link in an email?",
  "document": "IT_Security_Policy.pdf",
  "page": 5,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q14",
  "question": "Can I email customer shipment data to a partner as an attachment?",
  "document": "IT_Security_Policy.pdf",
  "page": 4,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q15",
  "question": "How quickly must laptop operating system patches be applied?",
  "document": "IT_Security_Policy.pdf",
  "page": 3,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q16",
  "question": "How long are backups kept?",
  "document": "IT_Security_Policy.pdf",
  "page": 4,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q17",
  "question": "What is the maximum I can spend on a hotel room in Paris?",
  "document": "Travel_Expense_Policy.pdf",
  "page": 2,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q18",
  "question": "How much is the daily meal allowance on business trips?",
  "document": "Travel_Expense_Policy.pdf",
  "page": 2,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q19",
  "question": "Can I take a taxi late at night on a work trip?",
  "document": "Travel_Expense_Policy.pdf",
  "page": 3,
  "type": "paraphrase",
  "ranks": {
   "semantic": 2,
   "keyword": null,
   "hybrid": null
  }
 },
 {
  "id": "q20",
  "question": "What happens if I submit my expense claim very late?",
  "document": "Travel_Expense_Policy.pdf",
  "page": 4,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q21",
  "question": "Can I fly business class?",
  "document": "Travel_Expense_Policy.pdf",
  "page": 1,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q22",
  "question": "What is the cash withdrawal limit on a corporate card?",
  "document": "Travel_Expense_Policy.pdf",
  "page": 4,
  "type": "paraphrase",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q23",
  "question": "HR-204",
  "document": "Employee_Handbook.pdf",
  "page": 3,
  "type": "identifier",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q24",
  "question": "What does SEC-117 say?",
  "document": "IT_Security_Policy.pdf",
  "page": 3,
  "type": "identifier",
  "ranks": {
   "semantic": 4,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q25",
  "question": "RW-120",
  "document": "Remote_Work_Policy.pdf",
  "page": 3,
  "type": "identifier",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q26",
  "question": "TE-320 rules",
  "document": "Travel_Expense_Policy.pdf",
  "page": 3,
  "type": "identifier",
  "ranks": {
   "semantic": 1,
   "keyword": 2,
   "hybrid": 1
  }
 },
 {
  "id": "q27",
  "question": "Explain policy HR-230",
  "document": "Employee_Handbook.pdf",
  "page": 5,
  "type": "identifier",
  "ranks": {
   "semantic": null,
   "keyword": 1,
   "hybrid": 5
  }
 },
 {
  "id": "q28",
  "question": "SEC-130",
  "document": "IT_Security_Policy.pdf",
  "page": 5,
  "type": "identifier",
  "ranks": {
   "semantic": 1,
   "keyword": 1,
   "hybrid": 1
  }
 },
 {
  "id": "q29",
  "question": "What is covered by HR-110?",
  "document": "Employee_Handbook.pdf",
  "page": 2,
  "type": "identifier",
  "ranks": {
   "semantic": null,
   "keyword": 2,
   "hybrid": 1
  }
 },
 {
  "id": "q30",
  "question": "TE-310",
  "document": "Travel_Expense_Policy.pdf",
  "page": 2,
  "type": "identifier",
  "ranks": {
   "semantic": 2,
   "keyword": 1,
   "hybrid": 1
  }
 }
]
