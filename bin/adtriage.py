#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
adtriage.py - MS Windows AD Objects

Streaming custom search command `adtriage`.

Turns a row from the AD_Obj_Risk KV Store collection (or any equivalent
model-flagged row) into a who / what / when / blast-radius triage paragraph.

    | inputlookup AD_Obj_Risk
    | where risk_score > 0.8
    | adtriage

    | inputlookup AD_Obj_Risk
    | stats max(risk_score) AS peak_risk_score values(risk_type) AS risk_types
        by entity, entity_type, domain
    | adtriage entity_field=entity

Emitted fields (all input fields are preserved):
    ai_triage           the triage paragraph
    ai_status           llm | template | template_<reason>
    ai_model            model name when the LLM produced it, else "template"
    ai_grounding_fields comma list of the fields allowed into the prompt
    ai_reason           short machine-readable explanation of ai_status

Same guarantees as adexplain: descriptive text only, fail-closed to a
deterministic template, and the underlying SPL/KV values stay on the row beside
the narrative so an analyst always sees the source data.
"""

from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ad_obj_llm_lib as lib  # noqa: E402
from ad_obj_uac_decode import decode_uac  # noqa: E402

from splunklib.searchcommands import (  # noqa: E402
    dispatch, StreamingCommand, Configuration, Option, validators,
)


TASK = (
    "Write one triage paragraph (3-6 sentences) for a SOC analyst about this "
    "model-flagged Active Directory risk row. Structure it as WHO (the entity and "
    "what kind of object it is), WHAT (the risk type, the score, and the recorded "
    "evidence), WHEN (first seen and last scored), and BLAST RADIUS (what "
    "privileged access or group reach the grounding shows, and what that scope "
    "means). State plainly where the grounding does not tell you something. "
    "Describe only - do not recommend, instruct, or prioritise any response action."
)

# Human-readable framing for the risk types Phase 1 writes.
_RISK_TYPE_TEXT = {
    "change_velocity": (
        "an unusual volume of directory changes relative to this account's own "
        "learned daily baseline (MLTK DensityFunction)"),
    "peer_logon_deviation": (
        "logon/event behaviour that diverges from the account's KMeans peer "
        "cluster"),
    "priv_path_change": (
        "a change in the account's or group's privilege path toward a Tier-0 / "
        "critical group"),
}

_MITRE_TEXT = {
    "T1098": "Account Manipulation",
    "T1078": "Valid Accounts",
    "T1078.002": "Valid Accounts: Domain Accounts",
    "T1484": "Domain or Tenant Policy Modification",
    "T1069": "Permission Groups Discovery",
}


def _first(record, names):
    for name in names:
        if name in record:
            value = record.get(name)
            if isinstance(value, (list, tuple)):
                value = "; ".join(str(v) for v in value if v not in (None, ""))
            text = "" if value is None else str(value).strip()
            if text:
                return text
    return ""


def _fmt_time(value):
    try:
        number = float(str(value).strip())
        if number > 100000000:
            return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(number))
    except (TypeError, ValueError):
        pass
    return str(value or "")


def template_triage(record, entity_field):
    """The deterministic triage paragraph. No LLM, no network."""
    entity = _first(record, [entity_field, "entity", "cn", "sAMAccountName"]) \
        or "an unnamed entity"
    entity_type = _first(record, ["entity_type", "objectClass"]) or "object"
    domain = _first(record, ["domain", "DomainDNSName"])

    risk_type = _first(record, ["risk_type", "risk_types"])
    risk_score = _first(record, ["risk_score", "peak_risk_score"])
    model = _first(record, ["model"])
    model_version = _first(record, ["model_version"])
    evidence = _first(record, ["evidence"])
    mitre = _first(record, ["mitre_technique_id"])
    first_seen = _first(record, ["first_seen"])
    last_scored = _first(record, ["last_scored"])

    sentences = []

    # WHO
    who = "WHO: {0} is a {1}".format(entity, entity_type)
    if domain:
        who += " in domain {0}".format(domain)
    admin_count = _first(record, ["adminCount"])
    if admin_count in ("1", "1.0", "true", "TRUE"):
        who += ", flagged adminCount=1 (AdminSDHolder-protected)"
    uac_raw = _first(record, ["userAccountControl"])
    if uac_raw:
        decoded = decode_uac(uac_raw)
        if decoded["decoded"]:
            who += "; the account is {0}".format(
                "enabled" if decoded["enabled"] else "disabled")
            extras = [f for f in decoded["flags"] if f not in (
                "Enabled", "Disabled", "Normal User Account",
                "Workstation Trust Account", "Server Trust Account",
                "InterDomain Trust Account")]
            if extras:
                who += " with flags {0}".format(", ".join(extras))
    sentences.append(who + ".")

    # WHAT
    what_bits = []
    if risk_type:
        detail = _RISK_TYPE_TEXT.get(risk_type)
        what_bits.append("risk_type={0}{1}".format(
            risk_type, " - {0}".format(detail) if detail else ""))
    if risk_score:
        what_bits.append("risk_score={0}".format(risk_score))
    if model:
        what_bits.append("scored by model {0}{1}".format(
            model, " v{0}".format(model_version) if model_version else ""))
    if mitre:
        names = [_MITRE_TEXT.get(t.strip(), "") for t in mitre.replace("|", ",").split(",")]
        pretty = ", ".join(
            "{0}{1}".format(t.strip(), " ({0})".format(n) if n else "")
            for t, n in zip(mitre.replace("|", ",").split(","), names) if t.strip())
        what_bits.append("MITRE ATT&CK {0}".format(pretty))
    if what_bits:
        sentences.append("WHAT: " + "; ".join(what_bits) + ".")
    else:
        sentences.append("WHAT: the row carries no risk_type or risk_score, so the "
                         "nature of the finding is not recorded.")
    if evidence:
        sentences.append("Evidence stored with the score: {0}.".format(evidence))

    # WHEN
    when_bits = []
    if first_seen:
        when_bits.append("first seen {0}".format(_fmt_time(first_seen)))
    if last_scored:
        when_bits.append("last scored {0}".format(_fmt_time(last_scored)))
    scored_days = _first(record, ["scored_days", "risk_rows"])
    if scored_days:
        when_bits.append("{0} risk row(s) recorded in the window".format(scored_days))
    sentences.append("WHEN: " + (", ".join(when_bits) if when_bits
                                 else "no first_seen / last_scored timestamps are "
                                      "present on this row") + ".")

    # BLAST RADIUS
    blast = []
    chain = _first(record, ["group_nesting_chain", "nesting_chain", "path"])
    depth = _first(record, ["nesting_depth", "min_depth"])
    critical = _first(record, ["critical_group", "critical_groups"])
    reach = _first(record, ["critical_reach", "reach_count"])
    member_count = _first(record, ["membercount"])
    if chain:
        hops = [h.strip() for h in chain.replace("->", ">").split(">") if h.strip()]
        blast.append("membership path {0} ({1} level(s) of nesting)".format(
            " > ".join(hops), max(len(hops) - 1, 0)))
    if critical:
        blast.append("reaches critical group(s) {0}".format(critical))
    if depth:
        blast.append("minimum depth {0} to a Tier-0/critical group".format(depth))
    if reach:
        blast.append("{0} critical group(s) reachable".format(reach))
    if member_count and str(entity_type).lower() == "group":
        blast.append("the group itself holds {0} member(s), so any change here "
                     "propagates to all of them".format(member_count))
    spn = _first(record, ["servicePrincipalName"])
    if spn:
        blast.append("service principal name(s) registered ({0}), so the account "
                     "backs a service".format(spn))
    if blast:
        sentences.append("BLAST RADIUS: " + "; ".join(blast) + ".")
    else:
        sentences.append("BLAST RADIUS: this row carries no group-nesting or "
                         "privilege-path fields, so effective reach cannot be "
                         "stated from the data supplied.")

    return " ".join(sentences)


@Configuration()
class AdTriageCommand(StreamingCommand):
    """Who / what / when / blast-radius triage narrative for risk rows.

    ##Syntax
    .. code-block::
        adtriage [entity_field=<field>] [mode=(auto|template|llm)]

    ##Description
    Adds ai_triage / ai_status / ai_model / ai_grounding_fields / ai_reason to
    each row and preserves every input field. Descriptive only; never executes
    anything; falls back to a deterministic template on any failure.
    """

    entity_field = Option(
        doc="Field holding the entity name. Default: entity.",
        require=False, default="entity", validate=validators.Fieldname())

    mode = Option(
        doc="auto (default) | template (never call a model) | llm.",
        require=False, default="auto")

    def __init__(self):
        StreamingCommand.__init__(self)
        self._client = None
        self._config = None
        self._prepared = False

    def _prepare(self):
        if self._prepared:
            return
        self._prepared = True

        self._config = lib.load_config()

        searchinfo = getattr(self.metadata, "searchinfo", None)
        username = getattr(searchinfo, "username", "") or ""
        app = getattr(searchinfo, "app", "") or lib.APP_NAME

        denial = lib.require_capability(self.service)
        if denial:
            raise RuntimeError(denial)

        self._client = lib.LlmClient(
            self._config, service=self.service,
            command="adtriage", user=username, app=app)

    def _triage(self, record):
        template_text = template_triage(record, self.entity_field)

        mode = str(self.mode or "auto").strip().lower()
        if mode == "template" or not self._client.active():
            inactive = self._client.inactive_result()
            status = lib.STATUS_TEMPLATE if mode == "template" else inactive.status
            reason = ("mode=template requested" if mode == "template"
                      else inactive.reason)
            return template_text, "template", status, "", reason

        grounding, used, _truncated = lib.build_grounding(
            record, self._config.allowed_grounding_fields,
            max_chars=self._config.max_input_chars)

        result = self._client.generate(
            TASK, grounding, "triage",
            screen=lambda data: lib.screen_narrative(data.get("triage", "")))

        if result.ok:
            triage = result.data.get("triage", "").strip()
            blast = result.data.get("blast_radius")
            if blast:
                triage += " Blast radius: {0}".format(blast)
            return triage, result.model, lib.STATUS_LLM, ",".join(used), "ok"

        return template_text, "template", result.status, ",".join(used), result.reason

    def stream(self, records):
        self._prepare()
        for record in records:
            try:
                triage, model, status, used, reason = self._triage(record)
            except Exception as exc:  # noqa: BLE001
                triage = template_triage(record, self.entity_field)
                model, status = "template", lib.STATUS_ERROR
                used, reason = "", "row processing error ({0})".format(
                    type(exc).__name__)

            if not triage:
                triage = ("No allowed risk fields were present on this row, so no "
                          "triage narrative could be built.")

            # Input fields are never removed - only these are added.
            record["ai_triage"] = triage
            record["ai_status"] = status
            record["ai_model"] = model
            record["ai_grounding_fields"] = used
            record["ai_reason"] = reason
            yield record


dispatch(AdTriageCommand, sys.argv, sys.stdin, sys.stdout, __name__)
