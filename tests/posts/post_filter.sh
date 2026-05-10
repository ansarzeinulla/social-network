#!/usr/bin/env bash
set -euo pipefail

# News feed filtering:
# - feed includes public posts;
# - feed includes almost_private posts from accepted followees;
# - feed does not leak almost_private/private posts from users the viewer cannot access;
# - abusive pagination params are rejected safely.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

viewer_cookie="$TMP_DIR/viewer.cookies"
followed_cookie="$TMP_DIR/followed.cookies"
stranger_cookie="$TMP_DIR/stranger.cookies"
private_author_cookie="$TMP_DIR/private-author.cookies"

register_user "pf-viewer-${RUN_ID}@t.io" "Feed" "Viewer" true "$viewer_cookie" "Feed viewer bio"
register_user "pf-follow-${RUN_ID}@t.io" "Feed" "Followed" true "$followed_cookie" "Feed followed bio"
followed_id="$CREATED_USER_ID"
register_user "pf-strange-${RUN_ID}@t.io" "Feed" "Stranger" true "$stranger_cookie" "Feed stranger bio"
register_user "pf-priv-${RUN_ID}@t.io" "Feed" "Private" true "$private_author_cookie" "Feed private bio"

status="$(request_json POST "/api/follow/$followed_id" '{}' "$viewer_cookie")"
assert_status "viewer follows followed author" 200 "$status"
assert_body_contains "feed follow accepted" "\"status\":\"accepted\""

public_content="feed visible public ${RUN_ID}"
followed_almost_content="feed visible followed almost ${RUN_ID}"
stranger_almost_content="feed hidden stranger almost ${RUN_ID}"
hidden_private_content="feed hidden private ${RUN_ID}"

status="$(request_form POST /api/posts/create "$stranger_cookie" -F "content=$public_content" -F "privacy=public")"
assert_status "create public feed post" 201 "$status"
status="$(request_form POST /api/posts/create "$followed_cookie" -F "content=$followed_almost_content" -F "privacy=almost_private")"
assert_status "create followed almost private feed post" 201 "$status"
status="$(request_form POST /api/posts/create "$stranger_cookie" -F "content=$stranger_almost_content" -F "privacy=almost_private")"
assert_status "create stranger almost private feed post" 201 "$status"
status="$(request_form POST /api/posts/create "$private_author_cookie" -F "content=$hidden_private_content" -F "privacy=private")"
assert_status "create hidden private feed post" 201 "$status"

status="$(request_get "/api/posts?page=1" "$viewer_cookie")"
assert_status "load viewer news feed" 200 "$status"
assert_body_contains "feed includes public post" "$public_content"
assert_body_contains "feed includes followed almost private post" "$followed_almost_content"
assert_body_not_contains "feed hides stranger almost private post" "$stranger_almost_content"
assert_body_not_contains "feed hides inaccessible private post" "$hidden_private_content"

status="$(request_get "/api/posts?page=-1" "$viewer_cookie")"
assert_status "reject negative pagination page" 400 "$status"

status="$(request_get "/api/posts?page=1&limit=9999999" "$viewer_cookie")"
assert_status "oversized ignored limit does not crash feed" 200 "$status"

echo "PASS: post_filter.sh completed $pass_count checks against $BASE_URL"
