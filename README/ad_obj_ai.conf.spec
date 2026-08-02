##
## ad_obj_ai.conf.spec - MS Windows AD Objects
##
## Settings for the GenAI / LLM access layer added in 5.0.0 (Phase 2).
## Place overrides in $SPLUNK_HOME/etc/apps/ms_windows_ad_objects/local/ad_obj_ai.conf
##
## SECURITY NOTE - there is deliberately NO setting in this file that accepts an
## API key, token, password, or any other credential. The API credential is read
## at search time from Splunk's encrypted storage/passwords store, addressed by
## the secret_realm + secret_username settings below. If you find yourself
## wanting to paste a secret into a .conf file, stop: the app will not read it.
##

[ai]

enabled = <boolean>
* Master switch for every AI feature in the app (adexplain, adtriage, adnl2spl).
* When 0, no model is contacted and no data leaves the instance. Each command
  emits its deterministic, rule-based "template" narrative and stamps
  ai_status = template. This is a fully supported operating state, not an error.
* When 1, a model call is attempted only if "provider" is also set to something
  other than none AND endpoint_url and model_name are populated.
* Default: 0

provider = none | local_dsdl | external_api
* Selects the provider implementation.
* none         - no model is called; the template path is used for everything.
* local_dsdl   - a DSDL / Ollama-style local generate endpoint. No credential is
                 used. endpoint_url may be http:// or https://.
* external_api - a generic external chat-completions HTTPS API. The request
                 carries an "Authorization: Bearer <secret>" header built from
                 the storage/passwords entry named by secret_realm /
                 secret_username. endpoint_url MUST be https:// - a cleartext
                 external endpoint is refused.
* Default: none

endpoint_url = <string>
* Full URL of the model endpoint, including path.
* No host, port, or URL is hardcoded anywhere in this app; if this is empty, no
  network destination exists and the template path is used
  (ai_status = template_not_configured when enabled = 1).
* The URL scheme is validated against the provider before every call.
* Default: empty

model_name = <string>
* Model identifier passed to the provider (a local model tag, or an API model
  name). Also written to the ai_model result field and to each audit record.
* Default: empty

max_input_chars = <integer>
* Hard character budget for the assembled prompt, enforced in two places:
  grounding fields are added until the budget is spent (the remainder are
  dropped), and the final prompt string is truncated to this length.
* Clamped to the range 200-60000.
* Default: 6000

max_output_chars = <integer>
* Hard character budget applied to validated model output before it is written
  to a result field. Longer output is truncated with an ellipsis.
* Clamped to the range 100-20000.
* Default: 2000

timeout_seconds = <integer>
* Per-call socket timeout. On timeout the row falls back to the deterministic
  template narrative and ai_status = template_timeout.
* Clamped to the range 1-120.
* Default: 20

temperature = <decimal>
* Sampling temperature handed to the provider.
* Leave at 0 for reproducible narratives; anything higher makes the same row
  produce different text between runs, which is usually undesirable for a
  security report.
* Clamped to the range 0.0-2.0.
* Default: 0

audit_enabled = <boolean>
* When 1, one JSON audit record is written per invocation to
  $SPLUNK_HOME/var/log/splunk/ad_obj_llm_audit.log.
* The record contains: timestamp, command, user, app, provider, model, schema,
  prompt SHA-256, prompt character count, prompt/completion token counts when
  the provider reports them, latency_ms, outcome, ai_status, reason, and the
  NAMES (never the values) of the grounding fields used.
* It never contains the prompt text, the response text, or any credential.
* FAIL-CLOSED: when this is 1 and the audit log cannot be opened for writing,
  the model call is REFUSED rather than run unaudited. The row falls back to the
  template narrative with ai_status = template_audit_unavailable.
* Index the file with an inputs.conf monitor stanza - see README.txt section
  "5.0.0 GenAI / LLM (Phase 2)".
* Default: 1

audit_log_max_bytes = <integer>
* Size at which the audit log rotates.
* Clamped to the range 65536-1073741824.
* Default: 10485760

audit_log_backup_count = <integer>
* Number of rotated audit log files to retain.
* Clamped to the range 0-50.
* Default: 5

secret_realm = <string>
* The "realm" of the storage/passwords entry holding the provider credential.
* This is a NAME ONLY. The secret value is never stored in, or read from, any
  .conf file.
* Default: ms_windows_ad_objects

secret_username = <string>
* The "username" of the storage/passwords entry holding the provider credential.
* This is a NAME ONLY, for the same reason as secret_realm.
* Required when provider = external_api. If no matching credential exists, the
  model call is refused and ai_status = template_no_secret.
* Default: ad_obj_llm_api_key

allowed_grounding_fields = <comma-separated list of field names>
* The allowlist of result fields that may be copied out of a search result and
  placed into a prompt. THIS IS THE PRIMARY DATA-EGRESS CONTROL.
* A field that is not named here never reaches a model, no matter what is in the
  pipeline. _raw, _time and the other Splunk internals are additionally on a
  hard deny list that this setting cannot override.
* Every value that does survive the allowlist is normalised, stripped of control
  characters, scanned for credential-shaped content (api_key=, bearer tokens,
  JWTs, PEM private keys, long hex blobs) which is masked, and screened for
  prompt-injection phrasing which is removed.
* Shorten this list to tighten egress. Do not add _raw or other free-text event
  fields.
* Default: the AD_Obj_Risk collection fields, plus the non-identifying AD object
  attributes used by the narratives (identity, OU, userAccountControl and its
  decode, adminCount, group nesting / privilege-path fields, and change-summary
  fields). objectSid, objectGUID, sid_lookup, guid_lookup and postal/address
  attributes are deliberately NOT in the default list.
