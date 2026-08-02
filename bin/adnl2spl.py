#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
adnl2spl.py - MS Windows AD Objects

Streaming custom search command `adnl2spl`.

Translates a natural-language question into *suggested* SPL, grounded on this
app's own macro / lookup / KV-collection vocabulary.

    | makeresults
    | eval question="which service accounts logged on interactively this week?"
    | adnl2spl question_field=question

THE GENERATED SPL IS RETURNED AS A STRING FIELD AND IS NEVER EXECUTED.
There is no code path in this app that dispatches, evals, execs, or otherwise
runs the value of `generated_spl`. A human reads it, reviews it, and runs it
themselves if they choose to. In addition, any suggestion containing a
non-read-only SPL command (outputlookup, delete, collect, sendemail, script,
rest, ...) is rejected outright by ad_obj_llm_lib.screen_generated_spl and
replaced with a safe message - so an unsafe suggestion is not even displayed.

Emitted fields:
    nl_question         the question that was processed (redacted/normalised)
    generated_spl       the suggested SPL - REVIEW BEFORE RUNNING
    spl_notes           caveats from the model, or the template's explanation
    ai_status           llm | template | template_<reason>
    ai_model            model name when the LLM produced it, else "template"
    ai_grounding_fields the vocabulary categories used to ground the request
    spl_vocabulary      the specific macro/lookup names offered as grounding
    ai_warning          constant reviewer warning, shown on the dashboard
    ai_reason           short machine-readable explanation of ai_status

With AI disabled (ship default) the command returns a deterministic starter
query built from keyword matching against the app vocabulary, clearly labelled
as a template suggestion - so the panel is still useful with no model at all.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ad_obj_llm_lib as lib  # noqa: E402

from splunklib.searchcommands import (  # noqa: E402
    dispatch, StreamingCommand, Configuration, Option, validators,
)


WARNING = ("REVIEW BEFORE RUNNING - this SPL was generated as a suggestion and has "
           "NOT been executed, validated against your data, or checked for cost. "
           "Read it, adjust indexes/time ranges, and run it yourself.")

TASK = (
    "Translate the analyst's question into a single Splunk SPL search for the MS "
    "Windows AD Objects app. Prefer the lookups, KV collections and macros listed "
    "in CONTEXT over inventing names. The search must be READ-ONLY: never emit "
    "outputlookup, outputcsv, collect, delete, sendemail, script, rest, or any "
    "other command that writes, deletes, notifies, or reaches outside the search. "
    "If the question cannot be answered from this app's data, return a best-effort "
    "search and say so in notes. Put the SPL in the 'spl' field and any caveats in "
    "'notes'."
)

# Question -> deterministic starter query. Ordered; first match wins.
# These are hand-written, reviewed searches - the template path never invents SPL.
_TEMPLATE_RULES = (
    (("risk", "risky", "score", "anomal", "outlier", "flagged"),
     '| inputlookup AD_Obj_Risk\n'
     '| eval last_scored=tonumber(last_scored), risk_score=tonumber(risk_score)\n'
     '| where last_scored>=relative_time(now(),"-7d@d")\n'
     '| stats max(risk_score) AS peak_risk_score, values(risk_type) AS risk_types, '
     'values(mitre_technique_id) AS mitre_technique_id by entity, entity_type, domain\n'
     '| sort - peak_risk_score',
     "Starter query over the Phase 1 model risk collection AD_Obj_Risk."),

    (("password", "pwd", "expire", "never expires", "uac", "smartcard", "smart card",
      "delegation", "preauth", "pre-auth"),
     '| inputlookup AD_Obj_User\n'
     '| search uac_details="*Password Does Not Expire*"\n'
     '| table cn, sAMAccountName, domain, OU, uac_details, adminCount, '
     'lastLogonTimestamp\n'
     '| sort cn',
     "Starter query over the AD_Obj_User KV lookup filtering on the decoded "
     "uac_details string. Change the uac_details wildcard to the flag you want "
     "(for example \"*Password Not Required*\" or \"*Trusted for Delegation*\")."),

    (("logon", "logged on", "login", "sign in", "signin", "interactive", "session"),
     'index=wineventlog sourcetype=WinEventLog:Security EventCode=4624 '
     'earliest=-7d@d latest=now\n'
     '| lookup AD_Audit_Logon_Types Logon_Type OUTPUT logon_type_name\n'
     '| stats count, min(_time) AS first_seen, max(_time) AS last_seen '
     'by Account_Name, logon_type_name, ComputerName\n'
     '| lookup AD_Obj_User sAMAccountName AS Account_Name OUTPUT user_type, '
     'uac_details, adminCount\n'
     '| sort - count',
     "Starter query over Windows Security logon events joined to the AD_Obj_User "
     "inventory. Set Logon_Type=2 for interactive, 3 for network, 10 for RDP."),

    # "change" is matched before "group" so "what changed on privileged groups"
    # lands on the change-audit pattern rather than the group inventory.
    (("change", "changed", "modif", "delete", "created", "audit"),
     'index=wineventlog sourcetype=WinEventLog:Security earliest=-1d@d latest=now\n'
     '| lookup AD_Audit_Change_EventCodes EventCode OUTPUT change_type\n'
     '| search change_type=*\n'
     '| stats count, values(change_type) AS change_types by Subject_Account_Name, '
     'Account_Name\n'
     '| sort - count',
     "Starter query over AD change events classified by the "
     "AD_Audit_Change_EventCodes lookup. Add `Group_Name=*` to scope it to group "
     "membership changes."),

    (("group", "member", "nested", "nesting", "domain admin", "privileg", "tier-0",
      "tier 0", "admin"),
     '| inputlookup AD_Obj_Group\n'
     '| search membercount!="0"\n'
     '| table cn, sAMAccountName, domain, OU, groupType_Name, membercount, '
     'adminCount, whenChanged\n'
     '| sort - membercount',
     "Starter query over the AD_Obj_Group KV lookup. Join to ms_ad_obj_privpath "
     "with `| lookup ms_ad_obj_privpath entity` to add nesting depth to a "
     "critical group."),

    (("computer", "workstation", "server", "host", "machine", "stale"),
     '| inputlookup AD_Obj_Computer\n'
     '| table cn, dNSHostName, domain, OU, operatingSystem, uac_details, '
     'lastLogonTimestamp, whenChanged\n'
     '| sort cn',
     "Starter query over the AD_Obj_Computer KV lookup."),

    (("gpo", "policy", "group policy"),
     '| inputlookup AD_Obj_GPO\n'
     '| table cn, displayName, domain, whenCreated, whenChanged, versionNumber\n'
     '| sort - whenChanged',
     "Starter query over the AD_Obj_GPO KV lookup."),

    (("ou", "organizational unit", "organisational unit"),
     '| inputlookup AD_Obj_OU\n'
     '| table cn, distinguishedName, domain, whenCreated, whenChanged\n'
     '| sort cn',
     "Starter query over the AD_Obj_OU KV lookup."),
)

_FALLBACK_SPL = (
    '| inputlookup AD_Obj_User\n'
    '| table cn, sAMAccountName, domain, OU, user_type, uac_details, adminCount, '
    'lastLogonTimestamp, whenChanged\n'
    '| head 100')

_FALLBACK_NOTES = (
    "No keyword in the question matched a known starter pattern, so this is the "
    "generic AD user-inventory query. Adjust it, or enable the AI provider in "
    "ad_obj_ai.conf for a question-specific suggestion.")


def template_spl(question, selected_vocab):
    """Deterministic keyword -> starter-SPL mapping. No model involved."""
    low = str(question or "").lower()
    for keywords, spl, notes in _TEMPLATE_RULES:
        if any(word in low for word in keywords):
            return spl, ("Template suggestion (AI not used). " + notes)
    macros = selected_vocab.get("macros") or []
    hint = ""
    if macros:
        hint = (" Macros in this app that look related to your wording: "
                + ", ".join(macros[:8]) + ".")
    return _FALLBACK_SPL, ("Template suggestion (AI not used). "
                           + _FALLBACK_NOTES + hint)


@Configuration()
class AdNl2SplCommand(StreamingCommand):
    """Natural language -> suggested SPL. Returns a string; never executes it.

    ##Syntax
    .. code-block::
        adnl2spl [question_field=<field>] [mode=(auto|template|llm)]

    ##Description
    Adds nl_question / generated_spl / spl_notes / ai_status / ai_model /
    spl_vocabulary / ai_warning to each row. The generated SPL is displayed for
    human review only - this app never runs it.
    """

    question_field = Option(
        doc="Field holding the natural-language question. Default: question.",
        require=False, default="question", validate=validators.Fieldname())

    mode = Option(
        doc="auto (default) | template (never call a model) | llm.",
        require=False, default="auto")

    def __init__(self):
        StreamingCommand.__init__(self)
        self._client = None
        self._config = None
        self._vocab = None
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

        self._vocab = lib.load_vocabulary()
        self._client = lib.LlmClient(
            self._config, service=self.service,
            command="adnl2spl", user=username, app=app)

    def _generate(self, record):
        raw_question = record.get(self.question_field, "")
        if isinstance(raw_question, (list, tuple)):
            raw_question = " ".join(str(q) for q in raw_question if q)
        # The question is user input: redact it exactly like grounding data
        # before it is echoed back or assembled into a prompt.
        question = lib.redact(str(raw_question or ""))[:1000]

        selected = lib.select_vocabulary(self._vocab, question)
        vocab_names = ",".join(
            list(selected.get("lookups", []))[:12]
            + list(selected.get("macros", []))[:12])

        if not question:
            return ("", "",
                    "No question was supplied in field '{0}'.".format(
                        self.question_field),
                    "template", lib.STATUS_NO_GROUNDING, "", vocab_names,
                    "empty question")

        fallback_spl, fallback_notes = template_spl(question, selected)

        mode = str(self.mode or "auto").strip().lower()
        if mode == "template" or not self._client.active():
            inactive = self._client.inactive_result()
            status = lib.STATUS_TEMPLATE if mode == "template" else inactive.status
            reason = ("mode=template requested" if mode == "template"
                      else inactive.reason)
            return (question, fallback_spl, fallback_notes, "template", status,
                    "", vocab_names, reason)

        # The ONLY grounding for this command is the question plus the app's own
        # vocabulary. No entity/KV data is sent.
        grounding = {"analyst_question": question}
        context = lib.render_vocabulary_context(selected)

        result = self._client.generate(
            TASK, grounding, "spl",
            extra_context=context,
            screen=lambda data: lib.screen_generated_spl(data.get("spl", "")))

        if result.ok:
            spl = result.data.get("spl", "").strip()
            notes = result.data.get("notes", "") or ""
            used_vocab = result.data.get("vocabulary_used") or []
            if used_vocab:
                notes = (notes + " Vocabulary referenced: "
                         + ", ".join(str(v) for v in used_vocab) + ".").strip()
            # Second, independent screen at the emission boundary.
            ok, reason = lib.screen_generated_spl(spl)
            if ok:
                return (question, spl, notes, result.model, lib.STATUS_LLM,
                        "analyst_question", vocab_names, "ok")
            return (question, fallback_spl,
                    lib.safe_message(lib.STATUS_BLOCKED) + " " + fallback_notes,
                    "template", lib.STATUS_BLOCKED, "analyst_question",
                    vocab_names, reason)

        return (question, fallback_spl,
                lib.safe_message(result.status) + " " + fallback_notes,
                "template", result.status, "analyst_question", vocab_names,
                result.reason)

    def stream(self, records):
        self._prepare()
        for record in records:
            try:
                (question, spl, notes, model, status, used, vocab_names,
                 reason) = self._generate(record)
            except Exception as exc:  # noqa: BLE001
                question = lib.redact(str(record.get(self.question_field, "")))[:1000]
                spl, notes = "", ("The suggestion could not be produced ({0}).".format(
                    type(exc).__name__))
                model, status, used, vocab_names = "template", lib.STATUS_ERROR, "", ""
                reason = "row processing error"

            record["nl_question"] = question
            record["generated_spl"] = spl
            record["spl_notes"] = notes
            record["ai_model"] = model
            record["ai_status"] = status
            record["ai_grounding_fields"] = used
            record["spl_vocabulary"] = vocab_names
            record["ai_warning"] = WARNING
            record["ai_reason"] = reason
            yield record


dispatch(AdNl2SplCommand, sys.argv, sys.stdin, sys.stdout, __name__)
