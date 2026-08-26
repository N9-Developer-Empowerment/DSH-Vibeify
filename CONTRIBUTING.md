# Contributing

DSH Vibeify welcomes focused changes that preserve its Codex-lead, user-approval, and provider-isolation boundaries.

## Development

```bash
cd plugins/dsh-vibeify
npm test
npm run check
```

Validate the Codex plugin and skill from the repository root:

```bash
python3 /Users/you/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/dsh-vibeify
python3 /Users/you/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/dsh-vibeify/skills/dsh-vibeify
```

Then run:

```bash
./scripts/doctor.sh --source
```

## Pull-request evidence

Describe:

1. visible behavior and compatibility impact;
2. credentials, external actions, data-transfer, and billing implications;
3. characterization tests added before protocol changes;
4. DSH/Codex versions tested;
5. whether an actual app write or paid worker call was deliberately not performed; and
6. how a user can recover or roll back.

Never include real credentials, account details, private app data, prompts, or attachments in issues, tests, screenshots, or commits.
