---
date: 2025-05-19T18:53:00.000+09:00
slug: xigmanas-tailscale
title: XigmaNASにtailscaledをインストールする方法

---

FreeBSDベースのNASディストリビューション、XigmaNASにTailscaleのデーモン `tailscaled` を入れたときの自分用の手順メモ。


## まず前提として


XigmaNASはルートファイルシステム（`/`）がRAMディスクになっていて、再起動すると初期化される。つまり、`pkg install` で直接インストールしても再起動で消えてしまう。(そうしない設定もある)


設定ファイルや永続化したいデータは `/mnt` 配下などのストレージに保存する必要あり。恒久的なインストールは非推奨（というか意味がない）ので、その前提で進める。


## セットアップ手順


### 1. tailscale用の保存場所を作る


ZFSのDatasetを作成してtailscaleの実行ファイル・ステートの保存先を作成する。わたしは `/mnt/main/tailscale` を保存場所とした。


### 2. tailscaleをダウンロード


```text
pkg fetch tailscale
```


### 3. ダウンロードしたpkgを展開


tailscale用のディレクトリにpkgの内容を展開する。


```text
cd /mnt/main/tailscale
tar xvf /var/cache/pkg/tailscale-*.pkg
```


### 4. 起動スクリプトを作る


`/mnt/main/tailscale/start.sh` に以下を書く：


```text
#!/bin/sh
/usr/sbin/daemon -p /var/run/tailscale.pid \
  /mnt/main/tailscale/usr/local/bin/tailscaled \
  -statedir /mnt/main/tailscale/var/db/tailscale/
```


実行権限を付与する。


```text
chmod +x /mnt/main/tailscale/start.sh
```


### 5. 起動スクリプトをWeb UIに登録


Web管理画面の 「システム」 > 「高度な設定」 > 「コマンドスクリプト」へ進んで、 `/mnt/main/tailscale/start.sh` を「初期化後に実行するコマンド」として追加。


### 6. tailscaleでログイン


初回のみ必要：


```text
/mnt/main/tailscale/usr/local/bin/tailscale login
```


## アップグレード方法


アップグレード時は、以下だけやればOK。

1. `pkg fetch tailscale`
2. tarで再展開（`cd`して `tar xvf`）

## 補足


設定や状態は `/mnt/main/tailscale/var/db/tailscale/` に保存される。

