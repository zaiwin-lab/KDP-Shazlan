# Syahlan Digital Web Builder

> **Portfolio maturity:** Functional Pilot Workflow · Pre-Production Security Review Required

[Open the verified live platform](https://syahlansdc.com)

**Syahlan Digital Web Builder** is a multilingual website-intake and delivery workflow for entrepreneurs who need help turning business information into a professional web presence.

The repository demonstrates a public onboarding journey, internal delivery pipeline and optional serverless integrations. It must not be treated as production-ready for real customer data until the security issues below are resolved.

## Business problem

Entrepreneurs and small organisations may understand the value of a website but struggle to organise their content, choose a package, submit files, manage payment and follow progress. Delivery teams then inherit scattered messages, attachments and unclear hand-offs.

The platform converts that work into one structured journey from business profile to website preview and activation.

## Intended users

- entrepreneurs and small organisations preparing a business website;
- intake staff reviewing submissions and profile readiness;
- content specialists producing a structured Profile2Website brief;
- web builders preparing, previewing and handing off the final site;
- supervisors monitoring lead stage, payment and delivery progress.

## What is implemented

### Public journey

- responsive, multilingual presentation in Bahasa Melayu, English, Mandarin and Iban;
- guided business-profile intake and deterministic profile-readiness score;
- file selection and submission flow;
- package presentation and payment hand-off;
- privacy page and language persistence in the browser.

### Delivery workspace

- lead list, search, filters, editable stages and CSV export;
- KSA/KSB ZIP-pack generation for structured hand-offs;
- client preview links and WhatsApp/email hand-offs;
- payment-status display and delivery pipeline guidance.

### Conditional serverless integrations

When the required environment variables are configured, Netlify Functions can use:

- Netlify Blobs as the primary submission store;
- Supabase Postgres as a best-effort record mirror;
- a public Supabase Storage bucket for uploaded files;
- Google Drive folder creation and optional OAuth file upload;
- ToyyibPay bill creation and payment callback handling;
- WATI template notification for a new lead.

These integrations are evidenced in source code; this review does not confirm that every service is configured in the live deployment.

## AI boundary

The repository does not contain a model call for its public “AI” summary or readiness score. Those results are produced by deterministic browser logic. NotebookLM appears in the internal operating instructions as a manual downstream step, not an embedded autonomous capability.

## Strategic value

The workflow demonstrates how a small web-service team could standardise intake, content preparation, build hand-off, payment tracking and client communication. Its strongest value is operational orchestration rather than generative AI.

## Technology

HTML5 · CSS · Vanilla JavaScript · Netlify Functions · Netlify Blobs · Supabase REST and Storage · Google Drive API · ToyyibPay · WATI · JSZip

## Delivery role

Product strategy, customer journey, solution direction and delivery leadership are provided by **Ts. Zaiwin Kassim** with the **KOBIS AI Prodigy Team**, using supervised AI-assisted development.

This statement does not claim programme ownership, endorsement, participant numbers, revenue, service outcomes or production readiness.

## Responsible use and critical limitations

**Do not collect real customer data through the current build until these controls are implemented and independently tested:**

- server-side authentication and role-based authorisation for the dashboard and every read, update and delete operation;
- restricted CORS instead of universal `Access-Control-Allow-Origin: *`;
- private file storage with signed, expiring downloads instead of a public bucket;
- per-record access control, audit logs and tested backup/recovery;
- upload size, type and malware validation;
- rate limiting, abuse protection and secure error handling;
- payment callback authenticity verification and reconciliation;
- data-minimisation, consent, privacy, retention and deletion procedures;
- separation of operational secrets and removal of any public infrastructure identifiers that are not required;
- accessibility, security and native-language review;
- written approval for all programme, organiser and partner wording.

The dashboard currently relies on client-side access controls while the serverless submission endpoint exposes list, create, update and delete behaviours without evidenced server-side authorisation. Supabase uploads are configured for a public bucket. These are material pre-production risks, not minor hardening items.

## Local review

The front end is static. Serverless features require authorised environment variables and connected services. Review `.env` requirements and integration ownership before running any workflow that stores personal or payment-related data.
