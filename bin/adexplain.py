#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
adexplain.py - MS Windows AD Objects

Streaming custom search command `adexplain`.

Renders a plain-English narrative for an AD entity from the KV Store / entity
fields ALREADY PRESENT ON THE ROW.  It reads no index, opens no lookup, and
sends nothing but explicitly allowlisted fields to a model.

    | inputlookup AD_Obj_User
    | search adminCount=1
    | adexplain entity_field=cn

    | inputlookup AD_Obj_Risk
    | adexplain entity_field=entity

Emitted fields:
    ai_narrative        the description
    ai_model            model name when the LLM produced it, else "template"
    ai_status           llm | template | template_<reason>  (see ad_obj_llm_lib)
    ai_grounding_fields comma list of the fields that were allowed into the prompt
    ai_reason           short machine-readable explanation of ai_status

WORKS WITH NO LLM.  With the shipped ad_obj_ai.conf (enabled=0, provider=none)
every row gets a deterministic, rule-based narrative built from the UAC decoder,
the group-nesting chain and the recent-change summary, and ai_status=template.
That is the normal, supported state - not an error.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ad_obj_llm_lib as lib  # noqa: E402  (must follow the path bootstrap)
from ad_obj_uac_decode import decode_uac  # noqa: E402

from splunklib.searchcommands import (  # noqa: E402
    dispatch, StreamingCommand, Configuration, Option, validators,
)


TASK = (
    "Write one short paragraph (2-4 sentences) of plain English describing this "
    "Active Directory object for a security analyst. Cover, only where the "
    "grounding supplies it: what kind of object it is and whether it is enabled; "
    "what its userAccountControl flags mean in practice; how it reaches any "
    "privileged or critical group, including nesting depth; what changed about it "
    "recently; and any risk score with its evidence. Do not speculate about "
    "intent. Do not recommend any action."
)


def _first(record, names):
    """First non-empty value among `names` on the row."""
    for name in names:
        if name in record:
            value = record.get(name)
            if isinstance(value, (list, tuple)):
                value = "; ".join(str(v) for v in value if v not in (None, ""))
            text = "" if value is None else str(value).strip()
            if text:
                return text
    return ""


def _fmt_epoch(value):
    """Render an epoch-ish value as a date, or pass the original text through."""
    try:
        import time as _time
        number = float(str(value).strip())
        if number > 100000000:  # plausible epoch seconds
            return _time.strftime("%Y-%m-%d", _time.localtime(number))
    except (TypeError, ValueError):
        pass
    return str(value)


def _nesting_sentence(chain, depth, critical, reach):
    """Deterministic group-nesting summary."""
    parts = []
    if chain:
        hops = [h.strip() for h in chain.replace("->", ">").split(">") if h.strip()]
        if len(hops) > 1:
            parts.append(
                "It reaches {0} through a {1}-level nesting chain ({2})".format(
                    hops[-1], len(hops) - 1, " > ".join(hops)))
        else:
            parts.append("It is a direct member of {0}".format(hops[0]))
    elif critical:
        parts.append("It has a membership path to the critical group {0}".format(
            critical))
    if depth:
        parts.append("minimum nesting depth to a Tier-0/critical group is {0}".format(
            depth))
    if reach:
        parts.append("it can reach {0} critical group(s) in total".format(reach))
    if not parts:
        return ""
    return ". ".join([parts[0]] + parts[1:]).rstrip(".") + "."


def _change_sentence(change_summary, change_count, changed_attrs, when_changed):
    parts = []
    if change_count:
        parts.append("{0} change(s) were recorded".format(change_count))
    if changed_attrs:
        parts.append("affecting {0}".format(changed_attrs))
    if change_summary and change_summary not in (changed_attrs,):
        parts.append("summarised as: {0}".format(change_summary))
    if when_changed:
        parts.append("most recent directory update {0}".format(_fmt_epoch(when_changed)))
    if not parts:
        return ""
    return "Recent activity: " + ", ".join(parts) + "."


def _risk_sentence(risk_type, risk_score, model, evidence, mitre, last_scored):
    if not (risk_type or risk_score):
        return ""
    bits = []
    if risk_type and risk_score:
        bits.append("a {0} risk score of {1}".format(risk_type, risk_score))
    elif risk_score:
        bits.append("a risk score of {0}".format(risk_score))
    else:
        bits.append("a {0} risk finding".format(risk_type))
    if model:
        bits.append("from model {0}".format(model))
    if mitre:
        bits.append("mapped to MITRE ATT&CK {0}".format(mitre))
    if last_scored:
        bits.append("last scored {0}".format(_fmt_epoch(last_scored)))
    sentence = "This object carries " + ", ".join(bits) + "."
    if evidence:
        sentence += " Evidence recorded with the score: {0}.".format(evidence)
    return sentence


def template_narrative(record, entity_field, uac_field, chain_field, changes_field):
    """The deterministic path. No LLM, no network, no I/O.

    This is what every row gets when AI is disabled, and what every row falls
    back to when an enabled provider fails, times out, or returns junk.
    """
    entity = _first(record, [entity_field, "entity", "cn", "sAMAccountName",
                             "displayName", "dn", "distinguishedName"]) or "This object"
    entity_type = _first(record, ["entity_type", "objectClass", "user_type"])
    domain = _first(record, ["domain", "DomainDNSName"])
    ou = _first(record, ["OU", "dn_path"])

    sentences = []

    header = entity
    if entity_type:
        header += " ({0})".format(entity_type)
    if domain:
        header += " in domain {0}".format(domain)
    if ou:
        header += ", OU {0}".format(ou)

    uac_raw = _first(record, [uac_field, "userAccountControl"])
    uac_details = _first(record, ["uac_details"])

    if uac_raw:
        decoded = decode_uac(uac_raw)
        if decoded["decoded"]:
            state = "enabled" if decoded["enabled"] else "disabled"
            type_text = {
                "user": "a normal user account",
                "computer": "a workstation trust (computer) account",
                "domain_controller_or_server_trust": "a server trust account",
                "interdomain_trust": "an interdomain trust account",
            }.get(decoded["account_type"], "an account of undetermined type")
            sentences.append("{0} is {1} and is {2} (userAccountControl={3}).".format(
                header, state, type_text, decoded["userAccountControl"]))
            extras = [f for f in decoded["flags"] if f not in (
                "Enabled", "Disabled", "Normal User Account",
                "Workstation Trust Account", "Server Trust Account",
                "InterDomain Trust Account")]
            if extras:
                sentences.append("Account control flags set: {0}.".format(
                    ", ".join(extras)))
            if decoded["notes"]:
                sentences.append("In practice this means {0}.".format(
                    "; ".join(decoded["notes"])))
        else:
            sentences.append("{0}.".format(header))
            sentences.append("The supplied userAccountControl value could not be "
                             "decoded, so account flags are not described.")
    elif uac_details:
        sentences.append("{0} has account control flags: {1}.".format(
            header, uac_details.replace(":", ", ")))
    else:
        sentences.append("{0}.".format(header))

    admin_count = _first(record, ["adminCount"])
    critical_flag = _first(record, ["isCriticalSystemObject"])
    posture = []
    if admin_count in ("1", "1.0", "true", "TRUE"):
        posture.append("adminCount=1, so it is (or has been) protected by AdminSDHolder")
    if critical_flag in ("1", "TRUE", "true"):
        posture.append("it is flagged as a critical system object")
    spn = _first(record, ["servicePrincipalName"])
    if spn:
        posture.append("it has service principal name(s) registered ({0})".format(spn))
    if _first(record, ["isDeleted"]) in ("TRUE", "true", "1"):
        posture.append("the object is marked deleted in the directory")
    if posture:
        sentences.append("Directory posture: " + "; ".join(posture) + ".")

    nesting = _nesting_sentence(
        _first(record, [chain_field, "group_nesting_chain", "nesting_chain", "path"]),
        _first(record, ["nesting_depth", "min_depth"]),
        _first(record, ["critical_group", "critical_groups"]),
        _first(record, ["critical_reach", "reach_count"]))
    if nesting:
        sentences.append(nesting)
    else:
        member_of = _first(record, ["memberOf"])
        if member_of:
            sentences.append("Group membership recorded on this record: {0}.".format(
                member_of))
        member_count = _first(record, ["membercount"])
        if member_count:
            sentences.append("The group has {0} member(s).".format(member_count))

    change = _change_sentence(
        _first(record, [changes_field, "change_summary", "recent_changes"]),
        _first(record, ["change_count"]),
        _first(record, ["changed_attributes"]),
        _first(record, ["whenChanged"]))
    if change:
        sentences.append(change)

    risk = _risk_sentence(
        _first(record, ["risk_type", "risk_types"]),
        _first(record, ["risk_score", "peak_risk_score"]),
        _first(record, ["model"]),
        _first(record, ["evidence"]),
        _first(record, ["mitre_technique_id"]),
        _first(record, ["last_scored"]))
    if risk:
        sentences.append(risk)

    text = " ".join(s for s in sentences if s).strip()
    if len(sentences) <= 1:
        text += (" No further allowed attributes were present on this row, so there "
                 "is nothing more to describe.")
    return text


@Configuration()
class AdExplainCommand(StreamingCommand):
    """Plain-English narrative for AD entities, grounded on the passed-in row.

    ##Syntax
    .. code-block::
        adexplain [entity_field=<field>] [uac_field=<field>]
                  [chain_field=<field>] [changes_field=<field>]
                  [mode=(auto|template|llm)]

    ##Description
    Adds ai_narrative / ai_model / ai_status / ai_grounding_fields to each row.
    Uses only fields present on the row and permitted by
    ad_obj_ai.conf:allowed_grounding_fields. Never executes anything.
    """

    entity_field = Option(
        doc="Field holding the entity name. Default: entity.",
        require=False, default="entity", validate=validators.Fieldname())

    uac_field = Option(
        doc="Field holding the userAccountControl integer. Default: userAccountControl.",
        require=False, default="userAccountControl", validate=validators.Fieldname())

    chain_field = Option(
        doc="Field holding the group-nesting chain. Default: group_nesting_chain.",
        require=False, default="group_nesting_chain", validate=validators.Fieldname())

    changes_field = Option(
        doc="Field holding the recent-change summary. Default: change_summary.",
        require=False, default="change_summary", validate=validators.Fieldname())

    mode = Option(
        doc="auto (default) | template (never call a model) | llm (call, still "
            "falls back to template on any failure).",
        require=False, default="auto")

    def __init__(self):
        StreamingCommand.__init__(self)
        self._client = None
        self._config = None
        self._prepared = False

    # -- setup -------------------------------------------------------------

    def _prepare(self):
        if self._prepared:
            return
        self._prepared = True

        self._config = lib.load_config()

        searchinfo = getattr(self.metadata, "searchinfo", None)
        username = getattr(searchinfo, "username", "") or ""
        app = getattr(searchinfo, "app", "") or lib.APP_NAME

        # Capability gate. Deny on absence AND on inability to verify.
        denial = lib.require_capability(self.service)
        if denial:
            raise RuntimeError(denial)

        self._client = lib.LlmClient(
            self._config, service=self.service,
            command="adexplain", user=username, app=app)

    # -- per-row -----------------------------------------------------------

    def _explain(self, record):
        template_text = template_narrative(
            record, self.entity_field, self.uac_field,
            self.chain_field, self.changes_field)

        mode = str(self.mode or "auto").strip().lower()
        if mode == "template" or not self._client.active():
            status = (lib.STATUS_TEMPLATE if mode == "template"
                      else self._client.inactive_result().status)
            reason = ("mode=template requested" if mode == "template"
                      else self._client.inactive_result().reason)
            return template_text, "template", status, "", reason

        grounding, used, _truncated = lib.build_grounding(
            record, self._config.allowed_grounding_fields,
            max_chars=self._config.max_input_chars)

        result = self._client.generate(
            TASK, grounding, "narrative",
            screen=lambda data: lib.screen_narrative(data.get("narrative", "")))

        if result.ok:
            narrative = result.data.get("narrative", "").strip()
            observations = result.data.get("key_observations") or []
            if observations:
                narrative += " Key points: " + "; ".join(
                    str(o) for o in observations) + "."
            return (narrative, result.model, lib.STATUS_LLM,
                    ",".join(used), "ok")

        # Fail closed: deterministic text, never the raw model output.
        return (template_text, "template", result.status,
                ",".join(used), result.reason)

    def stream(self, records):
        self._prepare()
        for record in records:
            try:
                narrative, model, status, used, reason = self._explain(record)
            except Exception as exc:  # noqa: BLE001 - one bad row must not kill the search
                narrative = template_narrative(
                    record, self.entity_field, self.uac_field,
                    self.chain_field, self.changes_field)
                model, status = "template", lib.STATUS_ERROR
                used, reason = "", "row processing error ({0})".format(
                    type(exc).__name__)

            if not narrative:
                narrative = ("No allowed entity fields were present on this row, so "
                             "no description could be built.")

            record["ai_narrative"] = narrative
            record["ai_model"] = model
            record["ai_status"] = status
            record["ai_grounding_fields"] = used
            record["ai_reason"] = reason
            yield record


dispatch(AdExplainCommand, sys.argv, sys.stdin, sys.stdout, __name__)
