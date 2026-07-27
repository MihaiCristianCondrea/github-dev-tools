# Security Policy

## Supported versions

Security fixes are applied to the latest version of the `main` branch.

| Version                                 | Supported |
|-----------------------------------------|-----------|
| Latest `main`                           | Yes       |
| Older commits, branches, or deployments | No        |

This repository is under active development. Older branches may contain incomplete migrations, temporary compatibility code, or outdated configuration and should not be treated as supported production
versions.

## Response process

After a report is received, the maintainer will attempt to:

1. Confirm receipt of the report.
2. Reproduce and assess the issue.
3. Determine its severity and affected surface.
4. Prepare and validate a fix.
5. Deploy or merge the fix when appropriate.
6. Provide credit to the reporter when requested and appropriate.

Response times are not guaranteed, but valid reports will be reviewed as soon as reasonably possible.

## Security-sensitive areas

The following parts of the project should be treated as security-sensitive:

- Administration routes under `/admin`
- Administration API routes under `/admin/api`
- HTTP Basic Authentication
- Cloudflare Worker environment bindings
- Cloudflare D1 database access
- Application metadata creation, editing, publication, and deletion
- Browser-local launcher preferences
- OpenAPI and Swagger administration surfaces
- Generated administration assets and browser scripts
- External redirects and links rendered in the administration interface

Secrets should be configured through Cloudflare and accessed only through the Worker environment.

## Secrets and sensitive data

The following information must never be committed to the repository:

* Production passwords
* Cloudflare API tokens
* GitHub access tokens
* Private keys
* Database exports containing sensitive data
* Session cookies
* Authorization headers
* Personal user information
* Internal credentials for external services

Use example values or clearly marked placeholders in tests and documentation.

Test credentials must not grant access to production infrastructure.

## Database security

The project uses Cloudflare D1.

Database access should follow these rules:

* Use parameterized queries for all externally influenced values.
* Do not concatenate request input into SQL statements.
* Validate identifiers, URLs, package names, labels, and other metadata before persistence.
* Keep D1 migrations append-only after deployment.
* Review destructive operations carefully.
* Preserve authentication checks for all administration writes.
* Avoid returning internal database rows directly when a feature DTO or domain mapping is available.
* Do not expose database errors, SQL statements, or internal schema details in public API responses.

## Input validation

All administration input should be validated before persistence.

This includes:

* Android package names
* Application names and descriptions
* Category identifiers
* URLs
* Link labels
* Screenshot metadata
* Release metadata
* Changelog content
* Publication status changes

Validation should remain in feature-owned domain or application code rather than being implemented only in HTTP route handlers.

Error responses should be actionable without leaking sensitive implementation details.

## External links and redirects

The administration launcher and metadata APIs may contain links to external services.

External links should:

* Use trusted HTTPS destinations.
* Use `target="_blank"` only with `rel="noopener noreferrer"`.
* Escape titles, URLs, and other rendered values.
* Avoid `javascript:`, `data:`, or other unsafe URL schemes unless explicitly required and securely validated.
* Avoid rendering untrusted HTML.
* Not rely only on client-side validation.

Launcher preferences are stored locally in the browser and should not contain secrets.

## Cross-site scripting protection

Server-rendered administration pages must escape all externally influenced values before inserting them into HTML.

Avoid:

* Unescaped string interpolation
* Inline execution of user-provided scripts
* Rendering user-controlled HTML
* Unsafe use of `innerHTML`
* Constructing CSS or JavaScript directly from request values

Where browser templates are required, values must be escaped before being embedded.

## API behavior

Public API endpoints should expose only information intended for public application consumers.

Administration endpoints may expose additional metadata but must remain authenticated.

The project should preserve a clear distinction between:

* Public application projections
* Administration projections
* Domain models
* D1 row models
* Browser presentation models

Do not expose unpublished or draft content through public endpoints unless the behavior is explicit and intentional.

## Architecture boundaries

The repository uses feature-first clean architecture.

Security-sensitive boundaries are enforced through CI:

* Domain and application layers must not depend on Hono, Cloudflare bindings, D1 adapters, browser globals, or HTTP response types.
* Presentation layers must not import concrete feature data adapters.
* Features must not reach into unrelated feature internals.
* Application composition is responsible for creating services and adapters from Worker bindings.
* Browser-only behavior must not execute during Worker module initialization.

Do not weaken architecture checks to bypass a failing migration. Fix the ownership violation instead.

## Dependencies and generated assets

Dependencies should be updated deliberately and reviewed for security impact.

Generated administration assets must be reproducible from pinned dependencies.

Do not edit generated files manually unless the generation process explicitly requires it.

Before merging security-sensitive dependency updates:

```bash
npm install
npm run check:architecture
npm run typecheck
npm test
npm run test:browser
wrangler deploy --dry-run
```

## Testing

Security-relevant behavior should be covered by automated tests where practical.

Important regression areas include:

* Administration authentication
* Unauthorized responses
* Input validation
* Duplicate detection
* Publication validation
* Public versus administration API visibility
* External-link attributes
* HTML escaping
* Browser-local preference recovery
* Database persistence
* Delete and update operations
* Architecture boundary enforcement

A passing CI pipeline does not by itself prove that the application is secure. Security review is still required for changes involving authentication, request parsing, HTML rendering, database
operations, external redirects, or authorization.

## Deployment checklist

Before a production deployment:

* Replace all temporary credentials.
* Configure Cloudflare secrets.
* Confirm that no sensitive values are committed.
* Run the complete validation pipeline.
* Review administration route protection.
* Review D1 migrations.
* Verify public and administration API separation.
* Check external redirects.
* Confirm HTTPS deployment.
* Review recent dependency changes.
* Confirm that test-only routes or fixtures are not unintentionally exposed.
* Rotate any credential used during development if it may have been shared.

## Disclosure

Please allow a reasonable period for investigation and remediation before publicly disclosing a vulnerability.

Coordinated disclosure is appreciated.