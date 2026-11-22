#!/usr/bin/env bash
# Publish ONLY allowlisted JSON research reports from reviewed main code.
# This deliberately creates a commit with the exact main tree plus approved
# report files; no scripts or other files from a bot branch are carried over.
set -euo pipefail
mode="${1:?expected prepare or publish}"
: "${REPORT_BRANCH:?missing REPORT_BRANCH}" "${REPORT_FILES:?missing REPORT_FILES}"
case "$REPORT_BRANCH|$REPORT_FILES" in
  'neryx/research-phase70|evolution/phase70/knowledge.json'|\
  'neryx/research-phase76|evolution/phase76/review76.json'|\
  'neryx/research-phase77|evolution/phase77/research77.json'|\
  'neryx/research-phase78|evolution/phase78/research78.json'|\
  'neryx/research-phase79|evolution/phase79/research79.json'|\
  'neryx/research-phase710|evolution/phase710/research710.json'|\
  'neryx/research-phase711|evolution/phase711/research711.json'|\
  'neryx/research-phase712|evolution/phase712/audit712.json,evolution/phase712/research711.json'|\
  'neryx/research-phase713|evolution/phase713/audit713.json,evolution/phase713/research711.json')
    ;;
  *) echo 'ERROR: branch and report allowlist mismatch' >&2; exit 1 ;;
esac
IFS=',' read -r -a report_paths <<< "$REPORT_FILES"
git check-ref-format --branch "$REPORT_BRANCH" >/dev/null
git fetch --no-tags origin main:refs/remotes/origin/main
main_sha="$(git rev-parse refs/remotes/origin/main)"
test "$(git rev-parse HEAD)" = "$main_sha" || {
  echo 'ERROR: main advanced during checkout, retry the run' >&2; exit 1;
}
case "$mode" in
  prepare)
    if git ls-remote --exit-code --heads origin "refs/heads/$REPORT_BRANCH" >/dev/null; then
      git fetch --no-tags origin "refs/heads/$REPORT_BRANCH:refs/remotes/origin/$REPORT_BRANCH"
      old_sha="$(git rev-parse "refs/remotes/origin/$REPORT_BRANCH")"
      base_sha="$(git merge-base "$old_sha" "$main_sha")"
      for path in "${report_paths[@]}"; do
        # Never replace a newer reviewed main report with an old branch snapshot.
        if ! git diff --quiet "$base_sha" "$main_sha" -- "$path"; then
          echo "main has newer reviewed data, using main: $path"
          continue
        fi
        if git cat-file -e "$old_sha:$path" 2>/dev/null; then
          temp="$(mktemp "$RUNNER_TEMP/review-json.XXXXXX")"
          git show "$old_sha:$path" > "$temp"
          test "$(wc -c < "$temp")" -le 2000000
          python3 -m json.tool "$temp" >/dev/null
          cp "$temp" "$path"
          rm -f "$temp"
        fi
      done
    fi
    ;;
  publish)
    tmpdir="$(mktemp -d "$RUNNER_TEMP/research-report.XXXXXX")"
    for path in "${report_paths[@]}"; do
      test -f "$path" || { echo "Missing generated report: $path" >&2; exit 1; }
      test "$(wc -c < "$path")" -le 2000000
      python3 -m json.tool "$path" >/dev/null
      mkdir -p "$tmpdir/$(dirname "$path")"
      cp "$path" "$tmpdir/$path"
    done
    # Start from reviewed main, not a checkout of an untrusted bot branch.
    git reset --hard "$main_sha"
    git clean -fd
    for path in "${report_paths[@]}"; do
      cp "$tmpdir/$path" "$path"
      git add -- "$path"
    done
    if git diff --cached --quiet; then
      echo 'No report changes; no branch push needed.'
      exit 0
    fi
    tree_sha="$(git write-tree)"
    git config user.name 'LernBot Research Bot'
    git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
    if git ls-remote --exit-code --heads origin "refs/heads/$REPORT_BRANCH" >/dev/null; then
      # The new commit descends from the previous review tip AND main. The
      # commit tree nevertheless contains only main + approved report files.
      git fetch --no-tags origin "refs/heads/$REPORT_BRANCH:refs/remotes/origin/$REPORT_BRANCH"
      old_sha="$(git rev-parse "refs/remotes/origin/$REPORT_BRANCH")"
      new_sha="$(printf '%s\n' 'LernBot: review-only research report' | git commit-tree "$tree_sha" -p "$old_sha" -p "$main_sha")"
    else
      new_sha="$(printf '%s\n' 'LernBot: review-only research report' | git commit-tree "$tree_sha" -p "$main_sha")"
    fi
    # No force, and never a ref to main. Concurrent updates are rejected.
    git push origin "$new_sha:refs/heads/$REPORT_BRANCH"
    echo "Open manual PR: https://github.com/${GITHUB_REPOSITORY}/compare/main...$REPORT_BRANCH"
    ;;
  *) echo "Invalid mode: $mode" >&2; exit 1 ;;
esac
