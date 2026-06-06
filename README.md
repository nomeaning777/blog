https://blog.hoge.cc

## Alpacahack Daily writeups

通常ブログの `_posts` とは別に、Markdown ファイルを追加するだけで Alpacahack Daily の記事を公開できます。Notion は使いません。

Daily のファイル名規則:

```text
alpacahack-daily/YYYY-MM-DD-slug.md
```

B-Side のファイル名規則:

```text
alpacahack-daily-bside/YYYY-MM-slug.md
```

frontmatter は `title` のみです。

```yaml
---
title: "Example"
---
```

日付、年月、slug、種別はディレクトリ名とファイル名から読み取られます。

画像などのアセットは `public/assets/alpacahack-daily/...` に配置し、記事本文から `/assets/alpacahack-daily/...` として参照してください。
