# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-11-23

### Added
- Remote GitHub repository auditing: run `npx dev-recap owner/repo` or `npx dev-recap https://github.com/owner/repo` without cloning manually.

## [1.1.0] - 2026-11-23

### Added
- Official GitHub Action (`action.yml`) with `path`, `days`, and `top` inputs, outputs, and Markdown Job Summary.

## [1.0.0] - 2026-11-23

### Added
- Initial release of `dev-recap` CLI.
- Git log & numstat parser with `--days` filtering.
- Terminal ASCII charts for weekday activity, conventional commit types, top contributors, and file hotspots.
- `--changelog [file]` Markdown changelog generator and `--json` output.
