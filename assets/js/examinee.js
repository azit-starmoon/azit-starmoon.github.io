// AZIT : Star&Moon — 검사자 구분 (이름 + 생년월일)
// 같은 상담사 계정 안에서 이름과 생년월일이 모두 같으면 같은 검사자로 본다. 이름은 띄어쓰기·대소문자를 무시한다.
// 생년월일은 이름이 같은 분을 구분하는 데만 쓴다. 결과지 본문, 공유 링크, 문항 분석 CSV에는 넣지 않는다.
// 생년월일을 받기 전에 저장된 결과(birth 없음)는 '생년월일 없음'으로 따로 묶인다.

export const normName = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();

const two = (n) => String(n).padStart(2, '0');

// '19950312', '950312', '1995.03.12', '1995-3-12' → '1995-03-12'. 날짜가 아니면 ''
export function parseBirth(text) {
  const raw = String(text || '').trim();
  let y;
  let m;
  let d;
  const parts = raw.split(/[^0-9]+/).filter(Boolean);
  const now = new Date();
  if (parts.length === 3 && parts[0].length === 4) {
    [y, m, d] = parts.map(Number);
  } else {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      y = Number(digits.slice(0, 4));
      m = Number(digits.slice(4, 6));
      d = Number(digits.slice(6, 8));
    } else if (digits.length === 6) {
      // 두 자리 연도: 올해 뒤 두 자리보다 크면 1900년대로 본다 (예: 95 → 1995, 05 → 2005)
      const yy = Number(digits.slice(0, 2));
      y = yy > now.getFullYear() % 100 ? 1900 + yy : 2000 + yy;
      m = Number(digits.slice(2, 4));
      d = Number(digits.slice(4, 6));
    } else {
      return '';
    }
  }
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  if (y < 1900 || dt > now) return '';
  return `${y}-${two(m)}-${two(d)}`;
}

// '1995-03-12' → '1995.03.12' (없으면 '')
export const fmtBirth = (iso) => (iso ? String(iso).replace(/-/g, '.') : '');
// '1995-03-12' → '1995년 3월 12일'
export function longBirth(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : '';
}

export const personKey = (rec) => `${normName(rec && rec.name)}|${(rec && rec.birth) || ''}`;
export const samePerson = (a, b) => personKey(a) === personKey(b);
// 검색: 글자는 이름에서, 숫자는 생년월일에서 찾는다 (예: '김하늘', '9503', '김하늘 1995')
export function matchPerson(rec, q) {
  const text = String(q || '').trim();
  if (!text) return true;
  const letters = text.replace(/[0-9.\-/\s]/g, '');
  const digits = text.replace(/\D/g, '');
  const nameOk = !letters || normName(rec.name).includes(normName(letters));
  const birthOk = !digits || String(rec.birth || '').replace(/-/g, '').includes(digits);
  return nameOk && birthOk;
}
