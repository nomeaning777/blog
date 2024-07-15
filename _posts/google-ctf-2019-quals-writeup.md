---
date: 2019-06-27T05:31:00.000+09:00
slug: google-ctf-2019-quals-writeup
title: Google Capture The Flag 2019 (Quals) Writeup

---

# Quantum Key Distribution (Crypto 92pts)


[BB84](https://ja.wikipedia.org/wiki/%E9%87%8F%E5%AD%90%E9%8D%B5%E9%85%8D%E9%80%81#BB84_protocol:_Charles_H._Bennett_and_Gilles_Brassard_(1984)) がサーバー上に実装されている。ユーザーは鍵配送の時の基底と観測した基底を送信すると、サーバーはサーバー側の基底と、“announcement”というフラグを暗号化した鍵をエンコードしたものが返される。
ソースコードがないため、“announcement”がどのようにエンコードされているか不明だったが、鍵配送の結果の共有鍵とフラグの暗号鍵を XOR したものが正解であった。


```ruby
def rotate(c)
    c * Complex(0.707, -0.707)
end

def mesure(rx_qubits, basis)
    ret = ''
    rx_qubits.zip(basis.chars).each do |q, b|
        q = rotate(q) if b == 'x'
        s = q.real**2 + q.imag**2
        if rand(s) < q.real
            ret += '0'
        else
            ret += '1'
        end
    end
    ret
end

require 'httpclient'
require 'json'

client = HTTPClient.new
def query(client, basis, qubits)
    data = {
        'basis': basis,
        'qubits': qubits.map{|a|{'real': a.real, 'imag': a.imag}}
    }
    resp = client.post_content('https://cryptoqkd.web.ctfcompetition.com/qkd/qubits', data.to_json, 'Content-Type' => 'application/json')
    return JSON.parse(resp)
end
basis = '+x' * 256
bits = mesure( [Complex(1, 0),rotate(Complex(1,0))] * 256, basis)
begin
    resp = query(client,  basis, [Complex(1, 0),rotate(Complex(1,0))] * 256)
rescue => e
    p e.res.body
    raise
end
binary_key = ''
resp['basis'].zip(basis.chars).each.with_index do |(c1, c2), i|
    if c1 == c2
        binary_key += bits[i]
    end
end
p binary_key
t = ['%032x' % binary_key[0, 128].to_i(2)].pack('H*')
require 'ctf'
File.binwrite('enc.key', [resp['announcement']].pack("H*") ^ t)
system 'echo "U2FsdGVkX19OI2T2J9zJbjMrmI0YSTS+zJ7fnxu1YcGftgkeyVMMwa+NNMG6fGgjROM/hUvvUxUGhctU8fqH4titwti7HbwNMxFxfIR+lR4=" | openssl enc -d -aes-256-cbc -pbkdf2 -md sha1 -base64 --pass file:enc.key'
```


# Reverse Cellular Automata (Crypto 84pts)


バックトラックで条件を満たす鍵を探索する。


```ruby
def next_step(x, bits)
    r = 0
    bits.times do |b|
        b1 = x >> b & 1
        b2 = x >> ((b + 1) % bits) & 1
        b3 = x >> ((b - 1) % bits) & 1
        r |= 1 << b if b1 != b2 || b2 != b3
    end
    return r
end

def reverse(x, cur, b, bits)

    if b == bits
        if next_step(cur, bits) == x
            return [cur]
        end
        return []
    elsif b > 2
        b1 = (cur >> (b - 3)) & 1
        b2 = (cur >> (b - 2)) & 1
        b3 = (cur >> (b - 1)) & 1
        c = 1
        c = 0 if b1 == b2 && b2 == b3
        return [] if c != (x >> (b - 2) & 1)
    end
    reverse(x, cur, b + 1, bits) + reverse(x, cur | (1 << b), b + 1, bits)
end
def inverse_step(x, bits)
    reverse(x, 0, 0, bits)
end

p '%x' % next_step(0xdeadbeef, 32)
sz = 0
inverse_step(0x66de3c1bf87fdfcf, 64).each do |k|
    File.binwrite('tmp.key', ['%016x' % k].pack('H*'))
    system 'echo "U2FsdGVkX1/andRK+WVfKqJILMVdx/69xjAzW4KUqsjr98GqzFR793lfNHrw1Blc8UZHWOBrRhtLx3SM38R1MpRegLTHgHzf0EAa3oUeWcQ=" | openssl enc -d -aes-256-cbc -pbkdf2 -md sha1 -base64 --pass file:tmp.key'
    STDERR.puts sz
    sz += 1
end
```


# reality (Crypto 279pts)


ソースコードや暗号の情報もなく、ただ 3 つの係数が渡されるだけである。
問題文に’Shamir did’と含まれていることから、(5,5)閾値のシャミアの秘密分散法で、渡されている 5 つのタプルは係数ではなく秘密分散における点であると推測した。
さらに、y がおおよそ 128bit の値になっていることと問題名に含まれる`real`という文字列から、秘密分散によって生成された多項式は 128bit 程度の整数からなる数字と推測した。


この仮定のもとだと、整数であるという追加の情報から 3 つの点から 5 つの係数を復元できうる。
具体的には多項式を$y = \sum_{i=0}^4 a_ix^i$_とした時に_、_ある大きな整数_ $B$ _に対して_、 $\sum_{i=0}^4 a_i \lfloor Bx^i +0.5 \rfloor \bmod B$ を小さくするような $a_i$ _を求める問題とみなす_。_これは次のような行列に対するLLLを求めることで計算できる_。( $\lambda$は適当な大きな整数)


$$
\begin{bmatrix}-By_1 & -By_2 & -By_3 & 0 & 0 & 0 & 0 & 0 & \lambda \\Bx_1^0 & Bx_2^0 & Bx_3^0 & 1 & 0 & 0 & 0 & 0 & 0  \\Bx_1^1 & Bx_2^1 & Bx_3^1 & 0 & 1 & 0 & 0 & 0 & 0  \\Bx_1^2 & Bx_2^2 & Bx_3^2 & 0 & 0 & 1 & 0 & 0 & 0  \\Bx_1^3 & Bx_2^3 & Bx_3^3 & 0 & 0 & 0 & 1 & 0 & 0  \\Bx_1^4 & Bx_2^4 & Bx_3^4 & 0 & 0 & 0 & 0 & 1 & 0  \\B & 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0  \\0 & B & 0 & 0 & 0 & 0 & 0 & 0 & 0  \\0 & 0 & B & 0 & 0 & 0 & 0 & 0 & 0  \\\end{bmatrix}
$$


LLL の結果の行のうち、$r_8 = \lambda$ _のものについて_、 $a_1 = r_4, a_2 = r_5, a_3 = r_6, a_4 = r_7$ となっている。$a_0$は整数かどうかに影響を与えないため LLL から出てこないが、残りの係数と一つの点から求めることが出来る。


```python
# coding: utf-8
import json
import sys

with open(sys.argv[1], 'rb') as f:
    data = json.loads(f.read())

# print(data)
coeffs = data['coeffs']
enc = data['enc']
F = RealField(1660)

coeffs = map(lambda a: (F(a[0]), F(a[1])),coeffs)
coeffs = sorted(coeffs)
# データを壊して挙動観察する
# coeffs[0] = (coeffs[0][0] + 1, coeffs[0][1])
M = Matrix(ZZ, 9, 9)
i = 0
B = 2**500
lam = 2 ** 4096
for (x, y) in coeffs:
    M[0, i] = round(B * -y)
    M[1, i] = round(B)
    M[2, i] = round(B * x)
    M[3, i] = round(B * x^2)
    M[4, i] = round(B * x^3)
    M[5, i] = round(B * x^4)
    i += 1
M[0, 3] = lam
M[1, 4] = 1
M[2, 5] = 1
M[3, 6] = 1
M[4, 7] = 1
M[5, 8] = 1

M[6, 0] = B
M[7, 1] = B
M[8, 2] = B

# print M

def split_number(x):
    i = int(x)
    return (i, x - i)

for row in M.LLL():
    trow = row
    if row[3] == -lam:
        trow *= -1
    if trow[3] == lam:
        a0 = F(trow[4])
        a1 = F(trow[5])
        a2 = F(trow[6])
        a3 = F(trow[7])
        a4 = F(trow[8])
        rej = F(0)
        for (x, y) in coeffs:
            rem = split_number((a0 * 1 + a1 * x**1 + a2 * x **2 + a3 * x **3 + a4 * x**4 - y))[1]
            rem = min(1-abs(rem), abs(rem))
            rej += rem ** 2
            if a0 == 0:
                a0 = -int((a0 * 1 + a1 * x**1 + a2 * x **2 + a3 * x **3 + a4 * x**4 - y) - F(1e-9))
            print(rem)
        print(rej.sqrt())


        PR.<x> = PolynomialRing(F)
        f = a0 + a1 * x + a2 * x ^ 2 +a3 * x^3 + a4 * x^4
        print '%x,%x,%x,%x,%x' % (int(a0), int(a1),int(a2),int(a3),int(a4))
```


上記のプログラムをサーバーから得られた入力に対して複数回実行したところ、係数が全て 128bit の正の整数となるような結果を返しており、入力がランダムなら負数になるようなものも出現するはずであるため、最初の推測はおそらく正しいということが分かった。


後はフラグの暗号化を解けば良いのだが、これについてもどのような形式かは推測するしかない。チームメイトが AES-128-CBC という当たりを引いたので解くことが出来た。


```ruby
require 'openssl'
enc = OpenSSL::Cipher.new('AES-128-CBC')
enc.decrypt
enc.iv = "\0" * 16
enc.key = ['%x' % a0].pack('H*')
puts enc.update(flag) + enc.final
```


サーバーに接続して、sage プログラム用の JSON ファイルを出力するプログラム


```ruby
require 'ctf'
require 'base32'
require 'json'

TCPSocket.open(*ARGV) do |s|
    s.echo = false
    s.expect(/Here's a base32-encoded and encrypted flag: /)
    b32 = Base32.decode(s.gets.strip)
    s.gets
    coeffs = []
    3.times do
        coeffs <<= s.gets.split(/[\s,]+/)[2, 2]
    end

    puts ({
        'enc' => b32.unpack1("H*"),
        'coeffs' => coeffs
    }).to_json
end
```


# glotto (Web 288pts)


order by から順列分の情報量が得られるので、$(8! 9! 7! 4!) / 36 ^ {12} = 1 / 2678$の確率で成功するようなプログラムを書くことが出来る。


```ruby
march = %W(2019-03-01 2019-03-05 2019-03-10 2019-03-13 2019-03-18 2019-03-23 2019-03-28 2019-03-30)
april = %W(
    2019-04-27
2019-04-22
2019-04-18
2019-04-14
2019-04-12
2019-04-10
2019-04-06
2019-04-02
2019-03-01
)
may = %W(
    2019-03-01
2019-05-04
2019-05-09
2019-05-10
2019-05-16
2019-05-20
2019-05-25
)
june = %W(2019-03-01
2019-06-04
2019-06-08
2019-06-22
)
# permutationのコンバートはswapを利用した方法を利用
# https://stackoverflow.com/a/24689277

def generate_query(idx, sz, query)
    return query if idx == sz
    suffix = " FROM (#{query}) l"
    divder = sz - idx
    query = "SELECT n DIV #{divder} n"
    # a
    (divder - 1).times do |i|
        query += ",CASE WHEN n MOD #{divder}=#{i} THEN a#{divder - 1} ELSE a#{i} END a#{i}"
    end
    # r
    sz.times do |i|
        if i == idx
            query += ",CASE n MOD #{divder} "
            divder.times do |j|
                query += "WHEN #{j} THEN a#{j} "
            end
            query += "END r#{i}"
        else
            query += ",r#{i}"
        end
    end

    generate_query(idx + 1, sz, query + suffix)
end

def generate_permutation(sz, n)
    # Baseを作成する
    base_query = "SELECT #{n} as n," + (Array.new(sz){|i| "#{i} a#{i}"}).join(',') + "," +
                             (Array.new(sz){|i| "-1 r#{i}"}).join(',')
    generate_query(0, sz, base_query)
end

def get_query(dates, n)
    sz = dates.size
    dates = dates.sort
    query = generate_permutation(sz, n)
    order = 'date`*0+('
    query2 = "SELECT CASE `date`"
    dates.each.with_index do |d, i|
        query2 += " WHEN 0x#{d.unpack1('H*')} THEN r#{i}"
    end
    query2 += " END FROM (#{query}) l)#"
    return order + query2
end


# 解法用の関数
def to_perm(p, n)
    e = Array.new(n){|i| i}
    r = [nil] * n
    n.times do |i|
        index = p % (n - i)
        p = p / (n - i)
        r[i] = e[index]
        e[index] = e[n - i - 1]
    end
    return r
end

# 数字順列の逆
def inv_perm(perm, n)
    pos = Array.new(n){|i|i}
    e = Array.new(n){|i|i}
    ret = 0
    m = 1
    (n - 1).times do |i|
        ret += m * pos[perm[i]]
        m = m * (n - i)
        pos[e[n - i - 1]] = pos[perm[i]]
        e[pos[perm[i]]] = e[n - i - 1]
    end
    ret
end

# 順列の逆。
def inverse_permutation(perm)
    ret = Array.new(perm.size)
    perm.each.with_index do |p, i|
        ret[p] = i
    end
    return ret
end

def inv_dates(dates)
    n = dates.size
    s = dates.sort
    inv_perm(inverse_permutation(dates.map{|a|s.index(a)}), n)
end


#p inv_perm([3, 1, 0, 2], 4)

#p to_perm(7, 4)
#puts generate_permutation(4, 19)

# BASE_URL = 'http://127.0.0.1:8000/'
BASE_URL = 'http://glotto.web.ctfcompetition.com'
require 'httpclient'
require 'nokogiri'
client = HTTPClient.new

def fac(x)
    return 1 if x <= 1
    return fac(x - 1) * x
end
# 36進数を取得する
number = "CAST(CONV(@lotto, 36, 10) AS UNSIGNED)"
query = {}
tables = [march, april, may, june]
ns = []
4.times do |i|
    f = fac(tables[i].size)
    #p f
    ns << "(#{number}) MOD #{f}"
    number =  "(#{number}) DIV #{f}"
    query['order' + i.to_s] = get_query(tables[i], ns[i])
end

resp = client.get(BASE_URL, query)
# puts resp.body
doc = Nokogiri::HTML.parse(resp.body, nil, 'utf-8')
tables=  []
doc.css('table').each do |tbl|
    dates = []
    tbl.css('tr > td:first-child').each do |d|
        dates << d.inner_text
    end
    tables << dates
end
# p tables
m = 1
ret = 0
4.times do |i|
    ret += m * inv_dates(tables[i])
    m *= fac(tables[i].size)
    # p [inv_dates(tables[i]), m]
end
remain = (4738381338321616896 / m)
key = (ret + m * rand(remain)).to_s(36)
key = '0' + key while key.size < 12

resp = client.post(BASE_URL, body: {code: key.upcase})
if /was (.{12})/ =~ resp.body
    p ['failed', 'check', $1.to_i(36) % m == ret, resp.body]
else
    puts "FOUND!!!"
    puts resp.body
end
```

