# OR-3185 — Send MGB feedback notifications from mghguidedor@mgb.org

Status: Testing   Assignee: Ryan Ducharme

## Description

ORCI on MGB OpenShift sends feedback notifications (for example "User Barcode Mapping") from noreply@guidedclinical.com through the MGB relay phsmgout.partners.org. That relay does not sign for guidedclinical.com and our SPF does not include it, so these messages fail DMARC (spf=fail, dkim=none). When OR-3122 moves guidedclinical.com to p=quarantine, Microsoft 365 puts them in junk. At p=reject, they bounce.

h3. Change

* In application-openshift-guidedor-prod.yml and application-openshift-guidedor-tst.yml, set internal-notifications.from-address to mghguidedor@mgb.org. The SMTP log appender already sends from this address through the same relay.
* The mgb.org SPF record authorizes the relay (hc6077-55.iphmx.com), so the messages pass DMARC as mgb.org mail. Reply-To stays guidedorfeedback@guidedclinical.com and the recipients do not change.
* The AWS profiles do not change. They send through Amazon SES with aligned DKIM.

h3. Done when

* Both OpenShift profiles send feedback notifications from mghguidedor@mgb.org.
* After the MGB prod deploy, a feedback message at guidedorfeedback@guidedclinical.com shows spf=pass and dmarc=pass with header.from=mgb.org.

## Comments (0)

(none)
