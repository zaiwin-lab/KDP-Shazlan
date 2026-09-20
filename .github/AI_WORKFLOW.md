# AI-Assisted Development Workflow

This repository is maintained as an AI-assisted project with human ownership and review.

## Source-of-truth rules

- GitHub is the source of truth for production code.
- AI tools work on feature branches such as `claude/*` or `ai/*`.
- Push source changes to GitHub before production deployment.
- Open a pull request into `main` for owner review and acceptance.
- Production deployments should originate from the reviewed GitHub branch whenever practical.
- Netlify Drop or CLI-only deployment is temporary; sync the exact deployed source back to GitHub immediately.
- Preserve truthful authorship. AI-authored commits stay attributed to the tool; human review, acceptance, PR and merge activity are attributed to the owner.
- Do not backdate commits or manufacture activity.

## Completion definition

A build is complete only when the live deployment and the GitHub source are in sync and the repository contains a reviewable history.
