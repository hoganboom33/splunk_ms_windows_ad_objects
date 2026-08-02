# MS Windows AD Objects — Splunk App

**Version 5.0.0** · Splunk Application for Active Directory object intelligence, behavioral ML, and safety-gated GenAI/LLM analytics.

> Turns Windows AD monitor (`admon`) data collected from Domain Controllers into continuously maintained, human-readable AD object inventories in KV Store — then layers machine-learning risk scoring and an optional, fail-closed LLM explanation layer on top.

---

## What this app does

Raw Windows Security event logs are hard to read: a `4728` tells you a member was added to a group, but not that the group is nested three levels inside **Domain Admins**, or that the target is a service account with a non-expiring password. This app solves that by building a durable **entity layer** for Active Directory and using it to enrich everything downstream.

- **Entity inventories in KV Store** — users, groups, computers, OUs, GPOs, domains, and an admin-audit trail, kept current from `admon` sync/update/delete events. Decodes GUIDs and `userAccountControl` bitmaps into plain language.
- **Cloud-safe by design** — uses `admon` data captured at the DC instead of requiring inbound LDAP (port 389) from Splunk Cloud to your Domain Controllers.
- **Change auditing & privileged-access monitoring** — who changed which object, when, from where; group-membership drift; admin login ratios and session tracking; critical-object watch lists.
- **62 dashboards, 150+ saved searches**, an accelerated `MS_Windows_AD_Changes` data model, and a reusable enrichment lookup layer other apps (ES, ITSI, custom content) can consume.

### New in 5.0.0

| Area | Capability |
|---|---|
| **MITRE ATT&CK** | Every security-relevant saved search mapped to technique(s) (T1098, T1484, T1078, T1069, …); ES-style annotations on high-value detections. |
| **ML feature engineering** | Daily per-entity feature searches (change velocity, logon-type vectors, admin-session features, group-membership deltas) written to a summary index. |
| **Behavioral ML models** | Change-velocity baselining (MLTK `DensityFunction`), peer-group logon scoring (`KMeans`), and pure-SPL privilege-path analytics — risk scores land in a new `AD_Obj_Risk` KV collection and feed the existing severity framework. |
| **Model ops** | Weekly fit / daily apply, drift detection, risk retention, and a Risk Overview dashboard with a model/schedule health panel. |
| **GenAI / LLM (optional)** | `adexplain`, `adtriage`, `adnl2spl` custom commands: plain-English entity narratives, alert triage, and NL→SPL suggestions — all **grounded, fail-closed, and descriptive-only**. |
| **Evaluation harness** | A labeled eval set + scoring search so admins measure their own precision / recall / F1 per risk type. |

See [`appserver/static/5.0.0_release_notes.md`](appserver/static/5.0.0_release_notes.md) for the complete changelog.

---

## Requirements

| Component | Requirement |
|---|---|
| Splunk | Enterprise 9.2+ or Splunk Cloud |
| Add-on | Splunk Add-on for Microsoft Windows **4+** (supplies `admon` / WinEventLog data) |
| ML models *(optional)* | Splunk Machine Learning Toolkit **5.4+** |
| Deep-learning / local LLM *(optional)* | Splunk App for Data Science and Deep Learning (DSDL) |
| Install target | Search head (standalone, distributed, or SHC) |

**The app is fully functional with no ML and no AI configured.** Every new capability ships **disabled by default**; the LLM layer falls back to deterministic, template-based narratives when no model is configured.

---

## Installation

1. Install the **Splunk Add-on for Microsoft Windows (v4+)** and get `admon` + WinEventLog data flowing from your Domain Controllers.
2. Install this app on your search head(s).
3. Walk the **Configuration → Configuration - Getting Data In** dashboard (five-step wizard: scope → prep → deploy → verify → build lookups).
4. *(Optional)* Enable ML: install MLTK 5.4+, enable the `AD Objects - ML Feature - *` searches, let ~30 days of data accrue (or backfill), then enable the `AD_Obj_ML_*` fit/apply searches. See the release notes for the full enablement order.
5. *(Optional)* Enable AI: configure `ad_obj_ai.conf`, store the endpoint credential via Splunk `storage/passwords`, and grant the `ad_obj_can_use_ai` capability. See [`README/ad_obj_ai.conf.spec`](README/ad_obj_ai.conf.spec).

---

## AI safety model

The optional GenAI/LLM layer is built fail-closed:

- **No secrets in config** — endpoint credentials are read only from Splunk `storage/passwords`; conf holds names, never values.
- **Capability-gated** — both AI and the NL→SPL panel require the `ad_obj_can_use_ai` capability.
- **Grounding allowlist** — only explicitly permitted KV fields can enter a prompt; sensitive fields are hard-denied.
- **No auto-execution** — generated SPL is **displayed for review only**, never run; unsafe commands are screened out before display.
- **Descriptive, not prescriptive** — narratives explain; they do not recommend actions.
- **Auditable** — every invocation logs a prompt hash, model, latency, and outcome (never the prompt content or credentials).

---

## Repository layout

```
default/            app.conf, savedsearches, macros, transforms, collections, data model, nav & views
default/data/ui/    dashboards (views) and navigation
bin/                Python 3 custom search commands (adexplain, adtriage, adnl2spl) + libs
lookups/            CSV lookups incl. MITRE map and ML eval set
samples/            sample admon / AD data
appserver/static/   dashboard assets + 5.0.0 release notes
metadata/           default.meta
README/             .conf.spec files
```

---

## Version history

- **5.0.0** — MITRE mapping, ML feature engineering, behavioral ML models + model ops, optional GenAI/LLM layer, evaluation harness. *(major)*
- **4.1.1** — Multi-domain lookup splitting, registry reports, dashboard/CSS fixes. *(prior release; see `README.txt` for full history)*

---

## Author & license

Originally authored by **Steve Hogan** (Splunk). Published on Splunkbase as [app 3177](https://splunkbase.splunk.com/app/3177). Sample data uses fictional demo identities (`*.sedemo.local`).

This repository is provided as-is for reference and continued development. Review your organization's requirements before deploying to production.
