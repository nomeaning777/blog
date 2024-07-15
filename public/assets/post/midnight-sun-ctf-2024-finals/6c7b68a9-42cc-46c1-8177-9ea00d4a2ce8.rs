use rayon::prelude::*;
use std::{fs::File, io::Read, sync::Arc};

fn load_data() -> (Vec<Vec<u32>>, Vec<Vec<u32>>, Vec<u32>) {
    let mut bin = Vec::new();
    File::open("data.bin")
        .unwrap()
        .read_to_end(&mut bin)
        .unwrap();
    // 4byte単位のLittle Endianで読み込み
    // let l = Vec<Vec<u32>>::new();
    let mut pos = 0;
    let mut m_l = Vec::new();
    for _ in 0..31 {
        let mut m = Vec::new();
        for _ in 0..1600 {
            m.push(u32::from_le_bytes(bin[pos..pos + 4].try_into().unwrap()));
            pos += 4;
        }
        m_l.push(m);
    }
    let mut m_a = Vec::new();
    for _ in 0..31 {
        let mut m = Vec::new();
        for i in 0..1600 {
            let dist = if i % 40 == i / 40 { 1 } else { 0 };
            m.push(u32::from_le_bytes(bin[pos..pos + 4].try_into().unwrap()) - dist);
            pos += 4;
        }
        m_a.push(m);
    }

    let mut m = Vec::new();
    for _ in 0..1600 {
        m.push(u32::from_le_bytes(bin[pos..pos + 4].try_into().unwrap()));
        pos += 4;
    }
    (m_l, m_a, m)
}

fn vec_matrix_mul(vec: &[u32], mat: &[u32], dst: &mut [u32]) {
    for j in 0..40 {
        let mut sum = 0;
        for k in 0..40 {
            sum += vec[k] * mat[k * 40 + j];
        }
        dst[j] = sum;
    }
}

fn scalar_matrix_mul(scalar: u32, mat: &[u32], dst: &mut [u32]) {
    for i in 0..40 {
        for j in 0..40 {
            dst[i * 40 + j] = scalar * mat[i * 40 + j];
        }
    }
}

fn vec_add(a: &[u32], dst: &mut [u32]) {
    for i in 0..40 {
        dst[i] += a[i];
    }
}

struct Data {
    l: Vec<Vec<u32>>,
    a: Vec<Vec<u32>>,
    b: Vec<u32>,
}

struct Checker {
    modular: u32,
    d: Arc<Data>,
}

impl Checker {
    fn check(&self, s: &[u8]) -> bool {
        let mut l = [0; 40];
        let mut c = [0; 40];
        let mut tmp = [0; 40 * 40];
        for i in 0..40 {
            l[i] = self.d.l[30][i];
            c[i] = l[i];
        }
        scalar_matrix_mul(s[30] as u32, &self.d.a[30], &mut tmp);
        vec_matrix_mul(&l, &tmp, &mut c[..]);
        vec_add(&c, &mut l);
        for i in (0..30).rev() {
            vec_matrix_mul(&l, &self.d.l[i], &mut c);
            l.copy_from_slice(&c);
            scalar_matrix_mul(s[i] as u32, &self.d.a[i], &mut tmp);
            vec_matrix_mul(&l, &tmp, &mut c[..]);
            vec_add(&c, &mut l);
        }
        vec_matrix_mul(&l, &self.d.b, &mut c);
        for i in 0..40 {
            if c[i] % self.modular != 0 {
                return false;
            }
        }

        true
    }
}

fn main() {
    // Check
    let (l, a, b) = load_data();

    let data = Data { l, a, b };
    let mut checker = Checker {
        d: Arc::new(data),
        modular: 2,
    };

    let mut orig = [0; 31];
    for j in 0..7 {
        checker.modular = 1 << (j + 1);

        let ret: Vec<usize> = (0..(1 << 18))
            .into_par_iter()
            .filter(|bin| {
                let mut s = [0; 31];
                s[0..9].copy_from_slice(b"midnight{");
                for i in 0..22 {
                    s[i + 9] = ((((bin >> i) & 1) << j) as u8) | orig[i + 9];
                }
                if checker.check(&s) {
                    println!("{:?}", s);
                    true
                } else {
                    false
                }
            })
            .collect();
        assert!(ret.len() == 1);
        let bin = ret[0];
        for i in 0..22 {
            orig[i + 9] = ((((bin >> i) & 1) << j) as u8) | orig[i + 9];
        }
    }
}
