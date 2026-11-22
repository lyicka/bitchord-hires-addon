name: Sync Upstream and Patch Auth

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Sync with upstream and disable bitchordAuth
        run: |
          git config user.name "${{ github.actor }}"
          git config user.email "${{ github.actor_id }}+${{ github.actor }}@users.noreply.github.com"

          git remote add upstream https://github.com/juanjoblol/bitchord-hires-addon.git
          git fetch upstream HEAD
          git checkout FETCH_HEAD -- . ':!.github'

          node -e '
            const fs = require("fs");
            let code = fs.readFileSync("api/index.js", "utf8");
            code = code.replace(/bitchordAuth:\s*true/g, "bitchordAuth: false");
            code = code.replace(/checkValidLossless:\s*1/g, "checkValidLossless: 0");
            code = code.replace(/const auth = await bitchord\.verifyRequest\(req\);[\s\S]*?return json\(res, rejection\.status, rejection\.body, rejection\.headers\);\s*\}/g, "// auth bypassed");
            if (code.includes("bitchord.verifyRequest(")) {
              console.error("Error: verifyRequest() still remains in api/index.js. Upstream structure may have changed.");
              process.exit(1);
            }
            fs.writeFileSync("api/index.js", code);
          '

          git add -A
          if git diff --cached --quiet; then
            echo "No changes to commit."
            exit 0
          fi

          git commit -m "chore: sync upstream and disable bitchordAuth"
          git push origin "HEAD:${{ github.ref_name }}"
