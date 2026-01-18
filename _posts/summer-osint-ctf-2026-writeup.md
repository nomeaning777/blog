---
date: 2026-01-18
slug: summer-osint-ctf-2026-writeup
title: SWIMMER OSINT CTF Writeup

---

初心者向けのOSINT CTFであるSUMMER OSINT CTFにチームHSF(ソロ)で参加しました。全問解くことができましたが、時間がかかり最終61位でした。


OSINTに関しては入門者ですが、楽しく参加することが出来ました。


以下はWriteupです。


# tgt_rain


## rain_01_social 


rainのXのスクリーンショットが渡される。ユーザー名は隠れているが、Xでメッセージを検索することでrainのXのアカウントID(`@bruto_rain`)を特定した。
さらにXのプロフィールからrainのブログ ([https://brutorain.wordpress.com](https://brutorain.wordpress.com/) )を特定した。今後の問題ではこれに関する調査を行なっていくことになる。


## rain_04_source2


問題文で言われている2番目に作成した偽記事というのは**「誰も知らない真実を発見**」というタイトルの記事のこと。


Google画像検索でこの画像が乗っている記事を見つけ、その出典が”議院建築意匠設計競技図集”となっていることから、10.11501/967480 と特定した。


## rain_06_ai


ブログから東京駅の画像をダウンロードする。URLのクエリに `w=1024`とついており加工されていそうだったので、それを外してダウンロードしたところ生の tokyo_0003.jpeg がダウンロードできた。


```typescript
❯ exiftool tokyo_0003.jpeg
...
User Comment                    : {"aigc_info":{"aigc_label_type":0,"source_info":"dreamina"},"data":{"os":"web","product":"dreamina","exportType":"generation","pictureId":"0"},"trace_info":{"originItemId":"7590949739743448328"}}
...
```


Exif情報を見てみるとDreaminaで生成されていることがコメントに残っていた。


## rain_05_date


画像の看板を抽出して画像検索すると類似した画像として、”SUNTORY 10000 freude”の看板が出てくる。色こそ違うが文字が同じだろうということでSUNTORY 10000 freudeが2025年に大阪城で行なわれた日付を調べたところ、2025/12/07と特定できた。


## rain_03_source1


ありがとうChatGPT [https://chatgpt.com/share/696c962f-4ff0-8000-a3f2-1782e1f34c55](https://chatgpt.com/share/696c962f-4ff0-8000-a3f2-1782e1f34c55)


## rain_02_region


気合。keihan-2.pngがsetouchi.pngということまで絞った上で両方試すつもりでまずkeihan-2.pngの星ヶ丘駅を入れて正解となった。


```typescript
hankyu-1.png:     PNG image data, 1408 x 768, 8-bit/color RGB, non-interlaced # AI 阪急梅田駅なんてない
hiroshima-1.png:  PNG image data, 1024 x 660, 8-bit/color RGB, non-interlaced # 車両が特定できず
hokkaido.png:     PNG image data, 1024 x 786, 8-bit/color RGB, non-interlaced # よく分からん。送電線に違和感
kansai.png:       PNG image data, 868 x 658, 8-bit/color RGB, non-interlaced # 車両か特定できず。行き先表示が光っていない
keihan-2.png:     PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced 矛盾なし。電話番号などが正しいことから実写。 星ヶ丘駅
kyushu.png:       PNG image data, 2816 x 1536, 8-bit/color RGB, non-interlaced  # AI 左上にＪＲ九州とはかかない Imagenのサイズ
kyushu2.png:      PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced # 違和感がある。鼻がおかしい
oimachi.png:      PNG image data, 2400 x 1620, 8-bit/color RGB, non-interlaced # 行き先表示が変
okayama.png:      PNG image data, 1288 x 703, 8-bit/color RGB, non-interlaced # 225は岡山には来ていない
sannnomiya-1.png: PNG image data, 1408 x 768, 8-bit/color RGB, non-interlaced # AIっぽい
setouchi.png:     PNG image data, 1224 x 768, 8-bit/color RGB, non-interlaced # 115系 あまり違和感はない
sotobo.png:       PNG image data, 2178 x 1188, 8-bit/color RGB, non-interlaced # 関東なので無視
suigun.png:       PNG image data, 2816 x 1360, 8-bit/color RGB, non-interlaced # 関東。ラッピングがおかしい
tobu_line.png:    PNG image data, 2393 x 1306, 8-bit/color RGB, non-interlaced # 関東。下板板駅なんてない
tohoku-1.png:     PNG image data, 2432 x 1327, 8-bit/color RGB, non-interlaced # AI。隣駅がおかしい
tokai-2.png:      PNG image data, 2412 x 1315, 8-bit/color RGB, non-interlacedl #AIっぽい、形式が書かれていない。窓の分割数が多いなどの差異
yokosuka.png:     PNG image data, 2646 x 1536, 8-bit/color RGB, non-interlaced # 関東
```


# tgt_debeyohiru


## debeyohiru_01_social


debeyohiru で検索したらBlueskyのアカウントを発見した。その時にNoteのスクリーンショットを上げており、そのIDがfuraigo5であった。


## debeyohiru_02_profile


furaigo5で検索したら、Github Pages ([https://furaigo5.github.io/profile/](https://furaigo5.github.io/profile/) )を発見した。


## debeyohiru_03_email


Profileページにメールアドレスが含まれていた。([furaigo5.onionsoup@gmail.com](mailto:furaigo5.onionsoup@gmail.com) )


## debeyohiru_05_hidden1


Javascriptのソースコードのコメントに名前が含まれていた。


## debeyohiru_06_hidden2


Webサイトの履歴を探したところ、archive.md に古いウェブサイトが保存されていて特定できた。
検索のキャッシュにgithub.com/furaigo5/profileが残っていたので、それを使うのかなと思ったり、Wayback Machineと魚拓しか調べていなかったりで時間がかかってしまった。


## debeyohiru_04_meal


Blueskyを見ると、12/28に早めの夕食としてポムの樹の画像を上げている。それに対するリプライとして、1/10の17:04に単品を頼んだという内容の投稿をしている。


ポムの樹であることは分かったので、次に場所を推定することとした。
プロフィールに渋谷在住を書かれていることや、Blueskyのアップロードされている画像の大半が渋谷のものであることからポムの樹 渋谷スペイン坂店を推定した。


ここで詰まってしまう。食べログやホットペッパーグルメを見たが1/10の画像は上がっていなかった。数時間ぐらいしてたまたまGoogle Mapで 渋谷スペイン坂店を見たら”ふらいご5”さんが1/10画像を上げていることに気づいて、食事の写真を得ることができた。


ポムの樹はメニューを公式サイトで公開していないのだが、ChatGPTに聞いたら「豚肉とリンゴの ホタテトマトクリームオムライス」と特定してくれた。


# tgt_lilica


## lilica_01_social


黄昏ブロッサムリリカで検索することで、Xアカウント `@twilight_lilica` を発見した。


## lilica_04_domain


Xから個人サイト [twilight-lilica.com](http://twilight-lilica.com/) を特定。whoisコマンドから2025-10-05にドメインを取得したことが分かった。


## lilica_05_hosting


[twilight-lilica.com](http://twilight-lilica.com/) のIPアドレスをwhoisすることで、VultrのIPであることが判明。Vultrのabuseメールアドレスを調べて送信した。


## lilica_03_virtual_world


11/09の投稿の画像から #VRC_ナギサというハッシュタグがあることが分かる。ハッシュタグを調べることで、NAGiSAというワールドであることが分かり、検索でWorld IDも特定できた。


## lilica_02_virtual_identity


VRChatにログインし、黄昏ブロッサムリリカでユーザー検索することで、ユーザーID usr_b103fac6-8341-4b89-a606-920092e75e43を特定した。


## lilica_06_name


Xにヘアピンのfbxファイルを上げているのを見つけた。このファイルをstringsで見てみたところ、C:\Users\shiharu_nanaogi\Documents\modeling\vrc_test\hair_pin\simple_hair_pin.fbx という文字列が見つかったことから、本名をshiharu_nagaogiと推定した。


## lilica_07_work


ヒントから、伏せているつもりの情報を使うことがわかる。それは名前だろうと推定していろいろなSNS(Facebook, Instagram, Linkedin, Mixi2, Mixi, Threads)などを検索するがユーザーを見つけられず。


最後のヒントのタイミングで、方針があっていることが分かったので、再度SNSを検索したところInstagramにユーザーを発見した。最初の検索では、名字だけだったために見つけられなかったらしい。


Instagramのタグに中目黒がついていることから、それを解として送信した。


## ops_swimmer


まず、lilicaが上げている画像がデニーズであり、それが3人での食事の写真でそのうち1人の選んだメニューがrainの上げている画像と一致することから、店舗はデニーズと推定した。


次に日付だが、debeyohiruは年末に人とあうと言っていること、lilicaはコミケ前といっていること、そしてrainが12/30 21:40に”さっき解散した！ 何か新しいことが始まりそう予感” と呟いていることから、12/30と推定した。


場所は、rainが12/30の16:47の大井町駅の入場券の画像を上げていることや、解散時の写真が品川区のものであることからデニーズ大井町駅前店とした。


最後に時間だが、debeyohiruのGoogle Calendarを見たところ18:30に集会という予定があったため、18:30と特定できた。


# research_2025


全てChatGPTが解いた。

