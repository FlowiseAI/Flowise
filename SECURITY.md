### Responsible Disclosure Policy

At Flowise, we prioritize security and continuously work to safeguard our systems. However, vulnerabilities can still exist. If you identify a security issue, please report it to us so we can address it promptly. Your cooperation helps us better protect our platform and users.

### Scope
-   Flowise Cloud: cloud.flowiseai.com
-   Public Flowise Repositories

### Out of scope vulnerabilities

-   Hypothetical issues that do not have a demonstrable, practical impact
-   Vulnerabilities that affect out-of-date browsers
-   ClickjackingCSRF on unauthenticated/logout/login pages
-   Banner disclosure on common/public services
-   Disclosure of known public files or directories (e.g. robots.txt)
-   Attacks requiring MITM (Man-in-the-Middle) or physical device access
-   Social engineering attacks
-   Denial service via bruteforce attack
-   Content spoofing and text injection without a valid attack vector
-   Username enumeration via Login Page error message
-   Username enumeration via Forgot password error message
-   Bruteforce attacks
-   Email spoofing
-   Absence of DNSSEC, CAA, CSP headers
-   Missing Secure or HTTP-only flag on non-sensitive cookies
-   Deadlinks
-   User enumeration
-   Social Engineering
-   Version Disclosure
-   Vulnerabilities that can only affect the attacker (e.g. self-XSS)
-   Known vulnerabilities in used libraries (unless exploitability can be proven)
-   Static application security testing findings


### Reporting Guidelines

-   Submit your findings to https://github.com/FlowiseAI/Flowise/security
-   Provide clear details to help us reproduce and fix the issue quickly.

### Reporting Guidelines

-   Submit your findings to https://github.com/FlowiseAI/Flowise/security
-   Ensure that the vulnerability is exploitable. Theoretical or static application security testing reports are subject to dismissal.
-   Submit the report with CVSS vector and calculated severity.
-   Provide a clear detailed report with proof of concept to help us reproduce and remediate the vulnerability.

### Disclosure Terms

The Flowise team believes that transparency is important and public bug bounty reports are a valuable source of knowledge for bug bounty researchers. However, the Flowise team may have legitimate reasons not to disclose vulnerabilities. 

Do not discuss or disclose vulnerability information without prior written consent. If you plan on presenting your research, please share a draft with us at least 45 days in advance for review. Avoid including:
-   Data from any Flowise customer projects
-   Flowise user/customer information
-   Details about Flowise employees, contractors, or partners

### Report Validation Times

We will validate submissions within the below timelines.
| Vulnerability Severity | Time to Validate |
| ---------------------- | ---------------- |
| Critical | 5 business days |
| High | 5 business days |
| Medium | 15 business days |
| Low | 15 business days |

Your report will be kept *confidential*, and your details will not be shared without your consent. The Flowise team will triage and adjust severity or CVSS score if necessary.
We appreciate your efforts in helping us maintain a secure platform and look forward to working together to resolve any issues responsibly.

### Remediation

Once the report has been verified, the Flowise team will plan the remediation steps.
Below is the estimated time to remediate the triaged security reports.

| Triaged Severity | Estimated Time to Remediate |
| ---------------------- | ---------------- |
| Critical | 30 business days |
| High | 60 business days |
| Medium | 90 business days |

### Public Disclosure Timeline

Public Disclosure occurs exactly 30 days after the next official release that includes the security patch. This period gives Flowise users a time to adopt the patched version before technical vulnerability details are made public, mitigating the risk of immediate post-disclosure exploitation.

#### Reaching out to the Security team
To report a new vulnerability, please submit a Github security Security Advisory report.
If you have any questions or concerns about the existing Security Advisory, please contact security-team@flowiseai.com.