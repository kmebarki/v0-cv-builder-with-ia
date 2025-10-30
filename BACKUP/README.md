# Project Backup Archive

A compressed snapshot of the repository is stored at `BACKUP/project-backup.zip`.

## Download

### Option 1 - Browser (authenticated)
1. Sign in to GitHub with an account that can access this repository.
2. Open the raw download URL:
   ```
   https://github.com/kmebarki/v0-cv-builder-with-ia/raw/release/v0.4.0/BACKUP/project-backup.zip
   ```
3. Your browser should begin downloading `project-backup.zip`.

> Note: A **404 Not Found** response almost always means the request is not authenticated (for example, the repository is private). Log in and try again, or use the command-line option below with a personal access token.

### Option 2 - Command line
Use `curl` with a GitHub token that has read access to the repository:
```bash
curl -H "Authorization: Bearer <GITHUB_TOKEN>" \
     -L "https://raw.githubusercontent.com/kmebarki/v0-cv-builder-with-ia/release/v0.4.0/BACKUP/project-backup.zip" \
     -o project-backup.zip
```
Replace `<GITHUB_TOKEN>` with your personal token. Do not share this token or paste it into logs.

## Verify integrity
After downloading, confirm the checksum to make sure the archive is intact:
```bash
sha256sum project-backup.zip
```
Expected SHA-256 checksum:
```text
336d52cc2ec7f8e400850434bc75b9316a27a03793daaeaf36f6950d022c1c63
```

## Contents
The archive contains the entire repository at commit `bb6f7c329734f0131da335d58300998e4bb7a545` on branch `release/v0.4.0`.
