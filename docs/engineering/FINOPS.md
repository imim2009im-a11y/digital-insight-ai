# Zero Unapproved Spend — operational policy

Observed: 2026-10-31 UTC. **Maximum Unapproved Spending: $0.**

## Verified product policy

Official GitHub [Actions billing](https://docs.github.com/billing/concepts/product-billing/github-actions#included-compute-usage-and-storage) states:

> The use of standard GitHub-hosted runners is free:
> - In public repositories
> - For GitHub Pages
> - For Dependabot

[Source file](https://github.com/github/docs/blob/main/content/billing/concepts/product-billing/github-actions.md), observed blob `8eb24ae7a91e4f7aceff903aae7c069f40f19765`.

The [standard-runner reference](https://docs.github.com/actions/reference/runners/github-hosted-runners) lists `ubuntu-latest` as a standard Linux runner for public repositories. [Table source](https://github.com/github/docs/blob/main/data/reusables/actions/supported-github-runners.md), observed blob `f265c855f223dbc7ef6372786a0ec9cdf886ab48`.

This supports running existing checks on standard `ubuntu-latest` runners in the public `imim2009im-a11y/digital-insight-ai` repository without a compute charge. It does not establish zero costs for other products or runtime side effects. Larger runners are billed even in public repositories. Artifact/Packages storage has a separate pooled allowance; cache and custom-image storage have separate policies. Logs and job summaries do not count toward artifact-storage allowance.

## Safe baseline

- Use standard public-repository runners only for this PR's checks.
- Do not add new scheduled scanners, large artifacts/caches, package publications, Codespaces, model calls, hosting services or paid runners.
- Review any workflow invocation for external API usage, deployment hooks and storage effects before triggering it. A free runner does not make its external calls free.
- Keep tool evaluations local, offline and restricted to an approved source snapshot where possible.
- Never infer that a software license guarantees free hosted operation.

## Account state requiring verification

Actual target-account plan, usage, spending, payment methods and hard-stop settings were not available through the connection. Reference-plan quotas must not be reported as measured account entitlement. Current official documentation expresses Actions included compute in monetary credit rather than a fixed-minute allocation.

The owner can review **Settings → Billing and licensing → Budgets and alerts**. For metered products, select **Stop usage when budget limit is reached**, where supported; alerts alone do not stop usage. Verify the account/product scope covers every relevant SKU and that no prior current-cycle usage is overlooked. GitHub notes that a newly created budget only counts usage from creation onward. License-based product budgets often only alert and must not be treated as spending hard stops.

Sources: [Budgets and alerts](https://docs.github.com/billing/concepts/budgets-and-alerts), [Set up budgets](https://docs.github.com/billing/how-tos/set-up-budgets), [Included usage](https://docs.github.com/billing/reference/product-usage-included).

No budget, subscription, financial account, paid API, or billing setting was activated or changed by this research. If zero-spend enforcement cannot be verified for a new service, leave that service inactive.
