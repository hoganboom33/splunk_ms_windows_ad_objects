#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ad_obj_uac_decode.py - MS Windows AD Objects

Pure-Python userAccountControl (UAC) bitmap decoder.

No LLM, no network, no I/O.  This module is the deterministic ("template")
half of the Phase 2 GenAI feature set: `adexplain` uses it to build a
plain-English account description whether or not an LLM is configured.

Bit semantics are a 1:1 mirror of the app's existing SPL decode so that the
Python output and the `uac_details` value already stored in the KV Store
lookups (AD_Obj_User / AD_Obj_Computer, transforms stanza [AD_Obj_UAC]) never
disagree.  Source of truth:

  * default/macros.conf -> [ms_obj_uac_to_binary(1)]
      - builds a 32-character MSB-first binary string (uac_bin_map)
      - `rex` peels 27 named bits off it after a leading "00000"
      - a fixed ladder of `eval` statements appends ":"-joined labels
  * lookups/ms_ad_obj_uac_temp.csv
      - the seed rows for the AD_Obj_UAC KV collection; used below as the
        regression fixture for self_test()

The label text and the emission ORDER below are copied verbatim from that
macro ladder, so decode_uac(546)["uac_details"] == the CSV's row for 546.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Bit table.
#
# The SPL regex consumes uac_bin_map (32 chars, MSB first) as:
#     "00000" + 27 single-digit named capture groups
# so the Nth capture group (0-based) sits at string index 5+N, which is
# bit number (31 - (5 + N)) = (26 - N) counting from the LSB.
#
# `order` is the position of the flag in the SPL eval ladder, i.e. the order
# the labels are concatenated into uac_details.  `bit` is the LSB-based bit
# number.  `label` is the exact string the SPL appends.
# ---------------------------------------------------------------------------

# (spl_field_name, bit, emit_order, label)
_UAC_BITS = (
    # emitted first, and as a value rather than a suffix (Disabled/Enabled)
    ("uacf_account_state", 1, 0, "Disabled"),
    ("uacf_script_account", 0, 1, "Logon script is executed"),
    ("uacf_temp_dup_account", 8, 2, "Temp Duplicate Account"),
    ("uacf_home_dir_req", 3, 3, "Home Directory Required"),
    ("uacf_pwd_not_req", 5, 4, "Password Not Required"),
    ("uacf_pwd_cant_change", 6, 5, "Cant Change Password"),
    ("uacf_pwd_store_rev", 7, 6, "Store Password using reversible encryption"),
    ("uacf_normal_account", 9, 7, "Normal User Account"),
    ("uacf_trust_account", 11, 8, "InterDomain Trust Account"),
    ("uacf_wkstn_trust_account", 12, 9, "Workstation Trust Account"),
    ("uacf_srvr_trust_account", 13, 10, "Server Trust Account"),
    ("uacf_pwd_not_expire", 16, 11, "Password Does Not Expire"),
    ("uacf_mns_account", 17, 12, "Majority Node Set (MNS) account"),
    ("uacf_smartcard_req", 18, 13, "Smart Card Required"),
    ("uacf_trust_for_delegation", 19, 14, "Trusted for Delegation"),
    ("uacf_sensitive", 20, 15, "Sensitive - Not Delegated"),
    ("uacf_pwd_kerb_des", 21, 16, "Kerberos authentication DES only"),
    ("uacf_pwd_kerb_pre_auth", 22, 17, "Kerberos Does Not Require Pre-Auth"),
    ("uacf_pwd_expired", 23, 18, "Password has Expired"),
    ("uacf_trust_auth_for_delegation", 24, 19,
     "Can request a Kerberos ticket on behalf of another user"),
    ("uacf_kerb_no_pac", 25, 20, "Request Kerberos Ticket without PAC data"),
    ("uacf_dc_account", 26, 21, "Read Only Domain Controller Account"),
    # decoded and reported, but the SPL ladder never appends a label for it
    ("uacf_lockout", 4, None, "Account Locked Out"),
)

# Bits the SPL regex names but deliberately ignores (reserved / unused).
_UAC_RESERVED_BITS = ("uacf_na_1", "uacf_na_3", "uacf_na_4", "uacf_na_5")

# Plain-English, security-relevant observations.  Descriptive only - these are
# statements about configuration, never instructions or remediation advice.
_UAC_NOTES = {
    "uacf_pwd_not_expire":
        "the password never expires, so it is exempt from domain password-age policy",
    "uacf_pwd_not_req":
        "no password is required on this account",
    "uacf_pwd_store_rev":
        "the password is stored with reversible encryption and is recoverable in cleartext",
    "uacf_pwd_cant_change":
        "the account holder cannot change the password themselves",
    "uacf_pwd_kerb_pre_auth":
        "Kerberos pre-authentication is not required, which exposes the account to offline "
        "AS-REP credential cracking",
    "uacf_pwd_kerb_des":
        "only DES Kerberos encryption is permitted, which is deprecated and weak",
    "uacf_trust_for_delegation":
        "the account is trusted for unconstrained Kerberos delegation and can impersonate "
        "users to any service",
    "uacf_trust_auth_for_delegation":
        "the account can request Kerberos tickets on behalf of other users (constrained "
        "delegation with protocol transition)",
    "uacf_sensitive":
        "the account is marked sensitive and cannot be delegated",
    "uacf_smartcard_req":
        "interactive logon requires a smart card",
    "uacf_account_state":
        "the account is disabled",
    "uacf_lockout":
        "the account is currently locked out",
    "uacf_pwd_expired":
        "the password has expired",
    "uacf_kerb_no_pac":
        "Kerberos tickets are issued without PAC authorization data",
    "uacf_dc_account":
        "this is a read-only domain controller account",
}

# Flags whose presence is worth calling out first in a narrative.
_UAC_ELEVATED_INTEREST = (
    "uacf_pwd_not_req",
    "uacf_pwd_kerb_pre_auth",
    "uacf_trust_for_delegation",
    "uacf_pwd_store_rev",
    "uacf_pwd_kerb_des",
    "uacf_trust_auth_for_delegation",
    "uacf_pwd_not_expire",
)

_ACCOUNT_TYPE_FLAGS = (
    "uacf_normal_account",
    "uacf_trust_account",
    "uacf_wkstn_trust_account",
    "uacf_srvr_trust_account",
    "uacf_mns_account",
    "uacf_temp_dup_account",
)


def _coerce_int(value):
    """Best-effort int() over the loose types Splunk hands a search command.

    Returns None when the value cannot be read as a UAC integer; callers treat
    None as "unknown" rather than guessing.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float):
        return int(value) if value >= 0 else None
    if isinstance(value, (list, tuple)):
        # Splunk multivalue field - take the first usable element.
        for item in value:
            got = _coerce_int(item)
            if got is not None:
                return got
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        if text.lower().startswith("0x"):
            return int(text, 16)
        parsed = int(float(text)) if "." in text else int(text, 10)
        return parsed if parsed >= 0 else None
    except (TypeError, ValueError):
        return None


def to_bin_map(uac_int, width=32):
    """Render the MSB-first binary string the SPL macro calls uac_bin_map."""
    if uac_int is None:
        return ""
    return format(int(uac_int) & ((1 << width) - 1), "0{0}b".format(width))


def decode_uac(value):
    """Decode a userAccountControl value.

    Returns a dict:
        userAccountControl : int or None
        uac_bin_map        : 32-char MSB-first binary string ("" when unknown)
        uac_details        : ":"-joined label string, identical to the SPL output
        flags              : list of set flag labels, in SPL emission order
        flag_names         : list of set uacf_* names
        enabled            : True / False / None
        account_type       : coarse type label ("user", "computer", ...)
        notes              : list of descriptive security observations
        decoded            : bool - False when the input was unusable
    """
    uac_int = _coerce_int(value)
    if uac_int is None:
        return {
            "userAccountControl": None,
            "uac_bin_map": "",
            "uac_details": "",
            "flags": [],
            "flag_names": [],
            "enabled": None,
            "account_type": "unknown",
            "notes": [],
            "decoded": False,
        }

    set_names = set()
    for name, bit, _order, _label in _UAC_BITS:
        if uac_int & (1 << bit):
            set_names.add(name)

    disabled = "uacf_account_state" in set_names

    # Rebuild uac_details in exactly the SPL ladder order.
    ordered = sorted(
        [b for b in _UAC_BITS if b[2] is not None],
        key=lambda b: b[2],
    )
    parts = ["Disabled" if disabled else "Enabled"]
    labels = [parts[0]]
    for name, _bit, order, label in ordered:
        if order == 0:
            continue  # already handled as Enabled/Disabled
        if name in set_names:
            parts.append(label)
            labels.append(label)
    uac_details = ":".join(parts)

    # Lockout has no SPL label but is genuinely useful in a narrative.
    if "uacf_lockout" in set_names:
        labels.append("Account Locked Out")

    account_type = "unknown"
    if "uacf_wkstn_trust_account" in set_names:
        account_type = "computer"
    elif "uacf_srvr_trust_account" in set_names:
        account_type = "domain_controller_or_server_trust"
    elif "uacf_trust_account" in set_names:
        account_type = "interdomain_trust"
    elif "uacf_normal_account" in set_names:
        account_type = "user"

    notes = []
    for name in _UAC_ELEVATED_INTEREST:
        if name in set_names and name in _UAC_NOTES:
            notes.append(_UAC_NOTES[name])
    for name, _bit, _order, _label in _UAC_BITS:
        if name in set_names and name in _UAC_NOTES:
            note = _UAC_NOTES[name]
            if note not in notes:
                notes.append(note)

    return {
        "userAccountControl": uac_int,
        "uac_bin_map": to_bin_map(uac_int),
        "uac_details": uac_details,
        "flags": labels,
        "flag_names": sorted(set_names),
        "enabled": not disabled,
        "account_type": account_type,
        "notes": notes,
        "decoded": True,
    }


def describe_uac(value, subject="The account"):
    """One-or-two sentence plain-English rendering of a UAC value.

    Deterministic; used by the template fallback path of `adexplain`.
    """
    decoded = decode_uac(value)
    if not decoded["decoded"]:
        return "No usable userAccountControl value was supplied, so account flags " \
               "could not be decoded."

    state = "enabled" if decoded["enabled"] else "disabled"
    type_text = {
        "user": "a normal user account",
        "computer": "a workstation trust (computer) account",
        "domain_controller_or_server_trust": "a server trust account",
        "interdomain_trust": "an interdomain trust account",
    }.get(decoded["account_type"], "an account of undetermined type")

    sentence = "{0} is {1} and is {2} (userAccountControl={3}).".format(
        subject, state, type_text, decoded["userAccountControl"])

    extras = [f for f in decoded["flags"]
              if f not in ("Enabled", "Disabled")
              and f not in ("Normal User Account", "Workstation Trust Account",
                            "Server Trust Account", "InterDomain Trust Account")]
    if extras:
        sentence += " Flags set: {0}.".format(", ".join(extras))
    if decoded["notes"]:
        sentence += " In practice this means {0}.".format("; ".join(decoded["notes"]))
    return sentence


# ---------------------------------------------------------------------------
# Regression fixture: every row of lookups/ms_ad_obj_uac_temp.csv.
# self_test() proves the Python decode and the shipped SPL decode agree.
# ---------------------------------------------------------------------------
_SELF_TEST_ROWS = (
    (512, "Enabled:Normal User Account"),
    (514, "Disabled:Normal User Account"),
    (546, "Disabled:Password Not Required:Normal User Account"),
    (640, "Enabled:Store Password using reversible encryption:Normal User Account"),
    (4096, "Enabled:Workstation Trust Account"),
    (4098, "Disabled:Workstation Trust Account"),
    (4128, "Enabled:Password Not Required:Workstation Trust Account"),
    (66048, "Enabled:Normal User Account:Password Does Not Expire"),
    (66050, "Disabled:Normal User Account:Password Does Not Expire"),
    (66082, "Disabled:Password Not Required:Normal User Account:Password Does Not Expire"),
    (66176, "Enabled:Store Password using reversible encryption:Normal User Account:"
            "Password Does Not Expire"),
    (262656, "Enabled:Normal User Account:Smart Card Required"),
    (328192, "Enabled:Normal User Account:Password Does Not Expire:Smart Card Required"),
    (532480, "Enabled:Server Trust Account:Trusted for Delegation"),
    (1049088, "Enabled:Normal User Account:Sensitive - Not Delegated"),
    (1049090, "Disabled:Normal User Account:Sensitive - Not Delegated"),
    (1114624, "Enabled:Normal User Account:Password Does Not Expire:Sensitive - Not Delegated"),
    (2097664, "Enabled:Normal User Account:Kerberos authentication DES only"),
    (2163200, "Enabled:Normal User Account:Password Does Not Expire:"
              "Kerberos authentication DES only"),
    (4194816, "Enabled:Normal User Account:Kerberos Does Not Require Pre-Auth"),
    (4260352, "Enabled:Normal User Account:Password Does Not Expire:"
              "Kerberos Does Not Require Pre-Auth"),
    (4456962, "Disabled:Normal User Account:Smart Card Required:"
              "Kerberos Does Not Require Pre-Auth"),
    (6357504, "Enabled:Normal User Account:Password Does Not Expire:"
              "Kerberos authentication DES only:Kerberos Does Not Require Pre-Auth"),
    (7406080, "Enabled:Normal User Account:Password Does Not Expire:Sensitive - Not Delegated:"
              "Kerberos authentication DES only:Kerberos Does Not Require Pre-Auth"),
    (7668224, "Enabled:Normal User Account:Password Does Not Expire:Smart Card Required:"
              "Sensitive - Not Delegated:Kerberos authentication DES only:"
              "Kerberos Does Not Require Pre-Auth"),
    (7668226, "Disabled:Normal User Account:Password Does Not Expire:Smart Card Required:"
              "Sensitive - Not Delegated:Kerberos authentication DES only:"
              "Kerberos Does Not Require Pre-Auth"),
    (7668354, "Disabled:Store Password using reversible encryption:Normal User Account:"
              "Password Does Not Expire:Smart Card Required:Sensitive - Not Delegated:"
              "Kerberos authentication DES only:Kerberos Does Not Require Pre-Auth"),
)

_SELF_TEST_BIN = {
    512: "00000000000000000000001000000000",
    546: "00000000000000000000001000100010",
    532480: "00000000000010000010000000000000",
    7668354: "00000000011101010000001010000010",
}


def self_test():
    """Compare the Python decode against every shipped lookup row.

    Returns (passed:int, failures:list[str]).
    """
    failures = []
    passed = 0
    for uac, expected in _SELF_TEST_ROWS:
        got = decode_uac(uac)["uac_details"]
        if got != expected:
            failures.append("uac={0}\n  expected: {1}\n  got     : {2}".format(
                uac, expected, got))
        else:
            passed += 1
    for uac, expected_bin in _SELF_TEST_BIN.items():
        got_bin = decode_uac(uac)["uac_bin_map"]
        if got_bin != expected_bin:
            failures.append("uac={0} bin_map\n  expected: {1}\n  got     : {2}".format(
                uac, expected_bin, got_bin))
        else:
            passed += 1
    # Unusable inputs must degrade, never raise.
    for bad in (None, "", "not-a-number", [], {}, -1):
        result = decode_uac(bad)
        if result["decoded"] or result["uac_details"] != "":
            failures.append("unusable input {0!r} was not rejected".format(bad))
        else:
            passed += 1
    return passed, failures


if __name__ == "__main__":
    import sys

    ok, errs = self_test()
    print("ad_obj_uac_decode self-test: {0} checks passed, {1} failed".format(ok, len(errs)))
    for err in errs:
        print(err)
    sys.exit(1 if errs else 0)
