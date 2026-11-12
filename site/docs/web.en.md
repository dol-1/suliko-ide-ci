# Private Web access

**No public multi-tenant BB Web SaaS is offered.** Stock BB is a powerful local application; never bind its unauthenticated API to a public interface.

The proposed future flow uses an **owner-controlled** BB instance with a private Tailscale identity and **Tailscale Serve**, conditioned on independent access-control and security checks. A published website is only documentation; it does not turn on Tailscale or authorize private device access.

Do not use Tailscale Funnel, public port forwarding, or shared in-process tenancy as substitutes for the security gate. Web parity test failures remain open, so identical Desktop/Web function is **not verified**.

See [privacy](privacy.en.md), [troubleshooting](troubleshooting.en.md) and [installation status](install.en.md).
