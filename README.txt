MS Windows AD Objects = 4.1.1
	- Release Notes:
		- Fixed Dashboards:
			- Fixed several css's for Dashboards, including getting started wizard
			- Removed hardcoded content from AD Object - Group Changes 
		- New Features:
			- Multi-Domain - Splitting Lookups:
				- Added the capability to split out AD_Obj_(User/Group/Computer) lookups into separate lookups for domains.
					- This will help with the issue where large, mult-domain, environments were having issues with KV Store Lookup sizing.
					- With this capability, the sizes of the Lookups will be greatly reduced.
					- Use the dashboard "AD Objects - CFG - Split KVs" dashboard in the Configuration Dashboards - Advance Configuration menu
						- NOTE: This configuration does require some manual steps, which is outlined in the "AD Objects - CFG - Split KVs" dashboard.
				- Important Note: In order to provide this support, updated macros had to be created to replace previous ones, for building lookups and correlation searches.  Also, there is now a Domain Dropdown that will need to be selected first in most of the dashboards.
 			- Added multiple Reports for analyzing collected Registry Data.
 			- Updated css styling, to establish a common look and feel with the dashboards.
 			- Updated several of the lookups multivalue columns, to speed up searches and take advantage of KV Store's multivalue searching capabilities.
 		- Multiple other fixes to dashboards, reports and field extractions based off of customer feedback.
Required TA: Splunk Add-On for Microsoft Windows version 4+
Configuration: 
	Required: For first time installation and upgrading from version 3.x and below
		- You will need to first walk through the "Configuration - Getting Data In" dashboard located in "MS Windows AD Objects --> Configuration --> Configuration - Getting Data In".
	Optional: If you are upgrading from version 4.0.3, you do not need to run through the Getting Started dashboard wizard.

Configuration - Getting Data dashboard wizard Overview: 
	- This dashboard will walk you through the process for installation, enabling data inputs, configuration and the required
		building of the AD Objects Lookup Tables.   The specific steps for your environment are determined by the selections you 
		make in the second task of the wizard "Scope Definition".
	- Below are the different tasks that are covered in this initial configuration wizard:
		- This Guide is specifically designed to help you not only configure the MS Windows Application, 
		but also to help quickly get your Windows and Active Directory data in to Splunk.
			- To aligned the configuration steps to your Splunk Environment and Deplyoment needs, 
			the 1. Scope Definition will collect some basic information about your environment and deployment plans.
		- How to use this Guide
			- Each Section Step of this guide builds on the previous Part, verify each of the previous steps or requirements 
			have been completed before proceeding to the next Part.
		- Goals for the Guide
			- At the end, you will have your Windows/Active Directory data flowing into Splunk, have the MS Windows AD Objects 
			application configured and well on your way to start leveraging the power of Splunk.
	Guide Part Descriptions
		- Section Step 1: Scope Definition
			- Required: This step is used to align the subsequent steps with your environment and deployment plans.
		- Section Step 2: Preparation
			- Provides the preparation steps for the Splunk Core components, MS Windows AD Objects and TA Configuration are ready to receive the Windows data and deployment.
		- Section Step 3: Deployment
			- Covers the steps for distributing the previously configured Splunk Technical Add-Ons to the target Windows Systems.
		- Section Step 4: Check Data
			- This section provides you a way of verifying, and if necessary troubleshooting, previous configuration steps.
		- Section Step 5: Build Lookups
			- This last section walks through the the final step of building the MS Windows AD Object's lookup tables.	

MS Windows AD Objects = 4.0.3
	- Release Notes:
		- Fixed the dn_path field extractions that is now required to be embedded in the searches/macros, since the ActiveDirectory sourcetype is a pre-trained sourcetype it cannot be done in the props/transforms.
		- Added a lookup field that can be leveraged for filtering the lookup data.  AD_Obj_User (lookup_usr), AD_Obj_Group (lookup_grp), AD_Obj_Computer (lookup_cmp) and AD_Obj_OU (lookup_ou)
			- This way you can lookup a user/group/computer/ou details using the | lookup AD_Obj_... lookup_... AS ... search.  So if an event has the distinguishedName or cn or sAMAccountName then it will match the lookup_... values
		- Update the wineventlog props to put the user, and distinguishedName fields in lowercase for linking with the kvstore.
		- Update the File Auditing Dashboards and Added in a couple reports.
		- Update the searches to use the new field lookup_... vs having to run multiple lookups.
		- Fixed Windows Eventlog fields extractions and EVAL's in props.conf for user_obj_...,group_obj_...,computer_obj_... and member_obj_... fields,

MS Windows AD Objects = 5.0.0 Machine Learning (Phase 1)
	- What it adds:
		- A model layer on top of the existing entity (KV Store) and Phase 0 feature-engineering layer.  Nothing about the
		  deterministic detections, severity handling or critical-object framework changes; the models only add rows to a
		  new risk collection which carries MITRE ATT&CK technique ids so it routes through the same SOC workflow.
	- Prerequisite:
		- Splunk Machine Learning Toolkit (MLTK) 5.4 or later on the search head that runs the scheduled searches.
		  The privilege-path analytics are pure SPL and do NOT require MLTK; the change-velocity and peer-group models do.
	- The models:
		- Change-velocity baseline (AD_Obj_ML_ChangeVelocity_Fit / _Apply)
			- Fits a per-account MLTK DensityFunction over 30 days of daily AD object change counts from the
			  "entity_change_velocity" feature set, then scores yesterday.  Catches the admin who normally makes
			  3 changes a day making 300.  Accounts with fewer than 7 days of history are excluded from the fit.
			- Model: app:ad_obj_change_velocity_df.  Risk rows: risk_type=change_velocity, MITRE T1098.
		- Peer-group logon scoring (AD_Obj_ML_PeerGroup_Fit / _Apply)
			- Fits MLTK KMeans (k=8) over 30 days of per-account authentication profiles - logon-type ratios, failure
			  ratio, off-hours ratio, log host spread - plus two numeric OU-structure features taken from the AD_Obj_User
			  lookup.  Ratios rather than raw counts, so accounts cluster on behaviour and not on volume.
			- The apply search re-derives yesterday's profile, assigns the cluster, and because MLTK KMeans does not emit a
			  distance-to-centroid it computes deviation in SPL: per-cluster mean/stdev of each behavioural feature via
			  eventstats, z-score per feature, Euclidean norm of the z-scores, then flags accounts 3+ stdev above their own
			  cluster's distance.  Clusters with fewer than 5 members are skipped.
			- Model: app:ad_obj_peer_kmeans.  Risk rows: risk_type=peer_logon_deviation, MITRE T1078.002.
		- Privilege-path analytics (AD_Obj_ML_PrivPath_Update / _Alert) - no MLTK required
			- Walks the AD_Obj_Group "member" attribute four levels down from every critical/Tier-0 group (seeded from
			  ms_ad_obj_default_critical_objects.csv plus adminCount=1 / isCriticalSystemObject=TRUE) and records each
			  account's and group's minimum nesting depth to a critical group and how many critical groups it can reach.
			- _Update writes to the STAGING lookup ms_ad_obj_privpath_new.  _Alert then diffs the staging rows
			  against the ms_ad_obj_privpath baseline, promotes the staged rows into the baseline, and only afterwards
			  writes the changed rows to the risk collection - so the two searches never race over one file.
			- Risk rows: risk_type=priv_path_change (new_reach / depth_decreased / reach_increased), MITRE T1098 for
			  accounts and T1484 for groups newly nested under a Tier-0 group.
		- Model ops
			- AD_Obj_ML_Drift_Check (weekly) compares this week's outlier rate and mean risk score against last week's per
			  risk_type and flags drift=true on a swing greater than 3x in either direction.
			- AD_Obj_ML_Risk_Retention (weekly) purges risk rows older than 90 days.
			- The DensityFunction outlier threshold lives in one place - the `ms_ad_obj_risk_threshold` macro (default 0.01).
			  Both the fit and the apply read it, so lowering it produces fewer, higher-confidence outliers everywhere.
	- New knowledge objects:
		- Collection AD_Obj_Risk_kv, KV Store lookup AD_Obj_Risk (entity, entity_type, domain, risk_type, risk_score,
		  model, model_version, evidence, mitre_technique_id, first_seen, last_scored - the two timestamps are epoch seconds).
		- CSV lookups ms_ad_obj_privpath (baseline) and ms_ad_obj_privpath_new (staging).
		- Macro `ms_ad_obj_risk_threshold`.
		- Dashboard "AD Objects - ML - Risk Overview" under Admin Audit > Machine Learning - Risk.
	- How to enable (order matters):
		1. Install MLTK 5.4+ and confirm the summary index the feature searches write to exists and is searchable.
		2. Enable the four "AD Objects - ML Feature - ..." searches (they ship disabled) and let them run.
		3. Wait 30 days, or backfill the feature rows with the same SPL over historical data
		   (dispatch a one-off run per day with `collect` / summary indexing into the same index and feature_set marker).
		4. Enable AD_Obj_ML_ChangeVelocity_Fit and AD_Obj_ML_PeerGroup_Fit and run each once by hand.  Confirm the model
		   artifacts appear on the "Model Artifacts" panel of the risk dashboard.
		5. Enable the _Apply searches, then AD_Obj_ML_PrivPath_Update and AD_Obj_ML_PrivPath_Alert, then the two model-ops
		   searches.  The first PrivPath run only seeds the baseline; it deliberately writes no risk rows.
		- Crons are staggered 02:05-03:35 so every model search runs after the 01:05-01:35 feature searches.
	- Summary-index repoint note:
		- action.summary_index._name is read by the scheduler and cannot take a macro, so the Phase 0 feature searches carry
		  the literal index name "summary".  If you repoint the summary index you must change BOTH the _name value in each
		  "AD Objects - ML Feature - ..." stanza in savedsearches.conf AND the `ms_ad_obj_ml_summary_index` macro in
		  macros.conf - the Phase 1 fit/apply searches read the index name only through that macro.

MS Windows AD Objects = 5.0.0 GenAI / LLM (Phase 2)
	- THE HEADLINE: THE APP SHIPS WITH AI DISABLED AND IS FULLY FUNCTIONAL THAT WAY.
		- default/ad_obj_ai.conf ships enabled = 0 and provider = none.  In that state no model is contacted, no
		  network destination exists, and nothing leaves the instance.  Every AI surface still works: it produces a
		  deterministic, rule-based narrative and stamps ai_status = template.  That is a supported operating state,
		  not a degraded one and not an error.
		- Nothing in Phase 0 or Phase 1 - the feature searches, the models, the risk collection, the existing
		  dashboards - depends on any of this.  Leaving Phase 2 switched off changes nothing about the rest of the app.
	- What it adds:
		- Three read-only custom search commands in the new bin/ directory (the app's first Python), a configuration
		  surface (ad_obj_ai.conf), an RBAC capability, an audit trail, and one new dashboard.
		- All narration is DESCRIPTIVE, NEVER PRESCRIPTIVE.  The commands restate what the directory data and the
		  model scores already say.  They do not recommend, instruct, or prioritise any response action, and the
		  output is screened for prescriptive phrasing before it is emitted.
		- GENERATED SPL IS NEVER AUTO-EXECUTED.  adnl2spl returns SPL as a string field for a human to read.  No code
		  path in this app dispatches, evals, execs, or shells out to model output, and no scheduled search consumes
		  generated SPL.  A suggestion containing a non-read-only command (outputlookup, outputcsv, collect, delete,
		  sendemail, script, rest, map, savedsearch, loadjob, ...) is rejected outright and never displayed.
	- The commands:
		- | adexplain  (bin/adexplain.py) - plain-English narrative for an AD entity.
			- Grounded ONLY on the fields already on the row that it is handed.  It reads no index and opens no lookup.
			- Template path: rule-based userAccountControl decode (bin/ad_obj_uac_decode.py), group-nesting chain
			  summary, recent-change summary, and risk score / evidence when present.
			- Adds ai_narrative, ai_model, ai_status, ai_grounding_fields, ai_reason.
			- Example:  | inputlookup AD_Obj_User | search adminCount=1 | adexplain entity_field=cn
		- | adtriage  (bin/adtriage.py) - who / what / when / blast-radius paragraph for AD_Obj_Risk rows.
			- Adds ai_triage, ai_status, ai_model, ai_grounding_fields, ai_reason.  All input fields are preserved so
			  the risk_score, model, evidence and MITRE mapping are always visible beside the narrative.
			- Example:  | inputlookup AD_Obj_Risk | where risk_score>0.8 | adtriage
		- | adnl2spl  (bin/adnl2spl.py) - natural language to SUGGESTED SPL, for review only.
			- Adds nl_question, generated_spl, spl_notes, ai_status, ai_model, spl_vocabulary, ai_warning, ai_reason.
			- Grounded on this app's own macro / lookup / KV-collection vocabulary (bin/ad_obj_ai_vocab.json).
			- The only thing sent to a model is the question plus that vocabulary.  No AD data, no KV rows, no events.
		- Every command accepts mode=auto|template|llm.  mode=template guarantees no model is contacted.
		- bin/ad_obj_uac_decode.py is a standalone UAC bitmap decoder with no LLM and no network.  Its bit semantics
		  and label text are a 1:1 mirror of the `ms_obj_uac_to_binary` macro, verified against every row of
		  lookups/ms_ad_obj_uac_temp.csv - run it directly to re-verify:
			$SPLUNK_HOME/bin/splunk cmd python3 $SPLUNK_HOME/etc/apps/ms_windows_ad_objects/bin/ad_obj_uac_decode.py
	- New knowledge objects:
		- Dashboard "AD Objects - AI - Assistant (NL to SPL)" (ms_ad_obj_ai_assistant) under
		  Admin Audit > Machine Learning - Risk.  It also carries a risk-overview panel and an AI-configuration
		  panel so the page is useful with AI switched off.
		- A "Triage Narrative" panel and a "Triage Narrative" mode selector added to
		  "AD Objects - ML - Risk Overview" (ms_ad_obj_ml_risk_overview).  Set the selector to "Off" to hide the
		  panel entirely, or "Template only" to guarantee no model call.
		- default/commands.conf (adexplain, adtriage, adnl2spl - chunked v2, python.version = python3, local = true).
		- default/authorize.conf (capability ad_obj_can_use_ai, role ad_obj_ai_user).
		- default/ad_obj_ai.conf and README/ad_obj_ai.conf.spec.
	- HOW TO ENABLE (order matters; stop after step 1 if you only want the template narratives):
		1. GRANT THE CAPABILITY.  Every one of the three commands is gated on ad_obj_can_use_ai and refuses to run
		   without it - including in template mode.  Out of the box only the admin role holds it.  Either assign
		   users the "ad_obj_ai_user" role (Settings > Roles), or add to your own local/authorize.conf:
			[role_soc_analyst]
			ad_obj_can_use_ai = enabled
		   Users without the capability see an access-denied message on the AI panels only; the rest of every
		   dashboard, including the risk overview, keeps working.
		2. (Optional) STORE THE CREDENTIAL, if and only if you intend to use provider = external_api.
		   The secret is read at search time from Splunk's encrypted storage/passwords store.  IT IS NEVER READ FROM
		   A .CONF FILE OR AN ENVIRONMENT VARIABLE, and there is no setting anywhere in this app that accepts a key.
		   Create it in the app namespace, as an administrator:
			Settings > Credentials > Add new
			  App        : MS Windows AD Objects (ms_windows_ad_objects)
			  Username   : ad_obj_llm_api_key      <- must match secret_username in ad_obj_ai.conf
			  Password   : <your provider API key>
		   or from the CLI:
			$SPLUNK_HOME/bin/splunk _internal call /servicesNS/nobody/ms_windows_ad_objects/storage/passwords \
			  -post:name ad_obj_llm_api_key -post:password '<your provider API key>' \
			  -post:realm ms_windows_ad_objects -auth <admin>:<password>
		   The realm and username in ad_obj_ai.conf are NAMES ONLY.  If no matching credential exists the model call
		   is refused and the row falls back to the template narrative with ai_status = template_no_secret.
		3. ADD THE AUDIT-LOG MONITOR (do this before enabling, so the first call is indexed).  Add to
		   $SPLUNK_HOME/etc/apps/ms_windows_ad_objects/local/inputs.conf (or your own TA) on every search head that
		   runs the commands, and create the index if it does not exist:
			[monitor://$SPLUNK_HOME/var/log/splunk/ad_obj_llm_audit.log]
			disabled = 0
			index = _ai_audit
			sourcetype = ad_obj:llm:audit
			crcSalt = <SOURCE>
		   The app does not ship an inputs.conf: the target index name and the decision to index the file are
		   deployment choices, and shipping a monitor for an index that does not exist produces noisy errors.
		4. CONFIGURE THE PROVIDER.  Copy the [ai] stanza from default/ad_obj_ai.conf into local/ad_obj_ai.conf and
		   set, at minimum:
			enabled       = 1
			provider      = local_dsdl        (DSDL / Ollama-style local endpoint; no credential)
			                 or external_api  (generic HTTPS chat-completions API; uses the credential from step 2)
			endpoint_url  = <full URL of your endpoint>
			model_name    = <model id/tag>
		   endpoint_url must be https:// for external_api - a cleartext external endpoint is refused.  local_dsdl
		   may use http:// for a loopback or in-cluster container.  No host, port or URL is hardcoded in this app.
		   Full setting documentation: README/ad_obj_ai.conf.spec
		5. VERIFY.  Open "AD Objects - AI - Assistant (NL to SPL)" and read the "AI Configuration - Current State"
		   panel, then check the ai_status column on the "Grounding and Status" panel:
			llm                            - a model produced the text and it passed schema validation
			template                       - AI is disabled (the ship default)
			template_not_configured        - enabled = 1 but endpoint_url / model_name / scheme is wrong
			template_no_secret             - external_api selected but no storage/passwords entry matches
			template_timeout               - the provider did not answer within timeout_seconds
			template_error                 - transport or HTTP failure reaching the provider
			template_invalid_output        - the response was not parseable JSON, or failed schema validation
			template_blocked               - the output failed the safety screen and was discarded
			template_audit_unavailable     - audit_enabled = 1 but the audit log is not writable, so the call was refused
			template_no_grounding          - no allowlisted field was present on the row
		   Every one of these except "llm" means you are looking at the deterministic template output.
	- AUDIT TRAIL:
		- Location: $SPLUNK_HOME/var/log/splunk/ad_obj_llm_audit.log  (rotating; see audit_log_max_bytes /
		  audit_log_backup_count).  One JSON object per invocation.
		- Recorded: timestamp, command, user, app, provider, model, schema, prompt_sha256, prompt_chars,
		  prompt_tokens / completion_tokens when the provider reports them, latency_ms, outcome, ai_status, reason,
		  and the NAMES of the grounding fields used plus their count.
		- NOT recorded, ever: the prompt text, the response text, any grounding VALUE, or any credential.  The
		  prompt is represented only by its SHA-256, which is enough to prove two calls used the same prompt without
		  storing directory data in a log file.
		- Fail-closed: when audit_enabled = 1 and the audit log cannot be opened, the model call is REFUSED rather
		  than run unaudited, and the row falls back to the template narrative.
		- File logging was chosen over HEC deliberately: it needs no token (so it adds no new secret to protect), it
		  keeps working when the network or the model endpoint is down, it is readable on disk with no Splunk search
		  at all, and it rides the standard $SPLUNK_HOME/var/log/splunk monitor pattern.
	- SECURITY MODEL (the review gates, and where each one lives):
		- Secrets: bin/ad_obj_llm_lib.py SecretStore is the only credential path, and it reads storage/passwords via
		  the search's own session key.  No .conf setting accepts a value, there is no environment-variable
		  fallback, and nothing is cached to disk.  The retrieved value builds one Authorization header and is never
		  logged, never returned in a field, and never written to the audit record.
		- Capability: every command calls require_capability() before it does any work and denies on absence AND on
		  inability to verify - an unverifiable identity is a denied identity.
		- Data egress: allowed_grounding_fields in ad_obj_ai.conf is the allowlist, and it is the whole story.  A
		  field not named there never reaches a prompt.  _raw, _time and the other Splunk internals are on an
		  additional hard deny list that the setting cannot override.  Surviving values are normalised, stripped of
		  control characters, scanned for credential-shaped content (api_key=, bearer tokens, JWTs, PEM private
		  keys, long hex blobs) which is masked, and screened for prompt-injection phrasing which is removed.  A
		  character budget (max_input_chars) caps what can be assembled.
		- Structured output: every response must be a single JSON object matching a declared schema.  Prose is never
		  scraped for JSON, partial objects are never salvaged, and raw model text is never passed through.  Any
		  parse or validation failure discards the response and returns the deterministic template output.
		- No execution: nothing in bin/ uses eval(), exec(), subprocess, os.system, or a shell, and no model output
		  is ever placed anywhere that Splunk would execute it.
	- OPERATIONAL NOTES:
		- Python: the commands are Splunk SDK chunked (v2) search commands and require splunklib.  Splunk Enterprise
		  9.2+ provides it; on an older or unusual runtime, drop the Splunk Python SDK into
		  $SPLUNK_HOME/etc/apps/ms_windows_ad_objects/bin/lib/ and it will be picked up automatically.
		- commands.conf sets local = true, so the commands run on the search head only - they need the search's
		  session key and they write the audit log locally.
		- NL->SPL grounding vocabulary: bin/ad_obj_ai_vocab.json is generated at build time from this app's own
		  macros.conf, transforms.conf and collections.conf stanza names.  A static file was chosen over a live REST
		  read so that a reviewer can see in one place exactly what may reach a prompt, so there is no per-row REST
		  round-trip, and so the vocabulary also grounds the template path.  Regenerate it after adding or renaming
		  macros or lookups:
			$SPLUNK_HOME/bin/splunk cmd python3 \
			  $SPLUNK_HOME/etc/apps/ms_windows_ad_objects/bin/ad_obj_llm_lib.py --build-vocab
		  If the file is missing the library falls back to parsing the app's conf files on disk, so the feature
		  degrades rather than breaks.
		- Self-check the library at any time (no network, no model, safe on a production search head):
			$SPLUNK_HOME/bin/splunk cmd python3 \
			  $SPLUNK_HOME/etc/apps/ms_windows_ad_objects/bin/ad_obj_llm_lib.py --self-test
		- Cost / rate: these are per-row commands.  Put `| head` in front of adexplain / adtriage on large result
		  sets; the shipped dashboard panels already cap themselves at 10 rows.
		- The AI Assistant dashboard passes your question into SPL through a token, so double quotes in the question
		  are not supported - they will produce a search parse error.  Rephrase without them.
MS Windows AD Objects = 5.0.0 Validation & Release (Phase 3)
	- WHAT PHASE 3 IS:
		- Phase 0 added MITRE mapping and the feature searches, Phase 1 added the models, Phase 2 added the
		  optional GenAI layer.  Phase 3 adds the thing that keeps all of it honest: a labeled evaluation
		  harness, plus the release paperwork (version 5.0.0, MLTK dependency, rollback procedure).
		- Nothing in Phase 3 changes detection behaviour.  It only measures it.
	- THE EVALUATION HARNESS:
		- lookups/ms_ad_obj_ml_evalset.csv (transforms stanza ms_ad_obj_ml_evalset) is a labeled
		  ground-truth eval set: 32 scenarios, 17 that SHOULD be detected and 15 that should NOT.
		  Columns: scenario_id, scenario_name, entity, entity_type, domain, risk_type, expected_detection,
		  mitre_technique_id, severity, notes.
		- It is the AD-side consumer of the batch_data_eventgen labeled-corpus ground-truth manifest.
		  The scenario_id values are the contract between the two: the corpus injects the scenario, this
		  lookup states what the models are supposed to conclude about it.
		- AD_Obj_ML_Eval_Score (weekly, Sunday 03:45, SHIPS DISABLED) joins the eval set against the last
		  30 days of the AD_Obj_Risk collection and reports, per risk_type: true_positives,
		  false_positives, false_negatives, true_negatives, precision, recall, F1, false_positive_rate.
		  Results are written to the summary index tagged feature_set = model_eval_scores so scores can be
		  trended release over release.  This search needs no MLTK - it only reads a lookup and the KV Store.
		- Matching is on risk_type plus a NORMALISED entity (lowercased, DOMAIN\ prefix stripped).  This is
		  necessary because the change-velocity model writes DOMAIN\account while the peer-group and
		  privilege-path models write the bare account name.
		- false_positives_unlabeled counts risk rows for entities the eval set says nothing about.  On a
		  clean labeled corpus replay those are genuine false positives and precision_incl_unlabeled is the
		  honest number.  On live production data they are simply unlabeled and that column is meaningless -
		  read only precision / recall / f1 over the labeled entities.
		- The "Model Evaluation" panels at the bottom of the "AD Objects - ML - Risk Overview" dashboard
		  show the same scores plus the FP / FN detail rows, including each scenario's notes column
		  explaining what it was designed to test.
	- EXPECTED FALSE-POSITIVE CHARACTERISTICS (READ THIS BEFORE YOU ENABLE ANYTHING):
		- THERE IS NO PRODUCTION-VALIDATED FALSE-POSITIVE RATE FOR THESE MODELS.  They ship as untuned
		  baselines with defensible defaults, not as numbers measured against a real estate.  Any figure
		  quoted without your own eval run would be invented.  The harness above is how you measure yours.
		- Change velocity (ad_obj_change_velocity_df, DensityFunction, `ms_ad_obj_risk_threshold` = 0.01):
		  the threshold is a tail probability, so on a well-behaved account population roughly 1% of scored
		  account-days are expected to fall outside the fitted distribution BY CONSTRUCTION - that is the
		  definition of the setting, not a measured error rate.  Expect the recurring-batch pattern to
		  dominate real false positives: quarter-end provisioning runs, mass onboarding, DC promotions and
		  migrations.  Accounts with fewer than 7 observed days are excluded from the fit, so newly created
		  admins produce no score at all rather than a bad one.  Lower the macro value for fewer, higher
		  confidence outliers; raise it for more sensitivity.
		- Peer group (ad_obj_peer_kmeans, KMeans k=8, peer_z >= 3, clusters smaller than 5 skipped):
		  false positives concentrate in accounts that sit in a cluster they do not really belong to.
		  k = 8 is a starting point chosen for a mid-sized single-forest estate; it has NOT been tuned
		  against any particular directory.  A very homogeneous estate will over-cluster and produce noise,
		  a very heterogeneous one will under-cluster and miss deviations.  Check cluster sizes on the
		  AD_Obj_ML_PeerGroup_Fit output first - if most accounts land in one or two clusters, change k
		  before you judge the detections.  Accounts with fewer than 7 observed days or fewer than 5 events
		  are excluded, so new hires do not generate cold-start noise.
		- Privilege path (ad_obj_privpath_spl, pure SPL, no MLTK): this one is deterministic, so its
		  "false positives" are not statistical - they are legitimate privilege grants.  Every approved
		  addition to a Tier-0 group is a true new_reach and WILL be reported.  Expect volume proportional
		  to your change rate in privileged groups, and expect a burst the first time it runs after any
		  large migration.  Cold start: the first run against an empty ms_ad_obj_privpath baseline writes
		  ZERO risk rows and only seeds the baseline, by design.  Nesting is walked four levels deep;
		  a path deeper than four hops is not seen.
		- Common to all three: the models add rows to AD_Obj_Risk.  They do not raise notables, do not
		  change any existing deterministic detection, and do not alter severity handling.
	- ENABLEMENT ORDER (do not skip a step - each one depends on the previous one having data):
		1. Confirm the prerequisite: Splunk Machine Learning Toolkit (MLTK) 5.4 or later is installed on
		   the search head that will run the scheduled searches.  Privilege-path analytics and the eval
		   search work without it; change-velocity and peer-group do not.
		2. Enable the four "AD Objects - ML Feature - ..." searches (01:05 - 01:35 daily).  Confirm rows are
		   landing:  index=summary feature_set=entity_change_velocity | stats count by date_day
		3. Accrue at least 30 days of feature rows, OR backfill them by running each feature search
		   manually over a historical window before enabling the fits.  Do not skip this - a fit over a
		   few days of data produces a model that flags almost everything.
		4. Enable and run the fits once: AD_Obj_ML_ChangeVelocity_Fit and AD_Obj_ML_PeerGroup_Fit
		   (weekly, Sunday 02:05 / 02:25).  Verify the models exist on the "Model Artifacts" panel of the
		   ML - Risk Overview dashboard before going further.
		5. Enable the applies: AD_Obj_ML_ChangeVelocity_Apply (02:15) and AD_Obj_ML_PeerGroup_Apply (02:35).
		   Enable AD_Obj_ML_PrivPath_Update (02:45) and AD_Obj_ML_PrivPath_Alert (03:05) - remember the
		   first PrivPath cycle only seeds the baseline.
		6. Enable the model ops searches: AD_Obj_ML_Risk_Retention (Sunday 03:15) and
		   AD_Obj_ML_Drift_Check (Sunday 03:35).
		7. Enable AD_Obj_ML_Eval_Score (Sunday 03:45) LAST, and only if you have a labeled corpus to score
		   against.  On live production data it will report large false_positives_unlabeled counts that
		   mean nothing.
		8. Phase 2 (GenAI) is independent of all of the above and stays off unless you deliberately enable
		   it in ad_obj_ai.conf.  See section "5.0.0 GenAI / LLM (Phase 2)".
	- ROLLBACK PROCEDURE (returns the app to 4.1.1 behaviour without uninstalling it):
		1. Disable the searches.  Settings > Searches, reports and alerts, filter on the
		   ms_windows_ad_objects app, and disable every search named AD_Obj_ML_* and
		   "AD Objects - ML Feature - *".  That alone stops all model activity immediately; nothing else
		   in the app calls a model.
		2. Turn off the AI layer if it was enabled: set enabled = 0 (and provider = none) in
		   local/ad_obj_ai.conf.  Every AI surface reverts to the deterministic template path.
		   To remove access entirely, delete the ad_obj_can_use_ai grant from your roles.
		3. Remove the fitted models:
			| deletemodel ad_obj_change_velocity_df
			| deletemodel ad_obj_peer_kmeans
		   (or delete the __mlspl_ad_obj_*.mlmodel lookup files from Settings > Lookups > Lookup table
		   files in this app.)
		4. Clear the risk collection:
			| inputlookup AD_Obj_Risk | where 1=0 | outputlookup key_field=_key AD_Obj_Risk
		   or, to drop it wholesale, DELETE /servicesNS/nobody/ms_windows_ad_objects/storage/collections/data/AD_Obj_Risk_kv
		5. Clear the privilege-path baseline if you want a clean re-seed later: empty
		   lookups/ms_ad_obj_privpath.csv and lookups/ms_ad_obj_privpath_new.csv down to their header rows.
		6. Optional: remove the accumulated feature rows from the summary index
		   (index=summary feature_set=entity_change_velocity OR feature_set=logon_type_vector OR
		   feature_set=admin_session_features OR feature_set=group_membership_delta OR
		   feature_set=model_eval_scores) using your normal index-cleanup process.
		7. Nothing above touches the AD_Obj_* inventory collections, the deterministic saved searches, or
		   any existing dashboard.  The MITRE annotations added in Phase 0 are metadata only and are safe
		   to leave in place.
	- KNOWN LIMITATIONS AT 5.0.0:
		- The models have not been validated against production Active Directory data.  No live-model
		  smoke test (a real MLTK fit followed by a real apply on real data) has been performed.
		- k = 8 for the peer-group model is a defensible default, not an empirically tuned value.
		- The privilege-path walk is fixed at four nesting levels.
		- AD_Obj_ML_Eval_Score reads AD_Obj_Risk through an append subsearch, so on a very large risk
		  collection it is subject to the standard subsearch result and time limits.
		- The AI Assistant dashboard passes the question into SPL through a token, so double quotes in a
		  question are not supported.
		- The GenAI commands require splunklib; Splunk Enterprise 9.2+ provides it.